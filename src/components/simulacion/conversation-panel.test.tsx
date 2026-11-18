import { act, cleanup, renderHook, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enviarMensaje } from '@/lib/conversacion/enviar-mensaje';
import { AppStoreProvider, useAppStoreApi } from '@/store/app-store-provider';

import { SESION_ACTIVA } from '../../../test/fixtures';

import { ConversationPanel } from './conversation-panel';

vi.mock('@/lib/escenarios/actions', () => ({ reformularIntervencion: vi.fn() }));

const INICIO =
  'La verdad es que llevo varios días sin poder dormir bien y me cuesta concentrarme. ';
const RESTO = 'Siento que tengo muchas cosas pendientes y no sé por dónde empezar.';

let reloj = 0;
let siguienteCuadro = 0;
const cuadros = new Map<number, FrameRequestCallback>();
const scrollOriginal = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');

beforeEach(() => {
  reloj = 0;
  siguienteCuadro = 0;
  cuadros.clear();
  vi.spyOn(performance, 'now').mockImplementation(() => reloj);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    cuadros.set(++siguienteCuadro, callback);
    return siguienteCuadro;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => cuadros.delete(id));
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (scrollOriginal)
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollOriginal);
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

function avanzar(ms: number) {
  act(() => {
    reloj += ms;
    const pendientes = [...cuadros.values()];
    cuadros.clear();
    for (const callback of pendientes) callback(reloj);
  });
}

function montar() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProvider>
      <ConversationPanel onFinalizar={vi.fn()} finalizando={false} onContinuar={vi.fn()} />
      {children}
    </AppStoreProvider>
  );
  const { result } = renderHook(() => useAppStoreApi(), { wrapper });
  act(() => {
    result.current.getState().sesion.iniciar(SESION_ACTIVA);
    result.current.getState().npc.actualizarEstadoNPC('esperando_input');
  });
  return result.current;
}

describe('escritura del paciente en el panel', () => {
  it('continúa desde el texto visible cuando el servidor guarda una respuesta por partes', async () => {
    const store = montar();
    let controlador!: ReadableStreamDefaultController<Uint8Array>;
    const cuerpo = new ReadableStream<Uint8Array>({
      start: c => {
        controlador = c;
      },
    });
    const hacerFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(cuerpo, {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );
    const codificador = new TextEncoder();
    const emitir = async (tipo: string, datos: object) => {
      await act(async () => {
        controlador.enqueue(
          codificador.encode(`event: ${tipo}\ndata: ${JSON.stringify(datos)}\n\n`)
        );
      });
    };
    let envio!: ReturnType<typeof enviarMensaje>;
    await act(async () => {
      envio = enviarMensaje(store, 'Hola', { fetch: hacerFetch });
    });
    await emitir('fragmento', { texto: INICIO });
    avanzar(1000);
    const historial = screen.getByLabelText('Historial de la conversación');
    const burbuja = historial.querySelector('[data-remitente="npc"]')!;
    const parrafo = burbuja.querySelector('p')!;
    const yaVisible = parrafo.textContent!;
    expect(yaVisible.length).toBeGreaterThan(10);
    expect(yaVisible.length).toBeLessThan(INICIO.length);

    await emitir('fragmento', { texto: RESTO });
    avanzar(500);
    const antesDeGuardar = parrafo.textContent!;
    expect(antesDeGuardar.startsWith(yaVisible)).toBe(true);
    const idTemporal = store.getState().conversacion.mensajes.at(-1)!.id;
    await emitir('fin', {
      respuesta: {
        respuesta_npc: INICIO + RESTO,
        timestamp_respuesta: '2026-11-16T15:00:00.000Z',
        tokens_entrada: 100,
        tokens_salida: 30,
        id_mensaje_estudiante: '11111111-1111-4111-8111-111111111111',
        id_mensaje_npc: '22222222-2222-4222-8222-222222222222',
        cierre: null,
      },
    });
    expect(await envio).toEqual({ ok: true });
    expect(store.getState().conversacion.mensajes.at(-1)!.id).not.toBe(idTemporal);
    // Guardar cambia el id de la BD, pero no debe desmontar la burbuja ni borrar su progreso.
    expect(historial.querySelector('[data-remitente="npc"]')).toBe(burbuja);
    expect(parrafo.textContent).toBe(antesDeGuardar);
    avanzar(200);
    expect(parrafo.textContent!.startsWith(antesDeGuardar)).toBe(true);
    avanzar(5000);
    expect(parrafo.textContent).toBe(INICIO + RESTO);
    expect(historial.querySelectorAll('[data-remitente="npc"]')).toHaveLength(1);
    expect(store.getState().npc.estado).toBe('esperando_input');
    expect(hacerFetch).toHaveBeenCalledOnce();
  });
});
