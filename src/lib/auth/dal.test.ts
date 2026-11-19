import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import {
  debeCambiarContrasena,
  obtenerSesionUsuario,
  requerirDocente,
  requerirEstudiante,
  requerirSuperadmin,
  requerirUsuario,
} from './dal';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((ruta: string) => {
    throw new Error(`NEXT_REDIRECT:${ruta}`);
  }),
}));

const USUARIO = { id: 'd0c3e7e4-0000-4000-8000-000000000001' };
const PERFIL = {
  id: USUARIO.id,
  nombre: 'Ana Gómez',
  correo: 'ana@correounivalle.edu.co',
  codigo_institucional: 'DOC-1',
  rol: 'docente',
  activo: true,
  contrasena_temporal: false,
  avatar_id: 'brote',
};

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  // El perfil completo se lee con la clave secreta (el cliente solo ve id, nombre y rol).
  vi.mocked(createAdminClient).mockReturnValue(db.cliente as never);
});

function conUsuario() {
  db.auth.getUser.mockResolvedValueOnce({ data: { user: USUARIO }, error: null });
}

describe('obtenerSesionUsuario (DAL)', () => {
  it('sin usuario válido (sesión cerrada o revocada) es sin-sesion', async () => {
    db.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { status: 401 } });
    expect(await obtenerSesionUsuario()).toEqual({ estado: 'sin-sesion' });
  });

  it('con perfil docente devuelve el perfil como DTO', async () => {
    conUsuario();
    db.responder('usuario', { data: PERFIL });

    expect(await obtenerSesionUsuario()).toEqual({
      estado: 'autorizado',
      perfil: {
        id: USUARIO.id,
        nombre: 'Ana Gómez',
        correo: 'ana@correounivalle.edu.co',
        codigoInstitucional: 'DOC-1',
        rol: 'docente',
        avatarId: 'brote',
        contrasenaTemporal: false,
      },
    });
  });

  it('usa las iniciales en una cuenta que todavía no tiene avatar', async () => {
    conUsuario();
    db.responder('usuario', { data: { ...PERFIL, avatar_id: null } });
    expect(await obtenerSesionUsuario()).toMatchObject({ perfil: { avatarId: null } });
  });

  it('carga el perfil si queda pendiente aplicar la migración del avatar', async () => {
    conUsuario();
    const { avatar_id: _avatarId, ...perfilAnterior } = PERFIL;
    db.responder('usuario', { error: { code: '42703' } }, { data: perfilAnterior });
    expect(await obtenerSesionUsuario()).toMatchObject({
      estado: 'autorizado',
      perfil: { avatarId: null },
    });
    expect(db.de('usuario')[1]?.columnas).not.toContain('avatar_id');
  });

  it('informa si la cuenta usa una contraseña temporal', async () => {
    conUsuario();
    db.responder('usuario', { data: { ...PERFIL, contrasena_temporal: true } });
    expect(await obtenerSesionUsuario()).toMatchObject({
      perfil: { contrasenaTemporal: true },
    });
  });

  it('con perfil de estudiante también está autorizado (con su rol)', async () => {
    conUsuario();
    db.responder('usuario', { data: { ...PERFIL, rol: 'estudiante' } });
    expect(await obtenerSesionUsuario()).toMatchObject({
      estado: 'autorizado',
      perfil: { rol: 'estudiante' },
    });
  });

  it.each([
    ['sin perfil', null],
    ['con un rol desconocido', { ...PERFIL, rol: 'administrador' }],
    ['con la cuenta desactivada por el Administrador', { ...PERFIL, activo: false }],
  ])('%s es sin-permiso', async (_, perfil) => {
    conUsuario();
    db.responder('usuario', { data: perfil });
    expect(await obtenerSesionUsuario()).toEqual({ estado: 'sin-permiso' });
  });

  it('un fallo de la base de datos no se confunde con "sin permiso"', async () => {
    conUsuario();
    db.responder('usuario', { error: { code: '500' } });
    await expect(obtenerSesionUsuario()).rejects.toThrow('No pudimos cargar el perfil');
  });

  // P1-01: la API de Auth deja ponerle contraseña a cualquier cuenta con un token de sesión. El
  // estudiante entra con Google: una sesión suya abierta con contraseña es esa «segunda puerta».
  describe('estudiante que entró con contraseña', () => {
    const ESTUDIANTE = { ...PERFIL, rol: 'estudiante', correo: 'ana.perez@correounivalle.edu.co' };
    const conSesion = (amr: unknown) =>
      db.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: `x.${Buffer.from(JSON.stringify({ amr })).toString('base64url')}.y`,
          },
        },
        error: null,
      });

    it('no tiene permiso, aunque la sesión y el rol sean válidos', async () => {
      conUsuario();
      db.responder('usuario', { data: ESTUDIANTE });
      conSesion([{ method: 'password', timestamp: 1 }]);
      expect(await obtenerSesionUsuario()).toEqual({ estado: 'sin-permiso' });
    });

    it('con Google entra como siempre', async () => {
      conUsuario();
      db.responder('usuario', { data: ESTUDIANTE });
      conSesion([{ method: 'oauth', timestamp: 1 }]);
      expect(await obtenerSesionUsuario()).toMatchObject({
        estado: 'autorizado',
        perfil: { rol: 'estudiante' },
      });
    });

    it('si el token no dice el método, no se deja fuera a nadie', async () => {
      conUsuario();
      db.responder('usuario', { data: ESTUDIANTE });
      expect(await obtenerSesionUsuario()).toMatchObject({ estado: 'autorizado' });
    });

    it('las cuentas de prueba sí entran con contraseña', async () => {
      conUsuario();
      db.responder('usuario', { data: { ...ESTUDIANTE, correo: 'estudiante1@psysim.test' } });
      conSesion([{ method: 'password', timestamp: 1 }]);
      expect(await obtenerSesionUsuario()).toMatchObject({ estado: 'autorizado' });
    });

    it('al docente no le aplica: él sí entra con contraseña', async () => {
      conUsuario();
      db.responder('usuario', { data: PERFIL });
      conSesion([{ method: 'password', timestamp: 1 }]);
      expect(await obtenerSesionUsuario()).toMatchObject({ estado: 'autorizado' });
    });
  });
});

// P3-01: tras entregar su equipo (modo presencial), la cuenta del docente no vale con una sesión
// de Google abierta después. La sesión de Google del navegador entregado sigue abierta, y quien
// lo tiene podría elegirla sin escribir ninguna contraseña.
describe('docente que entregó su equipo', () => {
  const AHORA = Date.now();
  const HASTA = new Date(AHORA + 3 * 60 * 60 * 1000).toISOString();
  /** La entrega dura 4 horas: esta empezó hace una. */
  const haceS = (segundos: number) => Math.floor(AHORA / 1000) - segundos;
  const conSesion = (amr: unknown) =>
    db.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: `x.${Buffer.from(JSON.stringify({ amr })).toString('base64url')}.y`,
        },
      },
      error: null,
    });

  it('una sesión de Google abierta después de la entrega no tiene permiso', async () => {
    conUsuario();
    db.responder('usuario', { data: PERFIL }, { data: { entrega_hasta: HASTA } });
    conSesion([{ method: 'oauth', timestamp: haceS(60) }]);
    expect(await obtenerSesionUsuario()).toEqual({ estado: 'sin-permiso' });
  });

  it('su sesión de Google anterior a la entrega (otro dispositivo) sigue sirviendo', async () => {
    conUsuario();
    db.responder('usuario', { data: PERFIL }, { data: { entrega_hasta: HASTA } });
    conSesion([{ method: 'oauth', timestamp: haceS(2 * 60 * 60) }]);
    expect(await obtenerSesionUsuario()).toMatchObject({ estado: 'autorizado' });
  });

  it('con su contraseña entra siempre, y no hace falta leer la entrega', async () => {
    conUsuario();
    db.responder('usuario', { data: PERFIL });
    conSesion([{ method: 'password', timestamp: haceS(60) }]);
    expect(await obtenerSesionUsuario()).toMatchObject({ estado: 'autorizado' });
    expect(db.de('usuario')).toHaveLength(1);
  });

  it.each([
    ['sin entrega', { entrega_hasta: null }],
    ['con la entrega ya vencida', { entrega_hasta: new Date(AHORA - 60_000).toISOString() }],
  ])('%s, Google entra como siempre', async (_, ventana) => {
    conUsuario();
    db.responder('usuario', { data: PERFIL }, { data: ventana });
    conSesion([{ method: 'oauth', timestamp: haceS(60) }]);
    expect(await obtenerSesionUsuario()).toMatchObject({ estado: 'autorizado' });
  });

  it('si la base aún no tiene la columna, nadie se queda fuera', async () => {
    conUsuario();
    db.responder('usuario', { data: PERFIL }, { error: { code: '42703' } });
    conSesion([{ method: 'oauth', timestamp: haceS(60) }]);
    expect(await obtenerSesionUsuario()).toMatchObject({ estado: 'autorizado' });
  });
});

// P3-03: la contraseña temporal no es un aviso, es una condición de acceso.
describe('contraseña temporal sin cambiar', () => {
  const TEMPORAL = { ...PERFIL, contrasena_temporal: true };

  it.each([
    ['requerirDocente', requerirDocente, 'docente'],
    ['requerirDocente (Administrador)', requerirDocente, 'superadmin'],
    ['requerirSuperadmin', requerirSuperadmin, 'superadmin'],
  ] as const)('%s lleva a cambiarla', async (_, requerir, rol) => {
    conUsuario();
    db.responder('usuario', { data: { ...TEMPORAL, rol } });
    await expect(requerir()).rejects.toThrow('NEXT_REDIRECT:/contrasena');
  });

  it('requerirUsuario la deja pasar: es lo que usa la propia pantalla del cambio', async () => {
    conUsuario();
    db.responder('usuario', { data: TEMPORAL });
    expect(await requerirUsuario()).toMatchObject({ contrasenaTemporal: true });
  });

  it('dice quién debe cambiarla: el equipo docente, no el estudiante', () => {
    expect(debeCambiarContrasena({ rol: 'docente', contrasenaTemporal: true })).toBe(true);
    expect(debeCambiarContrasena({ rol: 'superadmin', contrasenaTemporal: true })).toBe(true);
    expect(debeCambiarContrasena({ rol: 'docente', contrasenaTemporal: false })).toBe(false);
    // El estudiante no entra con contraseña: bloquearlo lo dejaría sin salida.
    expect(debeCambiarContrasena({ rol: 'estudiante', contrasenaTemporal: true })).toBe(false);
  });
});

describe('requerirDocente', () => {
  it('devuelve el perfil del docente', async () => {
    conUsuario();
    db.responder('usuario', { data: PERFIL });
    expect(await requerirDocente()).toMatchObject({ nombre: 'Ana Gómez' });
  });

  it('sin sesión redirige a /login', async () => {
    await expect(requerirDocente()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('sin perfil redirige a /acceso-denegado', async () => {
    conUsuario();
    db.responder('usuario', { data: null });
    await expect(requerirDocente()).rejects.toThrow('NEXT_REDIRECT:/acceso-denegado');
  });

  it('un estudiante va a sus prácticas', async () => {
    conUsuario();
    db.responder('usuario', { data: { ...PERFIL, rol: 'estudiante' } });
    await expect(requerirDocente()).rejects.toThrow('NEXT_REDIRECT:/practicas');
  });

  it('el Administrador también trabaja como docente', async () => {
    conUsuario();
    db.responder('usuario', { data: { ...PERFIL, rol: 'superadmin' } });
    expect(await requerirDocente()).toMatchObject({ rol: 'superadmin' });
  });
});

describe('requerirSuperadmin', () => {
  it('devuelve el perfil del Administrador', async () => {
    conUsuario();
    db.responder('usuario', { data: { ...PERFIL, rol: 'superadmin' } });
    expect(await requerirSuperadmin()).toMatchObject({ rol: 'superadmin' });
  });

  it.each([
    ['docente', '/inicio'],
    ['estudiante', '/practicas'],
  ])('un %s va a su ruta de inicio', async (rol, ruta) => {
    conUsuario();
    db.responder('usuario', { data: { ...PERFIL, rol } });
    await expect(requerirSuperadmin()).rejects.toThrow(`NEXT_REDIRECT:${ruta}`);
  });
});

describe('requerirEstudiante', () => {
  it('devuelve el perfil del estudiante', async () => {
    conUsuario();
    db.responder('usuario', { data: { ...PERFIL, rol: 'estudiante' } });
    expect(await requerirEstudiante()).toMatchObject({ rol: 'estudiante' });
  });

  it('un docente va a su ruta de inicio', async () => {
    conUsuario();
    db.responder('usuario', { data: PERFIL });
    await expect(requerirEstudiante()).rejects.toThrow('NEXT_REDIRECT:/inicio');
  });
});

describe('requerirUsuario', () => {
  it('acepta cualquier rol de la plataforma', async () => {
    conUsuario();
    db.responder('usuario', { data: { ...PERFIL, rol: 'estudiante' } });
    expect(await requerirUsuario()).toMatchObject({ rol: 'estudiante' });
  });

  it('sin sesión redirige a /login', async () => {
    await expect(requerirUsuario()).rejects.toThrow('NEXT_REDIRECT:/login');
  });
});
