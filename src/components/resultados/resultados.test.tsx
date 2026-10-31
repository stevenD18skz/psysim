import { render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cerrarSesion } from '@/lib/auth/actions';
import { cerrarSesionEquipoCompartido } from '@/lib/equipo-compartido/actions';
import { type MetricasSesion } from '@/types';
import { AppStoreProvider, useAppStoreApi } from '@/store/app-store-provider';

import { DETALLE_SESION, SESION_ACTIVA } from '../../../test/fixtures';

import { AccionesResultados, LimpiarSesionActiva } from './acciones-resultados';
import { HistorialResultados } from './historial-resultados';
import { TarjetasMetricas } from './tarjetas-metricas';

const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  usePathname: () => '/resultados',
}));
vi.mock('@/lib/auth/actions', () => ({ cerrarSesion: vi.fn(async () => undefined) }));
vi.mock('@/lib/equipo-compartido/actions', () => ({
  cerrarSesionEquipoCompartido: vi.fn(async () => undefined),
}));

const METRICAS: MetricasSesion = {
  totalMensajes: 4,
  latenciaPromedioMs: 1820,
  latenciaMaximaMs: 3400,
  duracionSegundos: 323,
  proximidadPromedioM: 1.8,
  origen: 'guardadas',
};

describe('TarjetasMetricas (HU-21 · T02)', () => {
  it('muestra las cuatro tarjetas como regiones con su título como nombre', () => {
    render(
      <TarjetasMetricas metricas={{ ...METRICAS, proximidadPromedioM: null }} para="docente" />
    );

    const esperado: Record<string, string> = {
      'Total de intervenciones': '4',
      'Latencia promedio': '1,8 s',
      'Latencia máxima': '3,4 s',
      'Duración de la práctica': '05:23',
    };
    for (const [titulo, valor] of Object.entries(esperado)) {
      const region = screen.getByRole('region', { name: titulo });
      expect(within(region).getByText(valor)).toBeInTheDocument();
    }
    expect(screen.queryByRole('region', { name: 'Cercanía al paciente' })).not.toBeInTheDocument();
  });

  it('añade la cercanía al paciente cuando se midió', () => {
    render(<TarjetasMetricas metricas={METRICAS} para="estudiante" />);
    const region = screen.getByRole('region', { name: 'Cercanía al paciente' });
    expect(within(region).getByText('1,8 m')).toBeInTheDocument();
  });

  it('sin respuestas del paciente las latencias dicen «—», no 0', () => {
    render(
      <TarjetasMetricas
        metricas={{
          ...METRICAS,
          totalMensajes: 0,
          latenciaPromedioMs: null,
          latenciaMaximaMs: null,
        }}
        para="estudiante"
      />
    );
    expect(
      within(screen.getByRole('region', { name: 'Latencia promedio' })).getByText('—')
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Latencia máxima' })).getByText('—')
    ).toBeInTheDocument();
  });

  it('aclara que son datos de la sesión y no una calificación', () => {
    render(<TarjetasMetricas metricas={METRICAS} para="estudiante" />);
    expect(screen.getByText(/no una calificación/)).toBeInTheDocument();
  });

  it('avisa cuando las métricas se reconstruyeron con la conversación', () => {
    const { rerender } = render(<TarjetasMetricas metricas={METRICAS} para="docente" />);
    expect(screen.queryByText(/se calcularon con la conversación/)).not.toBeInTheDocument();

    rerender(
      <TarjetasMetricas metricas={{ ...METRICAS, origen: 'reconstruidas' }} para="docente" />
    );
    expect(screen.getByText(/se calcularon con la conversación/)).toBeInTheDocument();
  });

  it('sin duración (no llegó a comenzar) muestra «—»', () => {
    render(<TarjetasMetricas metricas={{ ...METRICAS, duracionSegundos: null }} para="docente" />);
    expect(
      within(screen.getByRole('region', { name: 'Duración de la práctica' })).getByText('—')
    ).toBeInTheDocument();
  });
});

describe('HistorialResultados (HU-21 · T03)', () => {
  it('lista la conversación en orden, marcando el remitente', () => {
    const { container } = render(<HistorialResultados sesion={DETALLE_SESION} para="estudiante" />);

    const filas = container.querySelectorAll('[data-remitente]');
    expect([...filas].map(fila => fila.getAttribute('data-remitente'))).toEqual([
      'estudiante',
      'npc',
    ]);
    expect(screen.getByText('Hola, Marta. ¿Cómo ha estado?')).toBeInTheDocument();
    expect(screen.getByText('Pues... ahí, sobreviviendo.')).toBeInTheDocument();
    expect(screen.getByText(/^Tú ·/)).toBeInTheDocument();
    expect(screen.getByText(/^Marta Lucía ·/)).toBeInTheDocument();
  });

  it('el docente ve «Estudiante» donde el estudiante se ve como «Tú»', () => {
    render(<HistorialResultados sesion={DETALLE_SESION} para="docente" />);
    expect(screen.getByText(/^Estudiante ·/)).toBeInTheDocument();
    expect(screen.queryByText(/^Tú ·/)).not.toBeInTheDocument();
  });

  it('sin mensajes explica que no hubo conversación', () => {
    render(<HistorialResultados sesion={{ ...DETALLE_SESION, mensajes: [] }} para="estudiante" />);
    expect(
      screen.getByText('No hubo conversación con el paciente en esta práctica.')
    ).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('AccionesResultados (HU-21 · T04)', () => {
  beforeEach(() => {
    document.cookie = 'psysim-equipo-compartido=; max-age=0; path=/';
  });

  it('el docente puede empezar una sesión nueva', () => {
    render(
      <AppStoreProvider>
        <AccionesResultados rol="docente" />
      </AppStoreProvider>
    );
    expect(screen.getByRole('link', { name: 'Asignar otra práctica' })).toHaveAttribute(
      'href',
      '/configuracion'
    );
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

  it('el estudiante vuelve a Mis prácticas o cierra su sesión', () => {
    render(
      <AppStoreProvider>
        <AccionesResultados rol="estudiante" />
      </AppStoreProvider>
    );
    expect(screen.getByRole('link', { name: 'Ir a Mis prácticas' })).toHaveAttribute(
      'href',
      '/practicas'
    );
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Asignar otra práctica' })).not.toBeInTheDocument();
  });

  it('en el computador del docente (modo presencial) cerrar la sesión es la acción principal', async () => {
    document.cookie = 'psysim-equipo-compartido=1; path=/';
    const usuario = userEvent.setup();
    render(
      <AppStoreProvider>
        <AccionesResultados rol="estudiante" />
      </AppStoreProvider>
    );

    const cerrar = screen.getByRole('button', { name: 'Cerrar sesión en este equipo' });
    await usuario.click(cerrar);

    expect(cerrarSesionEquipoCompartido).toHaveBeenCalledTimes(1);
    expect(cerrarSesion).not.toHaveBeenCalled();
  });

  it('cerrar la sesión limpia el estado y lleva a /login', async () => {
    const usuario = userEvent.setup();
    render(
      <AppStoreProvider>
        <AccionesResultados rol="estudiante" />
      </AppStoreProvider>
    );

    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/login');
  });
});

describe('LimpiarSesionActiva', () => {
  function montar(sesionId: string) {
    const envoltorio = ({ children }: { children: React.ReactNode }) => (
      <AppStoreProvider estadoInicial={{ sesion: { activa: SESION_ACTIVA } }}>
        <LimpiarSesionActiva sesionId={sesionId} />
        {children}
      </AppStoreProvider>
    );
    return renderHook(() => useAppStoreApi(), { wrapper: envoltorio }).result;
  }

  it('borra la práctica terminada del store al llegar a los resultados', () => {
    expect(montar(SESION_ACTIVA.id).current.getState().sesion.activa).toBeNull();
  });

  it('no toca otra sesión distinta a la que se muestra', () => {
    const store = montar('00000000-0000-4000-8000-000000000000');
    expect(store.current.getState().sesion.activa?.id).toBe(SESION_ACTIVA.id);
  });
});
