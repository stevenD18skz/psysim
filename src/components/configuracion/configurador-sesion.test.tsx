import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { guardarConfiguracion, iniciarSimulacion } from '@/lib/escenarios/actions';
import { AppStoreProvider, useAppStore } from '@/store/app-store-provider';
import { type ConfiguracionGuardada, type EscenarioCatalogo } from '@/types';

import { ConfiguradorSesion } from './configurador-sesion';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/escenarios/actions', () => ({
  iniciarSimulacion: vi.fn(),
  guardarConfiguracion: vi.fn(),
  eliminarConfiguracion: vi.fn(),
}));

const mockIniciar = vi.mocked(iniciarSimulacion);
const mockGuardar = vi.mocked(guardarConfiguracion);

function escenario(codigo: string, titulo: string, id: string): EscenarioCatalogo {
  return {
    id,
    codigo,
    titulo,
    descripcion: `Descripción de ${titulo}.`,
    categoria: 'clinico',
    dificultad: 'basico',
    competenciaCentral: 'Escucha activa',
    configuracion3d: `scenes/${codigo.toLowerCase()}.json`,
    npc: {
      id: `${id.slice(0, -1)}9`,
      nombre: `Paciente ${codigo}`,
      edad: 40,
      perfilClinico: `Perfil clínico de ${codigo}.`,
      promptSistema: `Prompt original del paciente del escenario ${codigo}.`,
    },
  };
}

const E01 = escenario('E-01', 'Duelo y pérdida', '11111111-1111-4111-8111-111111111111');
const E02 = escenario('E-02', 'Ansiedad generalizada', '22222222-2222-4222-8222-222222222222');

const guardada: ConfiguracionGuardada = {
  id: '33333333-3333-4333-8333-333333333333',
  nombre: 'Ansiedad — grupo B',
  escenarioId: E02.id,
  promptPersonalizado: 'Prompt personalizado y guardado para el grupo B.',
  creadoEn: '2026-09-29T20:00:00.000Z',
};

/** Expone el slice `sesion` del store para las aserciones. */
const espia: { sesion: unknown } = { sesion: null };
function EspiaStore() {
  const activa = useAppStore(state => state.sesion.activa);
  useEffect(() => {
    espia.sesion = activa;
  }, [activa]);
  return null;
}

function renderizar(configuraciones: ConfiguracionGuardada[] = []) {
  return render(
    <AppStoreProvider>
      <ConfiguradorSesion escenarios={[E01, E02]} configuracionesIniciales={configuraciones} />
      <EspiaStore />
    </AppStoreProvider>
  );
}

describe('ConfiguradorSesion', () => {
  beforeEach(() => {
    push.mockReset();
    mockIniciar.mockReset();
    mockGuardar.mockReset();
    espia.sesion = null;
  });

  it('muestra los escenarios y expande el perfil del NPC al seleccionar uno (HU-06 · T02)', async () => {
    const usuario = userEvent.setup();
    renderizar();

    expect(screen.getAllByRole('radio')).toHaveLength(2);
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

  it('muestra errores inline si se intenta iniciar sin completar el formulario (HU-06 · T03)', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: /Iniciar simulación/ }));

    expect(await screen.findByText('Selecciona un escenario para continuar.')).toBeVisible();
    expect(screen.getByText('Ingresa el código institucional del estudiante.')).toBeVisible();
    expect(screen.getByText('Ingresa el nombre completo del estudiante.')).toBeVisible();
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  it('crea la sesión, la guarda en el store y redirige a /simulacion (HU-06 · T04)', async () => {
    mockIniciar.mockResolvedValue({
      ok: true,
      datos: { sesionId: '44444444-4444-4444-8444-444444444444' },
    });
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('radio', { name: /Duelo y pérdida/ }));
    await usuario.type(screen.getByLabelText('Código institucional'), '202012345');
    await usuario.type(screen.getByLabelText('Nombre completo'), '  Ana  María ');
    await usuario.click(screen.getByRole('button', { name: /Iniciar simulación/ }));

    expect(mockIniciar).toHaveBeenCalledWith({
      escenarioId: E01.id,
      promptSistema: E01.npc.promptSistema,
      codigoEstudiante: '202012345',
      nombreEstudiante: 'Ana María',
    });
    expect(push).toHaveBeenCalledWith('/simulacion?sesion=44444444-4444-4444-8444-444444444444');
    expect(espia.sesion).toMatchObject({
      id: '44444444-4444-4444-8444-444444444444',
      escenario: { id: E01.id, configuracion3d: 'scenes/e-01.json' },
      estudiante: { codigo: '202012345', nombre: 'Ana María' },
    });
  });

  it('muestra el error del servidor sin redirigir si la inserción falla', async () => {
    mockIniciar.mockResolvedValue({ ok: false, error: 'No fue posible iniciar la simulación.' });
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('radio', { name: /Duelo y pérdida/ }));
    await usuario.type(screen.getByLabelText('Código institucional'), '202012345');
    await usuario.type(screen.getByLabelText('Nombre completo'), 'Ana María');
    await usuario.click(screen.getByRole('button', { name: /Iniciar simulación/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible iniciar la simulación.'
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('habilita "Guardar configuración" solo con un escenario seleccionado (HU-07 · T02)', async () => {
    const usuario = userEvent.setup();
    renderizar();

    const boton = screen.getByRole('button', { name: /Guardar configuración/ });
    expect(boton).toBeDisabled();

    await usuario.click(screen.getByRole('radio', { name: /Duelo y pérdida/ }));
    expect(boton).toBeEnabled();
  });

  it('guarda la configuración con el prompt editado y la agrega a la lista', async () => {
    const usuario = userEvent.setup();
    mockGuardar.mockImplementation(async valores => {
      const { nombre, promptPersonalizado, escenarioId } = valores as Record<string, string>;
      return {
        ok: true,
        datos: {
          id: '55555555-5555-4555-8555-555555555555',
          nombre: nombre!,
          escenarioId: escenarioId!,
          promptPersonalizado: promptPersonalizado!,
          creadoEn: '2026-09-30T10:00:00.000Z',
        },
      };
    });
    renderizar();

    await usuario.click(screen.getByRole('radio', { name: /Duelo y pérdida/ }));
    const prompt = screen.getByLabelText('Comportamiento del paciente');
    await usuario.clear(prompt);
    await usuario.type(prompt, 'Un prompt ajustado por el docente para el grupo A.');
    expect(screen.getByText('Personalizado')).toBeVisible();

    await usuario.click(screen.getByRole('button', { name: /Guardar configuración/ }));
    await usuario.type(
      screen.getByLabelText('Nombre de la configuración'),
      'Duelo — grupo A{Enter}'
    );

    expect(mockGuardar).toHaveBeenCalledWith({
      escenarioId: E01.id,
      nombre: 'Duelo — grupo A',
      promptPersonalizado: 'Un prompt ajustado por el docente para el grupo A.',
    });
    const lista = await screen.findByRole('list', { name: 'Configuraciones guardadas' });
    expect(within(lista).getByText('Duelo — grupo A')).toBeVisible();
  });

  it('muestra un mensaje cuando no hay configuraciones guardadas (HU-07 · T03)', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: /Mis configuraciones guardadas/ }));
    expect(screen.getByText(/usa «Guardar configuración» para reutilizarlo/)).toBeVisible();
  });

  it('carga una configuración guardada sin borrar los datos del estudiante (HU-07 · T04)', async () => {
    const usuario = userEvent.setup();
    renderizar([guardada]);

    await usuario.type(screen.getByLabelText('Código institucional'), '202099999');
    await usuario.type(screen.getByLabelText('Nombre completo'), 'Luis Gómez');

    await usuario.click(screen.getByRole('button', { name: /Mis configuraciones guardadas/ }));
    await usuario.click(
      screen.getByRole('button', { name: 'Cargar la configuración Ansiedad — grupo B' })
    );

    expect(screen.getByRole('radio', { name: /Ansiedad generalizada/ })).toBeChecked();
    expect(screen.getByLabelText('Comportamiento del paciente')).toHaveValue(
      guardada.promptPersonalizado
    );
    expect(screen.getByLabelText('Código institucional')).toHaveValue('202099999');
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Luis Gómez');
  });
});
