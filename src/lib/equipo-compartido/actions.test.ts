import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requerirDocente, requerirEstudiante } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { cancelarEntrega, cerrarSesionEquipoCompartido, entregarEquipo } from './actions';
import { COOKIE_ENTREGA, COOKIE_EQUIPO_COMPARTIDO, leerEntrega } from './entrega';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/auth/dal', () => ({ requerirDocente: vi.fn(), requerirEstudiante: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn() } }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/navigation', () => ({
  // Como en Next.js, `redirect` corta la ejecución lanzando un error.
  redirect: vi.fn((ruta: string) => {
    throw new Error(`NEXT_REDIRECT:${ruta}`);
  }),
}));

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const MANANA = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

let db: SupabaseFalso;
let almacen: { set: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  almacen = { set: vi.fn(), delete: vi.fn() };
  vi.mocked(cookies).mockResolvedValue(almacen as never);
});

function asignacion(cambios: Record<string, unknown> = {}) {
  db.responder('asignacion', {
    data: {
      codigo: 'abc-defg-hij',
      expira_en: MANANA,
      anulada_en: null,
      sesion_id: null,
      estudiante: { nombre: 'María José Ríos' },
      escenario: { titulo: 'Estrés académico' },
      ...cambios,
    },
  });
}

/** Valor con que se guardó una cookie en la respuesta. */
function cookie(nombre: string) {
  return almacen.set.mock.calls.find(([n]) => n === nombre);
}

describe('entregarEquipo (modo presencial)', () => {
  it('guarda para quién es el equipo, cierra la sesión del docente y va a la entrega', async () => {
    asignacion();
    await expect(entregarEquipo({ id: ID })).rejects.toThrow('NEXT_REDIRECT:/entrega');

    expect(requerirDocente).toHaveBeenCalled();
    expect(leerEntrega(cookie(COOKIE_ENTREGA)?.[1])).toEqual({
      codigo: 'abc-defg-hij',
      estudiante: 'María José Ríos',
      caso: 'Estrés académico',
      docenteConGoogle: false,
    });
    // Los datos solo los lee el servidor; la marca de equipo compartido, también el navegador.
    expect(cookie(COOKIE_ENTREGA)?.[2]).toMatchObject({ httpOnly: true, sameSite: 'lax' });
    expect(cookie(COOKIE_EQUIPO_COMPARTIDO)?.[2]).toMatchObject({ httpOnly: false });
    expect(db.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('avisa si el docente tiene Google vinculado', async () => {
    asignacion();
    db.auth.getUser.mockResolvedValueOnce({
      data: { user: { app_metadata: { provider: 'email', providers: ['email', 'google'] } } },
      error: null,
    });
    await expect(entregarEquipo({ id: ID })).rejects.toThrow('NEXT_REDIRECT');
    expect(leerEntrega(cookie(COOKIE_ENTREGA)?.[1])?.docenteConGoogle).toBe(true);
  });

  it.each([
    ['usado', { sesion_id: '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60' }],
    ['anulado', { anulada_en: '2026-10-01T00:00:00Z' }],
    ['vencido', { expira_en: '2026-01-01T00:00:00Z' }],
  ])('no entrega el equipo con un código %s ni cierra la sesión', async (_, cambios) => {
    asignacion(cambios);
    const resultado = await entregarEquipo({ id: ID });

    expect(resultado).toEqual({ ok: false, error: expect.stringMatching(/Genera uno nuevo/) });
    expect(almacen.set).not.toHaveBeenCalled();
    expect(db.auth.signOut).not.toHaveBeenCalled();
  });

  it('no entrega un código que no es del docente (RLS no lo devuelve)', async () => {
    db.responder('asignacion', { data: null });
    expect((await entregarEquipo({ id: ID })).ok).toBe(false);
    expect(db.auth.signOut).not.toHaveBeenCalled();
  });

  it('rechaza un id inválido sin consultar la base de datos', async () => {
    expect(await entregarEquipo({ id: 'x' })).toEqual({ ok: false, error: expect.any(String) });
    expect(db.consultas).toHaveLength(0);
  });

  it('si falla la lectura, avisa sin cerrar la sesión', async () => {
    db.responder('asignacion', { error: { code: '500' } });
    expect((await entregarEquipo({ id: ID })).ok).toBe(false);
    expect(db.auth.signOut).not.toHaveBeenCalled();
  });
});

describe('cancelarEntrega y cerrarSesionEquipoCompartido', () => {
  it('cancelar quita las marcas y vuelve al acceso del docente', async () => {
    await expect(cancelarEntrega()).rejects.toThrow('NEXT_REDIRECT:/login?docente=1');
    expect(almacen.delete).toHaveBeenCalledWith(COOKIE_ENTREGA);
    expect(almacen.delete).toHaveBeenCalledWith(COOKIE_EQUIPO_COMPARTIDO);
  });

  it('al terminar, cierra la sesión del estudiante y pide cerrar la de Google', async () => {
    await expect(cerrarSesionEquipoCompartido()).rejects.toThrow('NEXT_REDIRECT:/entrega/fin');
    expect(requerirEstudiante).toHaveBeenCalled();
    expect(db.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(almacen.delete).toHaveBeenCalledWith(COOKIE_ENTREGA);
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/entrega/fin');
  });
});
