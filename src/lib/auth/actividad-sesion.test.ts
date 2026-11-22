import { beforeEach, expect, it, vi } from 'vitest';

import { createClient } from '@/lib/supabase/server';
import { type PerfilUsuario } from '@/types';

import { crearSupabaseFalso } from '../../../test/supabase-falso';
import { comprobarActividadSesion } from './actividad-sesion';
import { obtenerSesionUsuario } from './dal';

vi.mock('./dal', () => ({ obtenerSesionUsuario: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

const perfil: PerfilUsuario = {
  id: 'docente-prueba',
  nombre: 'Docente ficticio',
  correo: 'docente@psysim.test',
  codigoInstitucional: '000',
  rol: 'docente',
  avatarId: null,
  contrasenaTemporal: false,
};

beforeEach(() => {
  vi.mocked(obtenerSesionUsuario).mockResolvedValue({
    estado: 'autorizado',
    perfil,
    segundosRestantes: 60,
  });
});

it('comprobar una pestaña visible devuelve el plazo sin extenderlo', async () => {
  expect(await comprobarActividadSesion(perfil.id, false)).toBe(60);
  expect(createClient).not.toHaveBeenCalled();
});

it('una pestaña de otra cuenta o sin sesión no registra actividad', async () => {
  expect(await comprobarActividadSesion('otro-docente', true)).toBeNull();
  vi.mocked(obtenerSesionUsuario).mockResolvedValueOnce({ estado: 'sin-sesion' });
  expect(await comprobarActividadSesion(perfil.id, true)).toBeNull();
  expect(createClient).not.toHaveBeenCalled();
});

it('registra una interacción solo con la sesión activa y respeta el vencimiento entre dos consultas', async () => {
  const db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  db.responder('rpc:registrar_actividad_cuenta', { data: 7200 }, { data: 0 });
  expect(await comprobarActividadSesion(perfil.id, true)).toBe(7200);
  expect(await comprobarActividadSesion(perfil.id, true)).toBeNull();
  expect(db.rpc).toHaveBeenCalledWith('registrar_actividad_cuenta');
});
