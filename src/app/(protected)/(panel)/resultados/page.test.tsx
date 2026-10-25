import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requerirUsuario } from '@/lib/auth/dal';
import {
  obtenerDetalleSesion,
  obtenerMetricasGuardadas,
  obtenerReflexion,
} from '@/lib/sesiones/queries';
import { AppStoreProvider } from '@/store/app-store-provider';
import { type PerfilUsuario } from '@/types';

import { DETALLE_SESION } from '../../../../../test/fixtures';

import ResultadosPage from './page';

/** Detiene el render como lo hace `redirect` de Next.js: lanzando. */
class Redireccion extends Error {
  constructor(readonly destino: string) {
    super(`redirect:${destino}`);
  }
}

vi.mock('next/navigation', () => ({
  redirect: (destino: string) => {
    throw new Redireccion(destino);
  },
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/resultados',
}));
vi.mock('@/lib/auth/dal', () => ({ requerirUsuario: vi.fn() }));
vi.mock('@/lib/sesiones/queries', () => ({
  obtenerDetalleSesion: vi.fn(),
  obtenerMetricasGuardadas: vi.fn(),
  obtenerReflexion: vi.fn(),
}));
vi.mock('@/lib/reflexion/actions', () => ({ guardarReflexion: vi.fn() }));
vi.mock('@/lib/auth/actions', () => ({ cerrarSesion: vi.fn() }));
vi.mock('@/lib/equipo-compartido/actions', () => ({ cerrarSesionEquipoCompartido: vi.fn() }));

const SESION_ID = DETALLE_SESION.id;

function perfil(rol: PerfilUsuario['rol']): PerfilUsuario {
  return {
    id: 'u1',
    nombre: 'Persona de Prueba',
    correo: 'prueba@correounivalle.edu.co',
    codigoInstitucional: '100000001',
    rol,
    contrasenaTemporal: false,
  };
}

async function pagina(...args: [sesion?: string | string[]]) {
  const sesion = args.length > 0 ? args[0] : SESION_ID;
  return ResultadosPage({
    searchParams: Promise.resolve({ sesion }),
  } as unknown as Parameters<typeof ResultadosPage>[0]);
}

async function destinoDeRedireccion(...args: [sesion?: string | string[]]): Promise<string> {
  try {
    await pagina(...args);
  } catch (error) {
    if (error instanceof Redireccion) return error.destino;
    throw error;
  }
  throw new Error('No redirigió');
}

function mostrar(elemento: Awaited<ReturnType<typeof pagina>>) {
  return render(<AppStoreProvider>{elemento}</AppStoreProvider>);
}

describe('página /resultados (HU-21)', () => {
  beforeEach(() => {
    vi.mocked(requerirUsuario).mockResolvedValue(perfil('estudiante'));
    vi.mocked(obtenerDetalleSesion).mockResolvedValue(DETALLE_SESION);
    vi.mocked(obtenerMetricasGuardadas).mockResolvedValue(null);
    vi.mocked(obtenerReflexion).mockResolvedValue(null);
  });

  describe('qué hace con una sesión que no puede mostrar', () => {
    it.each([
      ['sin parámetro', undefined],
      ['que no es un UUID', 'no-es-un-uuid'],
      ['repetido', [SESION_ID, SESION_ID]],
    ])('un parámetro %s lleva al inicio del estudiante', async (_, valor) => {
      await expect(destinoDeRedireccion(valor)).resolves.toBe('/practicas');
      expect(obtenerDetalleSesion).not.toHaveBeenCalled();
    });

    it('una sesión ajena o inexistente (RLS la oculta) lleva al inicio del rol', async () => {
      vi.mocked(obtenerDetalleSesion).mockResolvedValue(null);
      await expect(destinoDeRedireccion()).resolves.toBe('/practicas');

      vi.mocked(requerirUsuario).mockResolvedValue(perfil('docente'));
      await expect(destinoDeRedireccion()).resolves.toBe('/inicio');
    });

    it('una práctica aún abierta se retoma (estudiante) o se abre su revisión (docente)', async () => {
      vi.mocked(obtenerDetalleSesion).mockResolvedValue({ ...DETALLE_SESION, estado: 'en_curso' });
      await expect(destinoDeRedireccion()).resolves.toBe(`/simulacion?sesion=${SESION_ID}`);

      vi.mocked(requerirUsuario).mockResolvedValue(perfil('docente'));
      await expect(destinoDeRedireccion()).resolves.toBe(`/sesiones/${SESION_ID}`);
    });
  });

  describe('qué muestra de una práctica terminada', () => {
    it('el caso, el estudiante, el paciente y las cuatro tarjetas', async () => {
      mostrar(await pagina());

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Duelo y pérdida');
      expect(screen.getByText('Ana María Pérez')).toBeInTheDocument();
      expect(screen.getByText('202012345')).toBeInTheDocument();
      for (const titulo of [
        'Total de intervenciones',
        'Latencia promedio',
        'Latencia máxima',
        'Duración de la práctica',
      ]) {
        expect(screen.getByRole('region', { name: titulo })).toBeInTheDocument();
      }
    });

    it('con métricas guardadas usa esos valores; sin ellas, reconstruye y lo avisa', async () => {
      vi.mocked(obtenerMetricasGuardadas).mockResolvedValue({
        total_mensajes: 7,
        latencia_promedio_ms: 900,
        latencia_maxima_ms: 1500,
        duracion_segundos: 125,
        indicadores: null,
      });
      const { unmount } = mostrar(await pagina());
      const intervenciones = screen.getByRole('region', { name: 'Total de intervenciones' });
      expect(within(intervenciones).getByText('7')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Duración de la práctica' })).toHaveTextContent(
        '02:05'
      );
      expect(screen.queryByText(/se calcularon con la conversación/)).not.toBeInTheDocument();
      unmount();

      vi.mocked(obtenerMetricasGuardadas).mockResolvedValue(null);
      mostrar(await pagina());
      expect(
        within(screen.getByRole('region', { name: 'Total de intervenciones' })).getByText('1')
      ).toBeInTheDocument();
      expect(screen.getByText(/se calcularon con la conversación/)).toBeInTheDocument();
    });

    it('muestra la conversación completa', async () => {
      const { container } = mostrar(await pagina());
      expect(container.querySelectorAll('[data-remitente]')).toHaveLength(2);
    });

    it('una práctica cerrada por inactividad lo dice', async () => {
      vi.mocked(obtenerDetalleSesion).mockResolvedValue({
        ...DETALLE_SESION,
        estado: 'interrumpida',
      });
      mostrar(await pagina());
      expect(screen.getByText(/se cerró por inactividad/)).toBeInTheDocument();
    });
  });

  describe('qué ve cada rol', () => {
    it('el estudiante: aviso de que le toca a su docente y acciones propias', async () => {
      mostrar(await pagina());

      expect(screen.getByText('Ahora le toca a tu docente.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Ir a Mis prácticas' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Asignar otra práctica' })).not.toBeInTheDocument();
    });

    it('el estudiante con la retroalimentación publicada ve el enlace para leerla', async () => {
      vi.mocked(obtenerDetalleSesion).mockResolvedValue({
        ...DETALLE_SESION,
        retroalimentacion: {
          comentarioGeneral: 'Bien.',
          nota: 4.5,
          publicadaEn: '2026-10-21T10:00:00.000Z',
          actualizadoEn: '2026-10-21T10:00:00.000Z',
          anotaciones: [],
        },
      });
      mostrar(await pagina());

      expect(screen.getByText('Tu docente ya publicó la retroalimentación.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Léela aquí' })).toHaveAttribute(
        'href',
        `/practicas/${SESION_ID}`
      );
    });

    it('el docente: enlace a la revisión, «Asignar otra práctica» y «Cerrar»', async () => {
      vi.mocked(requerirUsuario).mockResolvedValue(perfil('docente'));
      mostrar(await pagina());

      expect(screen.queryByText('Ahora le toca a tu docente.')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'revisión de esta práctica' })).toHaveAttribute(
        'href',
        `/sesiones/${SESION_ID}`
      );
      expect(screen.getByRole('link', { name: 'Asignar otra práctica' })).toHaveAttribute(
        'href',
        '/configuracion'
      );
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });

    it('el Administrador se trata como docente', async () => {
      vi.mocked(requerirUsuario).mockResolvedValue(perfil('superadmin'));
      mostrar(await pagina());
      expect(screen.getByRole('link', { name: 'Asignar otra práctica' })).toBeInTheDocument();
    });
  });

  describe('reflexión del estudiante (INACSL)', () => {
    const REFLEXION = { contenido: 'Hablé poco.', actualizadoEn: '2026-10-25T15:00:00.000Z' };

    it('el estudiante puede escribirla o corregirla', async () => {
      mostrar(await pagina());
      expect(screen.getByLabelText('Tu reflexión')).toHaveValue('');

      vi.mocked(obtenerReflexion).mockResolvedValue(REFLEXION);
      mostrar(await pagina());
      expect(screen.getAllByLabelText('Tu reflexión')[1]).toHaveValue('Hablé poco.');
    });

    it('si la práctica no llegó a empezar no se ofrece', async () => {
      vi.mocked(obtenerDetalleSesion).mockResolvedValue({ ...DETALLE_SESION, comenzada: false });
      mostrar(await pagina());
      expect(screen.queryByLabelText('Tu reflexión')).not.toBeInTheDocument();
    });

    it('el docente la lee, sin poder editarla', async () => {
      vi.mocked(requerirUsuario).mockResolvedValue(perfil('docente'));
      vi.mocked(obtenerReflexion).mockResolvedValue(REFLEXION);
      mostrar(await pagina());

      expect(
        screen.getByRole('heading', { name: 'Reflexión de Ana María Pérez' })
      ).toBeInTheDocument();
      expect(screen.getByText('Hablé poco.')).toBeInTheDocument();
      expect(screen.queryByLabelText('Tu reflexión')).not.toBeInTheDocument();
    });

    it('al docente no le aparece nada si el estudiante no escribió', async () => {
      vi.mocked(requerirUsuario).mockResolvedValue(perfil('docente'));
      mostrar(await pagina());
      expect(screen.queryByText(/Reflexión de/)).not.toBeInTheDocument();
    });
  });
});
