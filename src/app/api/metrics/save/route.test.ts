import { beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenerSesionUsuario } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../../../test/supabase-falso';

import { POST } from './route';

/**
 * HU-26 · T02 (Sprint 6) — Route Handler `POST /api/metrics/save` del Sprint 4 (HU-19).
 *
 * Contrato acordado en Taiga, con las mismas convenciones que `/api/npc/chat`:
 *
 * - 401/403 sin sesión del estudiante (quien finaliza la sesión desde su equipo); 400 con el
 *   detalle por campo (`campos`) si el cuerpo no pasa Zod; 409 si la sesión no está `en_curso`
 *   (se consulta `sesion.estado` antes de guardar).
 * - Guarda de forma atómica con la función de PostgreSQL `guardar_metricas_cierre` (INSERT en
 *   `metrica` + UPDATE de la sesión), invocada con `supabase.rpc` y parámetros `p_<campo>`.
 * - 500 con un mensaje genérico si falla la base de datos: nunca expone detalles internos.
 */
vi.mock('@/lib/auth/dal', () => ({ obtenerSesionUsuario: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const SESION_ID = '44444444-4444-4444-8444-444444444444';
const CUERPO = {
  sesion_id: SESION_ID,
  total_mensajes: 4,
  latencia_promedio_ms: 1820,
  latencia_maxima_ms: 3400,
  indicadores: { proximidad_promedio: 1.8 },
};

function peticion(cuerpo: unknown) {
  return new Request('http://localhost/api/metrics/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  });
}

describe('POST /api/metrics/save (HU-19)', () => {
  let db: SupabaseFalso;

  beforeEach(() => {
    db = crearSupabaseFalso();
    vi.mocked(createClient).mockResolvedValue(db.cliente as never);
    vi.mocked(obtenerSesionUsuario).mockResolvedValue({
      estado: 'autorizado',
      perfil: {
        id: 'e57d1a00-0000-4000-8000-000000000001',
        nombre: 'Ana Pérez',
        correo: 'ana.perez@correounivalle.edu.co',
        codigoInstitucional: '202012345',
        rol: 'estudiante',
        contrasenaTemporal: false,
      },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('con un cuerpo válido guarda las métricas y cierra la sesión en una sola operación', async () => {
    db.responder('sesion', { data: { estado: 'en_curso' } });
    db.responder('rpc:guardar_metricas_cierre', { data: 'metrica-1' });

    const respuesta = await POST(peticion(CUERPO));

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toMatchObject({ sesion_id: SESION_ID });
    expect(db.rpc).toHaveBeenCalledWith(
      'guardar_metricas_cierre',
      expect.objectContaining({
        p_sesion_id: SESION_ID,
        p_total_mensajes: 4,
        p_latencia_promedio_ms: 1820,
        p_latencia_maxima_ms: 3400,
        p_indicadores: { proximidad_promedio: 1.8 },
      })
    );
  });

  it('acepta latencias e indicadores nulos (sesión sin respuestas del paciente)', async () => {
    db.responder('sesion', { data: { estado: 'en_curso' } });
    const respuesta = await POST(
      peticion({
        ...CUERPO,
        total_mensajes: 0,
        latencia_promedio_ms: null,
        latencia_maxima_ms: null,
        indicadores: null,
      })
    );
    expect(respuesta.status).toBe(200);
  });

  it.each([
    ['sesion_id inválido', { ...CUERPO, sesion_id: 'no-es-uuid' }, 'sesion_id'],
    ['total_mensajes negativo', { ...CUERPO, total_mensajes: -1 }, 'total_mensajes'],
    ['latencia con decimales', { ...CUERPO, latencia_promedio_ms: 12.5 }, 'latencia_promedio_ms'],
  ])('con %s responde 400 con el detalle del campo', async (_, cuerpo, campo) => {
    const respuesta = await POST(peticion(cuerpo));
    expect(respuesta.status).toBe(400);
    const json = await respuesta.json();
    expect(json.campos).toHaveProperty(campo);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('responde 400 si el cuerpo no es JSON', async () => {
    expect((await POST(peticion('{no json'))).status).toBe(400);
  });

  it.each(['finalizada', 'interrumpida'])(
    'responde 409 si la sesión está %s (no se guardan métricas dos veces)',
    async estado => {
      db.responder('sesion', { data: { estado } });
      const respuesta = await POST(peticion(CUERPO));
      expect(respuesta.status).toBe(409);
      expect(db.rpc).not.toHaveBeenCalled();
    }
  );

  it('responde 401 sin sesión y 403 sin rol', async () => {
    vi.mocked(obtenerSesionUsuario).mockResolvedValueOnce({ estado: 'sin-sesion' });
    expect((await POST(peticion(CUERPO))).status).toBe(401);
    vi.mocked(obtenerSesionUsuario).mockResolvedValueOnce({ estado: 'sin-permiso' });
    expect((await POST(peticion(CUERPO))).status).toBe(403);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('responde 403 si quien llama no es estudiante (el docente no cierra prácticas ajenas)', async () => {
    vi.mocked(obtenerSesionUsuario).mockResolvedValueOnce({
      estado: 'autorizado',
      perfil: {
        id: 'd0c3a000-0000-4000-8000-000000000001',
        nombre: 'Docente',
        correo: 'docente@correounivalle.edu.co',
        codigoInstitucional: '100000001',
        rol: 'docente',
        contrasenaTemporal: false,
      },
    });
    expect((await POST(peticion(CUERPO))).status).toBe(403);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('responde 404 si la sesión no existe o no es del estudiante (RLS la oculta)', async () => {
    db.responder('sesion', { data: null });
    const respuesta = await POST(peticion(CUERPO));
    expect(respuesta.status).toBe(404);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('responde 500 sin detalles si no se puede leer la sesión', async () => {
    db.responder('sesion', { error: { code: 'XX000', message: 'connection reset by peer' } });
    const respuesta = await POST(peticion(CUERPO));
    expect(respuesta.status).toBe(500);
    expect(await respuesta.text()).not.toMatch(/connection|XX000|peer/i);
  });

  it('responde 409 si otra pestaña la cerró entre la lectura y el guardado (55000)', async () => {
    db.responder('sesion', { data: { estado: 'en_curso' } });
    db.responder('rpc:guardar_metricas_cierre', { error: { code: '55000', message: 'x' } });
    expect((await POST(peticion(CUERPO))).status).toBe(409);
  });

  it.each([
    ['promedio sin máxima', { ...CUERPO, latencia_maxima_ms: null }, 'latencia_maxima_ms'],
    ['máxima menor que el promedio', { ...CUERPO, latencia_maxima_ms: 100 }, 'latencia_maxima_ms'],
  ])('con %s responde 400', async (_, cuerpo, campo) => {
    const respuesta = await POST(peticion(cuerpo));
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).campos).toHaveProperty(campo);
  });

  it('la respuesta nunca se guarda en caché', async () => {
    db.responder('sesion', { data: { estado: 'en_curso' } });
    const respuesta = await POST(peticion(CUERPO));
    expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
  });

  it('si falla la base de datos responde 500 sin exponer detalles internos', async () => {
    db.responder('sesion', { data: { estado: 'en_curso' } });
    db.responder('rpc:guardar_metricas_cierre', {
      error: {
        code: '23503',
        message: 'insert or update on table "metrica" violates foreign key constraint',
      },
    });

    const respuesta = await POST(peticion(CUERPO));

    expect(respuesta.status).toBe(500);
    const texto = await respuesta.text();
    expect(texto).not.toMatch(/metrica|foreign key|23503|constraint|supabase|postgres/i);
    expect(JSON.parse(texto).error).toEqual(expect.any(String));
  });
});
