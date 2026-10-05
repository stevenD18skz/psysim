import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualizarCaso, crearCaso, probarPaciente } from '@/lib/casos/actions';

import { ConstructorCaso } from './constructor-caso';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/casos/actions', () => ({
  crearCaso: vi.fn(),
  actualizarCaso: vi.fn(),
  probarPaciente: vi.fn(),
  archivarCaso: vi.fn(),
  guardarVariante: vi.fn(),
}));

const mockCrear = vi.mocked(crearCaso);
const mockActualizar = vi.mocked(actualizarCaso);
const mockProbar = vi.mocked(probarPaciente);

async function completarCaso(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText('Título del caso'), 'Pérdida laboral');
  await usuario.type(screen.getByLabelText('Competencia que se entrena'), 'Escucha activa');
  await usuario.type(screen.getByLabelText('Nombre', { exact: true }), 'Camila Rojas');
  await usuario.type(screen.getByLabelText('Edad'), '29');
  await usuario.type(
    screen.getByLabelText('Situación y motivo de consulta'),
    'Perdió su empleo hace un mes y se siente sin rumbo.'
  );
  await usuario.type(screen.getByLabelText('Frase de apertura'), 'Hola, no sé por dónde empezar.');
}

describe('ConstructorCaso', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    mockCrear.mockReset();
    mockActualizar.mockReset();
    mockProbar.mockReset();
  });

  it('arma la vista previa del prompt mientras se completan los campos', async () => {
    const usuario = userEvent.setup();
    render(<ConstructorCaso />);

    await usuario.type(screen.getByLabelText('Nombre', { exact: true }), 'Camila Rojas');
    await usuario.type(screen.getByLabelText('Edad'), '29');
    await usuario.click(screen.getByRole('button', { name: 'tristeza persistente' }));
    await usuario.click(screen.getByRole('button', { name: 'reservado' }));

    const vista = screen.getByLabelText('Prompt generado');
    expect(vista).toHaveTextContent('Eres Camila Rojas, una persona de 29 años.');
    expect(vista).toHaveTextContent('experimentas tristeza persistente');
    expect(vista).toHaveTextContent('te muestras reservado');
    expect(vista).not.toHaveTextContent('Reglas de interpretación');
    expect(screen.getByRole('button', { name: 'tristeza persistente' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('las sugerencias añaden una frase al campo y luego desaparecen', async () => {
    const usuario = userEvent.setup();
    render(<ConstructorCaso />);

    await usuario.click(screen.getByRole('button', { name: '+ me interrumpen' }));

    expect(screen.getByLabelText('Se cierra cuando…')).toHaveValue('me interrumpen');
    expect(screen.queryByRole('button', { name: '+ me interrumpen' })).not.toBeInTheDocument();
  });

  it('muestra errores inline si se intenta guardar un caso vacío', async () => {
    const usuario = userEvent.setup();
    render(<ConstructorCaso />);

    await usuario.click(screen.getByRole('button', { name: 'Guardar caso' }));

    expect(await screen.findByText('El título es obligatorio.')).toBeVisible();
    expect(screen.getByText('El nombre es obligatorio.')).toBeVisible();
    expect(screen.getByText('Indica la edad del paciente.')).toBeVisible();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('guarda el caso y vuelve al configurador con el caso preseleccionado', async () => {
    mockCrear.mockResolvedValue({
      ok: true,
      datos: { id: '66666666-6666-4666-8666-666666666666' },
    });
    const usuario = userEvent.setup();
    render(<ConstructorCaso />);

    await completarCaso(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Guardar caso' }));

    expect(mockCrear).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Pérdida laboral',
        nombre: 'Camila Rojas',
        edad: 29,
        modoTexto: false,
        riesgo: 'ninguno',
      })
    );
    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith('/configuracion?caso=66666666-6666-4666-8666-666666666666')
    );
  });

  it('muestra el error del servidor sin salir de la página', async () => {
    mockCrear.mockResolvedValue({ ok: false, error: 'No fue posible guardar el caso.' });
    const usuario = userEvent.setup();
    render(<ConstructorCaso />);

    await completarCaso(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Guardar caso' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible guardar el caso.');
    expect(push).not.toHaveBeenCalled();
  });

  it('pasa a modo texto con el prompt generado y pide confirmar antes de descartar cambios', async () => {
    const usuario = userEvent.setup();
    render(<ConstructorCaso />);

    await usuario.type(screen.getByLabelText('Nombre', { exact: true }), 'Camila Rojas');
    await usuario.click(screen.getByRole('button', { name: 'Editar como texto' }));

    const texto = screen.getByLabelText('Prompt del paciente');
    expect((texto as HTMLTextAreaElement).value).toContain('Eres Camila Rojas');
    // En modo texto ya no se muestran los campos del constructor guiado.
    expect(screen.queryByLabelText('Frase de apertura')).not.toBeInTheDocument();

    // Sin cambios al texto, volver no pierde nada.
    await usuario.click(screen.getByRole('button', { name: 'Volver al constructor' }));
    expect(screen.getByLabelText('Frase de apertura')).toBeVisible();

    // Con cambios, pide confirmación.
    await usuario.click(screen.getByRole('button', { name: 'Editar como texto' }));
    await usuario.type(screen.getByLabelText('Prompt del paciente'), ' Añadido a mano.');
    await usuario.click(screen.getByRole('button', { name: 'Volver al constructor' }));
    expect(screen.getByText(/se descartarán/)).toBeVisible();
    await usuario.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByLabelText('Prompt del paciente')).toBeVisible();
  });

  it('edita un caso existente con actualizarCaso', async () => {
    mockActualizar.mockResolvedValue({
      ok: true,
      datos: { id: '77777777-7777-4777-8777-777777777777' },
    });
    const usuario = userEvent.setup();
    render(
      <ConstructorCaso
        casoId="77777777-7777-4777-8777-777777777777"
        valoresIniciales={{
          titulo: 'Caso previo',
          categoria: 'cotidiano',
          dificultad: 'intermedio',
          competenciaCentral: 'Escucha activa',
          consultorio: 'scenes/e-02.json',
          nombre: 'Luis Gómez',
          edad: 40,
          ocupacion: '',
          situacion: 'Situación previa con suficiente texto para validar.',
          sintomas: ['tension'],
          sintomasExtra: '',
          actitudes: [],
          seAbreSi: '',
          seCierraSi: '',
          riesgo: 'ninguno',
          fraseApertura: 'Buenas tardes, doctor.',
          notas: '',
          modoTexto: false,
          promptManual: '',
        }}
      />
    );

    expect(screen.getByLabelText('Nombre', { exact: true })).toHaveValue('Luis Gómez');
    expect(screen.getByRole('button', { name: 'tensión muscular' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(mockActualizar).toHaveBeenCalledWith({
      id: '77777777-7777-4777-8777-777777777777',
      caso: expect.objectContaining({ titulo: 'Caso previo', nombre: 'Luis Gómez', edad: 40 }),
    });
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('prueba al paciente con el prompt actual', async () => {
    mockProbar.mockResolvedValue({ ok: true, datos: { respuesta: 'Buenas… no sé qué decir.' } });
    const usuario = userEvent.setup();
    render(<ConstructorCaso />);

    // Sin un prompt válido la prueba está bloqueada.
    expect(screen.getByLabelText('Mensaje de prueba')).toBeDisabled();

    await completarCaso(usuario);
    await usuario.type(screen.getByLabelText('Mensaje de prueba'), 'Hola, ¿cómo estás?{Enter}');

    expect(mockProbar).toHaveBeenCalledWith(
      expect.objectContaining({
        mensaje: 'Hola, ¿cómo estás?',
        nombre: 'Camila Rojas',
        historial: [],
        prompt: expect.stringContaining('Eres Camila Rojas'),
      })
    );
    expect(await screen.findByText('Buenas… no sé qué decir.')).toBeVisible();
  });
});
