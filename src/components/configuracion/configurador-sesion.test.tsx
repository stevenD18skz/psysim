import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { guardarVariante } from '@/lib/casos/actions';
import { iniciarSimulacion } from '@/lib/escenarios/actions';
import { AppStoreProvider, useAppStore } from '@/store/app-store-provider';
import { type EscenarioCatalogo } from '@/types';

import { ConfiguradorSesion } from './configurador-sesion';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/escenarios/actions', () => ({ iniciarSimulacion: vi.fn() }));
vi.mock('@/lib/casos/actions', () => ({
  guardarVariante: vi.fn(),
  archivarCaso: vi.fn(),
  crearCaso: vi.fn(),
  actualizarCaso: vi.fn(),
  probarPaciente: vi.fn(),
}));

const mockIniciar = vi.mocked(iniciarSimulacion);
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

/** Expone el slice `sesion` del store para las aserciones. */
const espia: { sesion: unknown } = { sesion: null };
function EspiaStore() {
  const activa = useAppStore(state => state.sesion.activa);
  useEffect(() => {
    espia.sesion = activa;
  }, [activa]);
  return null;
}

function renderizar(escenarios: EscenarioCatalogo[] = [E01, E02], casoInicialId?: string) {
  return render(
    <AppStoreProvider>
      <ConfiguradorSesion escenarios={escenarios} casoInicialId={casoInicialId} />
      <EspiaStore />
    </AppStoreProvider>
  );
}

describe('ConfiguradorSesion', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
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
    expect(screen.getByText('¿Eliminar este caso?')).toBeVisible();
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
});
