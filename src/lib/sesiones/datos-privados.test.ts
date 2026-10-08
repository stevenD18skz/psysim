import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdminClient } from '@/lib/supabase/admin';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import {
  leerEscenarioDeSesion,
  leerPromptDeSesion,
  leerTitulosDeEscenarios,
} from './datos-privados';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

let admin: SupabaseFalso;

beforeEach(() => {
  admin = crearSupabaseFalso();
  vi.mocked(createAdminClient).mockReturnValue(admin.cliente as never);
});

describe('datos privados de la sesión (clave secreta)', () => {
  it('lee el caso y el paciente sin el prompt', async () => {
    admin.responder('escenario', {
      data: {
        id: 'e1',
        codigo: 'E-01',
        titulo: 'Duelo y pérdida',
        descripcion: 'x',
        categoria: 'clinico',
        dificultad: 'basico',
        competencia_central: 'Empatía',
        configuracion_3d: 'scenes/e-01.json',
        npc: { id: 'n1', nombre: 'Marta Lucía', edad: 58, perfil_clinico: 'Viuda.' },
      },
    });

    const escenario = await leerEscenarioDeSesion('e1');
    expect(escenario).toMatchObject({
      competenciaCentral: 'Empatía',
      npc: { id: 'n1', perfilClinico: 'Viuda.' },
    });
    expect(admin.de('escenario')[0]!.columnas).not.toContain('prompt_sistema');
  });

  it('sin paciente devuelve null', async () => {
    admin.responder('escenario', { data: { id: 'e1', npc: null } });
    expect(await leerEscenarioDeSesion('e1')).toBeNull();
  });

  it('lee los títulos de varios casos de una vez (sin repetir ids)', async () => {
    admin.responder('escenario', { data: [{ id: 'e1', codigo: 'E-01', titulo: 'Duelo' }] });
    const titulos = await leerTitulosDeEscenarios(['e1', 'e1']);
    expect(titulos.get('e1')).toEqual({ codigo: 'E-01', titulo: 'Duelo' });
    expect(admin.de('escenario')[0]!.filtros).toEqual([['in', 'id', ['e1']]]);
    expect(await leerTitulosDeEscenarios([])).toEqual(new Map());
  });

  it('lee el prompt de la sesión', async () => {
    admin.responder('sesion', { data: { prompt_sistema: 'Eres Marta.' } }, { data: null });
    expect(await leerPromptDeSesion('s1')).toBe('Eres Marta.');
    expect(await leerPromptDeSesion('s2')).toBeNull();
  });

  it('propaga los errores de la base de datos', async () => {
    admin.responder('escenario', { error: { code: '500' } }, { error: { code: '500' } });
    admin.responder('sesion', { error: { code: '500' } });
    await expect(leerEscenarioDeSesion('e1')).rejects.toThrow('caso de la sesión');
    await expect(leerTitulosDeEscenarios(['e1'])).rejects.toThrow('los casos');
    await expect(leerPromptDeSesion('s1')).rejects.toThrow('prompt');
  });
});
