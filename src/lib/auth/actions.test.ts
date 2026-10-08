import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { cerrarSesion, iniciarSesion, iniciarSesionConGoogle } from './actions';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
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
  it('redirige a Google con la URL de retorno y el dominio institucional', async () => {
    await expect(iniciarSesionConGoogle('/unirse/abc-defg-hij')).rejects.toThrow(
      'NEXT_REDIRECT:https://accounts.google.com/o/oauth2'
    );
    expect(db.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://psysim.vercel.app/auth/callback?siguiente=%2Funirse%2Fabc-defg-hij',
        queryParams: { hd: 'correounivalle.edu.co', prompt: 'select_account' },
      },
    });
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
