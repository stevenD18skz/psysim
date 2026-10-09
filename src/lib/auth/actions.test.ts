import { redirect } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requerirUsuario } from '@/lib/auth/dal';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { cambiarContrasena, cerrarSesion, iniciarSesion, iniciarSesionConGoogle } from './actions';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/auth/dal', () => ({ requerirUsuario: vi.fn() }));
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ origin: 'https://psysim.vercel.app' })),
}));
vi.mock('next/navigation', () => ({
  // Como en Next.js, `redirect` corta la ejecución lanzando un error.
  redirect: vi.fn((ruta: string) => {
    throw new Error(`NEXT_REDIRECT:${ruta}`);
  }),
}));

const CREDENCIALES = { correo: 'docente@correounivalle.edu.co', contrasena: 'secreta123' };
const USUARIO = { id: 'd0c3e7e4-0000-4000-8000-000000000001' };

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function loginExitoso() {
  db.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: USUARIO }, error: null });
}

describe('iniciarSesion (HU-02)', () => {
  it('un docente entra y va a la ruta solicitada (si es segura)', async () => {
    loginExitoso();
    db.responder('usuario', { data: { rol: 'docente' } });

    await expect(iniciarSesion(CREDENCIALES, '/estudiantes?pagina=2')).rejects.toThrow(
      'NEXT_REDIRECT:/estudiantes?pagina=2'
    );
    expect(db.auth.signInWithPassword).toHaveBeenCalledWith({
      email: CREDENCIALES.correo,
      password: CREDENCIALES.contrasena,
    });
  });

  it('ignora una ruta de retorno externa (redirección abierta)', async () => {
    loginExitoso();
    db.responder('usuario', { data: { rol: 'docente' } });
    await expect(iniciarSesion(CREDENCIALES, '//sitio-malicioso.com')).rejects.toThrow(
      'NEXT_REDIRECT:/configuracion'
    );
  });

  it('sin perfil en la plataforma cierra la sesión y muestra acceso denegado', async () => {
    loginExitoso();
    db.responder('usuario', { data: null });

    await expect(iniciarSesion(CREDENCIALES)).rejects.toThrow('NEXT_REDIRECT:/acceso-denegado');
    expect(db.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('un estudiante (cuenta de prueba con contraseña) va a sus prácticas', async () => {
    loginExitoso();
    db.responder('usuario', { data: { rol: 'estudiante' } });
    await expect(iniciarSesion(CREDENCIALES)).rejects.toThrow('NEXT_REDIRECT:/practicas');
  });

  it('a un estudiante no lo devuelve a una ruta del docente', async () => {
    loginExitoso();
    db.responder('usuario', { data: { rol: 'estudiante' } });
    await expect(iniciarSesion(CREDENCIALES, '/configuracion')).rejects.toThrow(
      'NEXT_REDIRECT:/practicas'
    );
  });

  it.each([
    ['invalid_credentials', 400],
    ['email_not_confirmed', 400],
  ])('con %s responde un mensaje genérico (no revela qué falló)', async code => {
    db.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: { code, status: 400 } });
    expect(await iniciarSesion(CREDENCIALES)).toEqual({
      error: 'Correo o contraseña incorrectos.',
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('avisa del límite de intentos (429)', async () => {
    db.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: { status: 429 } });
    expect(await iniciarSesion(CREDENCIALES)).toEqual({
      error: 'Demasiados intentos de inicio de sesión. Espera unos minutos.',
    });
  });

  it('ante un error inesperado responde un mensaje genérico', async () => {
    db.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { code: 'unexpected_failure', status: 500 },
    });
    expect(await iniciarSesion(CREDENCIALES)).toEqual({
      error: 'No fue posible iniciar sesión. Inténtalo de nuevo.',
    });
  });

  it('si no puede leer el perfil, no deja la sesión abierta', async () => {
    loginExitoso();
    db.responder('usuario', { error: { code: '500' } });
    expect(await iniciarSesion(CREDENCIALES)).toEqual({
      error: 'No fue posible iniciar sesión. Inténtalo de nuevo.',
    });
    expect(db.auth.signOut).toHaveBeenCalled();
  });

  it('valida los datos en el servidor antes de llamar a Supabase', async () => {
    expect(await iniciarSesion({ correo: 'no-es-correo', contrasena: '' })).toEqual({
      error: 'Revisa los datos del formulario.',
    });
    expect(db.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe('iniciarSesionConGoogle', () => {
  /** Respuesta de `/auth/v1/settings` de Supabase con el proveedor de Google activado o no. */
  function ajustesAuth(google: boolean) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ external: { google, email: true } }))
    );
  }

  beforeEach(() => ajustesAuth(true));
  afterEach(() => vi.unstubAllGlobals());

  it('redirige a Google con la URL de retorno (estudiantes y docentes)', async () => {
    await expect(iniciarSesionConGoogle('/unirse/abc-defg-hij')).rejects.toThrow(
      'NEXT_REDIRECT:https://accounts.google.com/o/oauth2'
    );
    expect(db.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://psysim.vercel.app/auth/callback?siguiente=%2Funirse%2Fabc-defg-hij',
        queryParams: { prompt: 'select_account' },
      },
    });
  });

  it('si Google no está habilitado en Supabase, lo explica sin redirigir', async () => {
    ajustesAuth(false);
    expect(await iniciarSesionConGoogle()).toEqual({
      error: expect.stringContaining('aún no está habilitado'),
    });
    expect(db.auth.signInWithOAuth).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('si no se pueden leer los ajustes de Auth, lo intenta igual', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('sin red')))
    );
    await expect(iniciarSesionConGoogle()).rejects.toThrow(
      'NEXT_REDIRECT:https://accounts.google.com'
    );
  });

  it('si Supabase falla, muestra un error sin redirigir', async () => {
    db.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: null },
      error: { code: 'provider_disabled', status: 400 },
    });
    expect(await iniciarSesionConGoogle()).toEqual({
      error: 'No fue posible conectar con Google. Inténtalo de nuevo.',
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('cerrarSesion (HU-04)', () => {
  it('cierra la sesión de este dispositivo', async () => {
    await cerrarSesion();
    expect(db.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('no lanza si falla la revocación remota (las cookies se borran igual)', async () => {
    db.auth.signOut.mockResolvedValueOnce({ error: { code: 'session_not_found' } });
    await expect(cerrarSesion()).resolves.toBeUndefined();
  });
});

describe('cambiarContrasena', () => {
  const NUEVA = { nueva: 'una-frase-segura', confirmacion: 'una-frase-segura' };
  let admin: SupabaseFalso;

  beforeEach(() => {
    admin = crearSupabaseFalso();
    vi.mocked(createAdminClient).mockReturnValue(admin.cliente as never);
    vi.mocked(requerirUsuario).mockResolvedValue({
      id: USUARIO.id,
      contrasenaTemporal: true,
    } as never);
  });

  it('cambia la contraseña y deja de pedir el cambio de la temporal', async () => {
    expect(await cambiarContrasena(NUEVA)).toEqual({ ok: true, datos: null });
    expect(db.auth.updateUser).toHaveBeenCalledWith({ password: NUEVA.nueva });
    expect(admin.de('usuario')[0]).toMatchObject({
      operacion: 'update',
      valores: { contrasena_temporal: false },
    });
  });

  it('sin contraseña temporal no toca el perfil', async () => {
    vi.mocked(requerirUsuario).mockResolvedValueOnce({
      id: USUARIO.id,
      contrasenaTemporal: false,
    } as never);
    expect(await cambiarContrasena(NUEVA)).toMatchObject({ ok: true });
    expect(admin.consultas).toHaveLength(0);
  });

  it.each([
    [{ nueva: 'corta', confirmacion: 'corta' }, 'Usa al menos 8 caracteres.'],
    [{ nueva: 'una-frase-segura', confirmacion: 'otra-frase' }, 'Las contraseñas no coinciden.'],
  ])('valida la nueva contraseña (%o)', async (valores, error) => {
    expect(await cambiarContrasena(valores)).toEqual({ ok: false, error });
    expect(db.auth.updateUser).not.toHaveBeenCalled();
  });

  it.each([
    ['same_password', 'La nueva contraseña debe ser distinta de la actual.'],
    ['weak_password', 'Esa contraseña es muy débil. Elige una más larga o variada.'],
    ['unexpected_failure', 'No fue posible cambiar la contraseña. Inténtalo de nuevo.'],
  ])('traduce el error %s de Supabase', async (code, error) => {
    db.auth.updateUser.mockResolvedValueOnce({ data: {}, error: { code } });
    expect(await cambiarContrasena(NUEVA)).toEqual({ ok: false, error });
    expect(admin.consultas).toHaveLength(0);
  });
});
