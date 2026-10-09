import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generarAsignacion } from '@/lib/asignaciones/actions';
import { guardarVariante } from '@/lib/casos/actions';
import { AppStoreProvider } from '@/store/app-store-provider';
import { type EscenarioCatalogo, type EstudianteRegistrado } from '@/types';

import { ConfiguradorSesion } from './configurador-sesion';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/asignaciones/actions', () => ({ generarAsignacion: vi.fn() }));
vi.mock('@/lib/estudiantes/actions', () => ({
  registrarEstudiante: vi.fn(),
  actualizarEstudiante: vi.fn(),
}));
vi.mock('@/lib/casos/actions', () => ({
  guardarVariante: vi.fn(),
  archivarCaso: vi.fn(),
  crearCaso: vi.fn(),
  actualizarCaso: vi.fn(),
  probarPaciente: vi.fn(),
}));

const mockGenerar = vi.mocked(generarAsignacion);
const mockGuardar = vi.mocked(guardarVariante);

function escenario(
  codigo: string,
  titulo: string,
  id: string,
  extra: Partial<EscenarioCatalogo> = {}
): EscenarioCatalogo {
  return {
    id,
    codigo,
    titulo,
    descripcion: `Descripción de ${titulo}.`,
    categoria: 'clinico',
    dificultad: 'basico',
    competenciaCentral: 'Escucha activa',
    configuracion3d: `scenes/${codigo.toLowerCase()}.json`,
    propio: false,
    borrador: null,
    creadoEn: '2026-09-30T10:00:00.000Z',
    npc: {
      id: `${id.slice(0, -1)}9`,
      nombre: `Paciente ${codigo}`,
      edad: 40,
      perfilClinico: `Perfil clínico de ${codigo}.`,
      promptSistema: `Prompt original del paciente del escenario ${codigo}.`,
    },
    ...extra,
  };
}

const E01 = escenario('E-01', 'Duelo y pérdida', '11111111-1111-4111-8111-111111111111');
const E02 = escenario('E-02', 'Ansiedad generalizada', '22222222-2222-4222-8222-222222222222');
const PROPIO = escenario(
  'C-90000001',
  'Mi caso de ansiedad',
  '33333333-3333-4333-8333-333333333333',
  {
    propio: true,
    npc: {
      id: '33333333-3333-4333-8333-333333333339',
      nombre: 'Paciente propio',
      edad: 30,
      perfilClinico: 'Perfil del caso propio.',
      promptSistema: 'Prompt del caso propio redactado por el docente.',
    },
  }
);

function estudiante(
  datos: Partial<EstudianteRegistrado> & Pick<EstudianteRegistrado, 'id' | 'codigo' | 'nombre'>
): EstudianteRegistrado {
  return {
    correo: `${datos.codigo}@correounivalle.edu.co`,
    cuentaVinculada: true,
    creadoEn: '2026-10-01T15:00:00.000Z',
    metricas: {
      sesiones: 3,
      finalizadas: 2,
      enCurso: 0,
      pendientesRetroalimentacion: 0,
      notaPromedio: 4.2,
      codigosPendientes: 0,
      segundosPractica: 80 * 60,
      casos: 2,
      intervenciones: 24,
      ultimaSesion: '2026-10-05T15:00:00.000Z',
    },
    ...datos,
  };
}

const ANA = estudiante({
  id: '55555555-5555-4555-8555-555555555555',
  codigo: '202012345',
  nombre: 'Ana María Pérez',
});
/** Registro antiguo (sin correo): aún no puede recibir códigos. */
const SIN_CUENTA = estudiante({
  id: '66666666-6666-4666-8666-666666666666',
  codigo: '201911111',
  nombre: 'Pedro Sin Cuenta',
  correo: null,
  cuentaVinculada: false,
});

function renderizar(
  escenarios: EscenarioCatalogo[] = [E01, E02],
  casoInicialId?: string,
  estudiantes: EstudianteRegistrado[] = [],
  estudianteInicial: EstudianteRegistrado | null = null
) {
  return render(
    <AppStoreProvider>
      <ConfiguradorSesion
        escenarios={escenarios}
        casoInicialId={casoInicialId}
        estudiantes={estudiantes}
        estudianteInicial={estudianteInicial}
      />
    </AppStoreProvider>
  );
}

describe('ConfiguradorSesion', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    mockGenerar.mockReset();
    mockGuardar.mockReset();
  });

  it('muestra los escenarios y expande el perfil del NPC al seleccionar uno (HU-06 · T02)', async () => {
    const usuario = userEvent.setup();
    renderizar();

    const casos = within(screen.getByRole('radiogroup', { name: /Elige el caso/ }));
    expect(casos.getAllByRole('radio')).toHaveLength(2);
    expect(screen.queryByLabelText('Comportamiento del paciente')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('radio', { name: /Duelo y pérdida/ }));

    expect(screen.getByRole('heading', { name: 'Paciente E-01' })).toBeVisible();
    expect(screen.getByLabelText('Comportamiento del paciente')).toHaveValue(E01.npc.promptSistema);

    // Solo un escenario seleccionado a la vez.
    await usuario.click(screen.getByRole('radio', { name: /Ansiedad generalizada/ }));
    expect(screen.getByRole('radio', { name: /Duelo y pérdida/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Ansiedad generalizada/ })).toBeChecked();
    expect(screen.getByLabelText('Comportamiento del paciente')).toHaveValue(E02.npc.promptSistema);
  });

  it('muestra errores inline si se intenta generar el código sin completar el formulario (HU-06 · T03)', async () => {
    const usuario = userEvent.setup();
    renderizar([E01, E02], undefined, [ANA]);

    await usuario.click(screen.getByRole('button', { name: /Generar código de acceso/ }));

    expect(await screen.findByText('Selecciona un escenario para continuar.')).toBeVisible();
    expect(screen.getByText('Elige al estudiante que va a practicar.')).toBeVisible();
    expect(mockGenerar).not.toHaveBeenCalled();
  });

  it('asigna el caso al estudiante y muestra el código para enviárselo', async () => {
    mockGenerar.mockResolvedValue({
      ok: true,
      datos: {
        id: '77777777-7777-4777-8777-777777777777',
        codigo: 'abc-defg-hij',
        expiraEn: '2026-10-14T20:00:00.000Z',
      },
    });
    const usuario = userEvent.setup();
    renderizar([E01, E02], undefined, [ANA]);

    await usuario.click(screen.getByRole('radio', { name: /Duelo y pérdida/ }));
    await usuario.type(screen.getByRole('combobox'), 'perez');
    await usuario.click(screen.getByRole('option', { name: /Ana María Pérez/ }));
    expect(screen.getByTestId('estudiante-elegido')).toHaveTextContent('Ana María Pérez');

    await usuario.click(screen.getByRole('radio', { name: '3 días' }));
    await usuario.click(screen.getByRole('button', { name: /Generar código de acceso/ }));

    expect(mockGenerar).toHaveBeenCalledWith({
      escenarioId: E01.id,
      promptSistema: E01.npc.promptSistema,
      estudianteId: ANA.id,
      vigenciaDias: 3,
    });
    const dialogo = await screen.findByRole('dialog', { name: 'Código de acceso listo' });
    expect(within(dialogo).getByTestId('codigo-acceso')).toHaveTextContent('abc-defg-hij');
    expect(within(dialogo).getByText(/\/unirse\/abc-defg-hij$/)).toBeVisible();
    expect(within(dialogo).getByRole('link', { name: /Ver al estudiante/ })).toHaveAttribute(
      'href',
      `/estudiantes/${ANA.id}`
    );
    // La simulación ya no se abre en el equipo del docente.
    expect(push).not.toHaveBeenCalled();
  });

  it('la vigencia por defecto es de 7 días', async () => {
    mockGenerar.mockResolvedValue({ ok: false, error: 'x' });
    const usuario = userEvent.setup();
    renderizar([E01], E01.id, [ANA], ANA);

    expect(screen.getByRole('radio', { name: '7 días' })).toBeChecked();
    await usuario.click(screen.getByRole('button', { name: /Generar código de acceso/ }));
    expect(mockGenerar).toHaveBeenCalledWith(expect.objectContaining({ vigenciaDias: 7 }));
  });

  it('muestra el error del servidor si no se pudo generar el código', async () => {
    mockGenerar.mockResolvedValue({ ok: false, error: 'No fue posible generar el código.' });
    const usuario = userEvent.setup();
    renderizar([E01], E01.id, [ANA], ANA);

    await usuario.click(screen.getByRole('button', { name: /Generar código de acceso/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible generar el código.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('permite deseleccionar el caso pulsándolo de nuevo y oculta el paso del paciente', async () => {
    const usuario = userEvent.setup();
    renderizar();

    const duelo = screen.getByRole('radio', { name: /Duelo y pérdida/ });
    await usuario.click(duelo);
    expect(duelo).toBeChecked();
    expect(screen.getByLabelText('Comportamiento del paciente')).toBeVisible();

    await usuario.click(duelo);
    expect(duelo).not.toBeChecked();
    expect(screen.queryByLabelText('Comportamiento del paciente')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar como mi caso/ })).toBeDisabled();

    // Se puede volver a elegir el mismo u otro caso.
    await usuario.click(duelo);
    expect(duelo).toBeChecked();
  });

  it('invita a crear un caso cuando "Mis casos" está vacío', () => {
    renderizar();

    expect(screen.getByText(/Aún no tienes casos propios/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Crear mi primer caso/ })).toBeVisible();
    expect(screen.getByRole('link', { name: /Crear mi primer caso/ })).toHaveAttribute(
      'href',
      '/configuracion/casos/nuevo'
    );
  });

  it('lista los casos propios aparte, con acciones para editarlos y eliminarlos', async () => {
    const usuario = userEvent.setup();
    renderizar([E01, PROPIO]);

    expect(screen.queryByText(/Aún no tienes casos propios/)).not.toBeInTheDocument();
    // Con casos, la creación es una tarjeta punteada junto a ellos.
    expect(screen.getByRole('link', { name: /Crear caso nuevo/ })).toHaveAttribute(
      'href',
      '/configuracion/casos/nuevo'
    );
    expect(screen.getByRole('radio', { name: /Mi caso de ansiedad/ })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Editar el caso Mi caso de ansiedad' })
    ).toHaveAttribute('href', `/configuracion/casos/${PROPIO.id}`);

    await usuario.click(
      screen.getByRole('button', { name: 'Eliminar el caso Mi caso de ansiedad' })
    );
    expect(screen.getByRole('alert')).toHaveTextContent('¿Eliminar?');
    expect(screen.getByRole('button', { name: 'Sí, eliminar' })).toHaveFocus();
    // Las acciones van fuera del <label>: pulsarlas no selecciona el caso.
    expect(screen.getByRole('radio', { name: /Mi caso de ansiedad/ })).not.toBeChecked();

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(
      screen.getByRole('button', { name: 'Eliminar el caso Mi caso de ansiedad' })
    ).toBeVisible();
  });

  it('llega con un caso propio preseleccionado y su prompt cargado', () => {
    renderizar([E01, PROPIO], PROPIO.id);

    expect(screen.getByRole('radio', { name: /Mi caso de ansiedad/ })).toBeChecked();
    expect(screen.getByLabelText('Comportamiento del paciente')).toHaveValue(
      PROPIO.npc.promptSistema
    );
  });

  it('habilita "Guardar como mi caso" solo con un caso seleccionado', async () => {
    const usuario = userEvent.setup();
    renderizar();

    const boton = screen.getByRole('button', { name: /Guardar como mi caso/ });
    expect(boton).toBeDisabled();

    await usuario.click(screen.getByRole('radio', { name: /Duelo y pérdida/ }));
    expect(boton).toBeEnabled();
  });

  it('guarda el prompt editado como caso propio y recarga la lista', async () => {
    const usuario = userEvent.setup();
    mockGuardar.mockResolvedValue({
      ok: true,
      datos: { id: '55555555-5555-4555-8555-555555555555' },
    });
    renderizar();

    await usuario.click(screen.getByRole('radio', { name: /Duelo y pérdida/ }));
    const prompt = screen.getByLabelText('Comportamiento del paciente');
    await usuario.clear(prompt);
    await usuario.type(prompt, 'Un prompt ajustado por el docente para el grupo A.');
    expect(screen.getByText('Personalizado')).toBeVisible();

    await usuario.click(screen.getByRole('button', { name: /Guardar como mi caso/ }));
    const nombre = screen.getByLabelText('Nombre del caso');
    await usuario.clear(nombre);
    await usuario.type(nombre, 'Duelo — grupo A{Enter}');

    expect(mockGuardar).toHaveBeenCalledWith({
      escenarioId: E01.id,
      titulo: 'Duelo — grupo A',
      prompt: 'Un prompt ajustado por el docente para el grupo A.',
    });
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  describe('estudiantes', () => {
    it('sin estudiantes con cuenta invita a registrarlos', () => {
      renderizar([E01, E02], undefined, [SIN_CUENTA]);

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByText(/Aún no tienes estudiantes con cuenta/)).toBeVisible();
      expect(screen.getByRole('button', { name: /Registrar estudiante/ })).toBeVisible();
    });

    it('el buscador solo ofrece a los estudiantes con cuenta', async () => {
      const usuario = userEvent.setup();
      renderizar([E01, E02], undefined, [ANA, SIN_CUENTA]);

      await usuario.click(screen.getByRole('combobox'));
      expect(screen.getByRole('option', { name: /Ana María Pérez/ })).toBeVisible();
      expect(screen.queryByRole('option', { name: /Pedro Sin Cuenta/ })).not.toBeInTheDocument();
    });

    it('se elige con el teclado: flechas y Enter (sin enviar el formulario)', async () => {
      const usuario = userEvent.setup();
      renderizar([E01, E02], undefined, [ANA]);

      await usuario.click(screen.getByRole('combobox'));
      await usuario.keyboard('2020{ArrowDown}{Enter}');

      expect(screen.getByTestId('estudiante-elegido')).toHaveTextContent('Ana María Pérez');
      expect(mockGenerar).not.toHaveBeenCalled();
    });

    it('"Cambiar" quita al estudiante elegido', async () => {
      const usuario = userEvent.setup();
      renderizar([E01, E02], undefined, [ANA], ANA);

      expect(screen.getByTestId('estudiante-elegido')).toHaveTextContent('Ana María Pérez');
      await usuario.click(screen.getByRole('button', { name: /Cambiar/ }));
      expect(screen.queryByTestId('estudiante-elegido')).not.toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeVisible();
    });

    it('un estudiante preseleccionado sin cuenta no queda elegido', () => {
      renderizar([E01, E02], undefined, [ANA, SIN_CUENTA], SIN_CUENTA);
      expect(screen.queryByTestId('estudiante-elegido')).not.toBeInTheDocument();
    });
  });
});
