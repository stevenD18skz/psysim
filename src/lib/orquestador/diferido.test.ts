import { after } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reiniciarOrquestadorEnv } from '@/lib/env/orquestador';

import { barrerDespues, cerrarDespues, sincronizarCasoDespues } from './diferido';
import { cerrarEnOrquestador, cerrarPendientes } from './practica';
import { sincronizarCasoGuardado } from './sincronizar';

vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('./practica', () => ({ cerrarEnOrquestador: vi.fn(), cerrarPendientes: vi.fn() }));
vi.mock('./sincronizar', () => ({ sincronizarCasoGuardado: vi.fn() }));

const SESION = '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60';

/** Ejecuta lo que se agendó para después de responder. */
async function correrAgendado() {
  for (const [tarea] of vi.mocked(after).mock.calls) {
    if (typeof tarea === 'function') await tarea();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarOrquestadorEnv();
});

afterEach(() => {
  vi.unstubAllEnvs();
  reiniciarOrquestadorEnv();
});

describe('trabajo diferido con el orquestador', () => {
  it('sin orquestador configurado no agenda nada', () => {
    vi.stubEnv('ORQUESTADOR_URL', '');
    vi.stubEnv('IA_PROVEEDOR', '');
    cerrarDespues(SESION);
    barrerDespues();
    sincronizarCasoDespues('caso');
    expect(after).not.toHaveBeenCalled();
  });

  it('con orquestador: cierra la sesión de la práctica y barre las pendientes tras responder', async () => {
    vi.stubEnv('ORQUESTADOR_URL', 'https://orquestador.test');
    cerrarDespues(SESION);
    barrerDespues();

    // Nada corre antes de que la respuesta salga.
    expect(cerrarEnOrquestador).not.toHaveBeenCalled();
    await correrAgendado();
    expect(cerrarEnOrquestador).toHaveBeenCalledWith(SESION);
    expect(cerrarPendientes).toHaveBeenCalledOnce();
  });

  it('aunque el interruptor esté en Gemini, las sesiones abiertas allá se siguen cerrando', async () => {
    vi.stubEnv('ORQUESTADOR_URL', 'https://orquestador.test');
    vi.stubEnv('IA_PROVEEDOR', 'gemini');
    cerrarDespues(SESION);
    sincronizarCasoDespues('caso');

    await correrAgendado();
    expect(cerrarEnOrquestador).toHaveBeenCalledWith(SESION);
    // Los casos solo se sincronizan si el orquestador es el proveedor.
    expect(sincronizarCasoGuardado).not.toHaveBeenCalled();
  });

  it('sincroniza el caso recién guardado cuando el proveedor es el orquestador', async () => {
    vi.stubEnv('IA_PROVEEDOR', 'orquestador');
    sincronizarCasoDespues('caso');
    await correrAgendado();
    expect(sincronizarCasoGuardado).toHaveBeenCalledWith('caso');
  });
});
