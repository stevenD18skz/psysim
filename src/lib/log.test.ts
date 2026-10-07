import { afterEach, describe, expect, it, vi } from 'vitest';

import { log } from './log';

afterEach(() => vi.restoreAllMocks());

describe('log', () => {
  it('escribe una línea JSON por evento con su nivel', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    log.info('npc_chat.respuesta', { latencia_ms: 900 });
    log.error('npc_chat.ia_fallo', { tipo: 'limite' });
    log.info('sin_datos');

    expect(JSON.parse(info.mock.calls[0]![0] as string)).toEqual({
      nivel: 'info',
      evento: 'npc_chat.respuesta',
      latencia_ms: 900,
    });
    expect(JSON.parse(error.mock.calls[0]![0] as string)).toEqual({
      nivel: 'error',
      evento: 'npc_chat.ia_fallo',
      tipo: 'limite',
    });
    expect(JSON.parse(info.mock.calls[1]![0] as string)).toEqual({
      nivel: 'info',
      evento: 'sin_datos',
    });
  });
});
