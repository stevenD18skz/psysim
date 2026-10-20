import { describe, expect, it, vi } from 'vitest';

import { type reformularIntervencion } from '@/lib/escenarios/actions';
import { crearAppStore } from '@/store/app-store';
import { type MensajeConversacion, type SesionActiva } from '@/types';

import { reformularDesde } from './reformular';

vi.mock('@/lib/escenarios/actions', () => ({ reformularIntervencion: vi.fn() }));

const SESION = {
  id: 's1',
  inicio: '2026-10-18T15:00:00.000Z',
  comenzada: true,
  estudiante: { codigo: '1', nombre: 'Ana' },
  escenario: {
    id: 'e',
    codigo: 'E-01',
    titulo: 'Duelo',
    descripcion: '',
    categoria: 'clinico',
    dificultad: 'basico',
    competenciaCentral: 'Empatía',
    configuracion3d: 'scenes/e-01.json',
  },
  npc: { id: 'n', nombre: 'Marta', edad: 58, perfilClinico: '' },
} satisfies SesionActiva;

const m = (id: string, remitente: MensajeConversacion['remitente'], extra = {}) =>
  ({ id, remitente, contenido: `texto ${id}`, timestamp: 'T', ...extra }) as MensajeConversacion;

function preparar(estadoNpc: 'esperando_input' | 'procesando' = 'esperando_input') {
  const store = crearAppStore();
  store
    .getState()
    .sesion.iniciar(SESION, [
      m('e1', 'estudiante'),
      m('p1', 'npc', { latencia_ms: 900, emocion: 'triste' }),
      m('e2', 'estudiante'),
      m('p2', 'npc', { latencia_ms: 800, emocion: 'molesto' }),
    ]);
  store.getState().npc.actualizarEstadoNPC('esperando_input');
  if (estadoNpc === 'procesando') store.getState().npc.actualizarEstadoNPC('procesando');
  return store;
}

describe('reformularDesde', () => {
  it('pide al servidor descartar y recorta el historial hasta esa intervención', async () => {
    const store = preparar();
    const accion = vi.fn<typeof reformularIntervencion>().mockResolvedValue({
      ok: true,
      datos: { descartados: 2 },
    });

    const resultado = await reformularDesde(store, 'e2', accion);

    expect(accion).toHaveBeenCalledWith({ mensajeId: 'e2' });
    expect(resultado).toEqual({ ok: true, texto: 'texto e2' });
    const { conversacion, metricas } = store.getState();
    expect(conversacion.mensajes.map(x => x.id)).toEqual(['e1', 'p1']);
    // Las métricas vuelven a corresponder a la conversación vigente.
    expect(metricas.totalMensajes).toBe(1);
    expect(metricas.latencias).toEqual([900]);
  });

  it('si el servidor no puede, la conversación sigue igual', async () => {
    const store = preparar();
    const accion = vi
      .fn<typeof reformularIntervencion>()
      .mockResolvedValue({ ok: false, error: 'No pudimos volver a ese momento.' });

    expect(await reformularDesde(store, 'e2', accion)).toEqual({
      ok: false,
      motivo: 'No pudimos volver a ese momento.',
    });
    expect(store.getState().conversacion.mensajes).toHaveLength(4);
  });

  it('no reformula con una respuesta en camino ni desde un mensaje del paciente o sin guardar', async () => {
    const accion = vi.fn<typeof reformularIntervencion>();
    expect((await reformularDesde(preparar('procesando'), 'e2', accion)).ok).toBe(false);

    const store = preparar();
    expect((await reformularDesde(store, 'p1', accion)).ok).toBe(false);
    store.getState().conversacion.agregarMensaje(m('e3', 'estudiante', { sinGuardar: true }));
    expect((await reformularDesde(store, 'e3', accion)).ok).toBe(false);
    expect(accion).not.toHaveBeenCalled();
  });
});

describe('confirmarGuardado', () => {
  it('cambia los ids locales por los de la base de datos y quita la marca', () => {
    const store = preparar();
    store.getState().conversacion.agregarMensaje(m('local', 'estudiante', { sinGuardar: true }));
    store.getState().conversacion.confirmarGuardado({ local: 'db-1', otro: null });
    const ultimo = store.getState().conversacion.mensajes.at(-1)!;
    expect(ultimo.id).toBe('db-1');
    expect(ultimo.sinGuardar).toBeUndefined();
  });
});
