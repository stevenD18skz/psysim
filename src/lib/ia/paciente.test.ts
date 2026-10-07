import { APICallError, RetryError } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';

import {
  clasificarError,
  construirMensajes,
  ErrorIA,
  generarRespuestaPaciente,
  limpiarRespuesta,
  MAX_MENSAJES_CONTEXTO,
} from './paciente';

function modeloQueResponde(texto: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text: texto }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: { total: 120, noCache: 120, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 18, text: 18, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

function errorApi(statusCode: number) {
  return new APICallError({
    message: `HTTP ${statusCode}`,
    url: 'https://api.test',
    requestBodyValues: {},
    statusCode,
    isRetryable: false,
  });
}

describe('construirMensajes (HU-12 · T04)', () => {
  it('pone el historial en orden y el mensaje actual al final', () => {
    const mensajes = construirMensajes(
      [
        { rol: 'user', contenido: 'Hola' },
        { rol: 'assistant', contenido: 'Buenas' },
      ],
      '¿Cómo estás?'
    );
    expect(mensajes).toEqual([
      { role: 'user', content: 'Hola' },
      { role: 'assistant', content: 'Buenas' },
      { role: 'user', content: '¿Cómo estás?' },
    ]);
  });

  it('limita el contexto y siempre empieza por un mensaje del estudiante', () => {
    const historial = Array.from({ length: MAX_MENSAJES_CONTEXTO + 5 }, (_, i) => ({
      rol: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      contenido: `m${i}`,
    }));
    const mensajes = construirMensajes(historial, 'actual');
    expect(mensajes.length).toBeLessThanOrEqual(MAX_MENSAJES_CONTEXTO + 1);
    expect(mensajes[0]?.role).toBe('user');
    expect(mensajes.at(-1)).toEqual({ role: 'user', content: 'actual' });
  });
});

describe('limpiarRespuesta', () => {
  it.each([
    ['  Hola.  ', 'Hola.'],
    ['"No sé por dónde empezar."', 'No sé por dónde empezar.'],
    ['«Estoy cansada.»', 'Estoy cansada.'],
    ['Marta Lucía: Buenas tardes.', 'Buenas tardes.'],
    ['**Marta Lucía**: Buenas tardes.', 'Buenas tardes.'],
  ])('%j → %j', (entrada, esperado) => {
    expect(limpiarRespuesta(entrada, 'Marta Lucía')).toBe(esperado);
  });

  it('no altera comillas internas', () => {
    expect(limpiarRespuesta('Me dijo "tranquila" y se fue.')).toBe('Me dijo "tranquila" y se fue.');
  });
});

describe('clasificarError (HU-16 · T01)', () => {
  it('detecta el tiempo agotado', () => {
    expect(clasificarError(new DOMException('timeout', 'TimeoutError'))).toBe('tiempo_agotado');
    expect(clasificarError(new DOMException('aborted', 'AbortError'))).toBe('tiempo_agotado');
  });

  it.each([
    [401, 'autenticacion'],
    [403, 'autenticacion'],
    [429, 'limite'],
    [504, 'tiempo_agotado'],
    [500, 'proveedor'],
  ] as const)('HTTP %i → %s', (status, tipo) => {
    expect(clasificarError(errorApi(status))).toBe(tipo);
  });

  it('usa el último error de un RetryError', () => {
    const error = new RetryError({
      message: 'reintentos agotados',
      reason: 'maxRetriesExceeded',
      errors: [errorApi(500), errorApi(429)],
    });
    expect(clasificarError(error)).toBe('limite');
  });

  it('clasifica errores desconocidos como fallo del proveedor', () => {
    expect(clasificarError(new Error('???'))).toBe('proveedor');
  });
});

function modeloQueFalla(error: unknown) {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw error;
    },
  });
}

describe('generarRespuestaPaciente (HU-12 · T05)', () => {
  const entrada = {
    promptSistema: 'Eres Marta Lucía.',
    historial: [],
    mensaje: 'Hola',
    nombrePaciente: 'Marta Lucía',
  };
  const solo = (modelo: MockLanguageModelV4) => ({ principal: { id: 'principal', modelo } });

  it('devuelve el texto limpio, el consumo de tokens y el modelo usado', async () => {
    const modelo = modeloQueResponde('Marta Lucía: "Buenas... no sé por dónde empezar."');
    const respuesta = await generarRespuestaPaciente(entrada, solo(modelo));

    expect(respuesta).toEqual({
      texto: 'Buenas... no sé por dónde empezar.',
      emocion: null,
      tokensEntrada: 120,
      tokensSalida: 18,
      modelo: 'principal',
    });
    // El prompt del sistema viaja como instrucción de sistema, no como mensaje del usuario.
    const llamada = modelo.doGenerateCalls[0]!;
    expect(llamada.prompt[0]).toMatchObject({ role: 'system' });
    // Siempre se añaden las reglas fijas después del prompt del caso.
    const sistema = (llamada.prompt[0] as { content: string }).content;
    expect(sistema.startsWith('Eres Marta Lucía.')).toBe(true);
    expect(sistema).toContain('Reglas de interpretación:');
    expect(llamada.prompt.at(-1)).toMatchObject({ role: 'user' });
    expect(llamada.maxOutputTokens).toBe(300);
  });

  it('separa la etiqueta de emoción del texto antes de limpiarlo', async () => {
    const modelo = modeloQueResponde('Marta Lucía: [emocion: abrumada] "Es que... es demasiado."');
    const respuesta = await generarRespuestaPaciente(entrada, solo(modelo));

    expect(respuesta).toMatchObject({ texto: 'Es que... es demasiado.', emocion: 'abrumado' });
    const sistema = (modelo.doGenerateCalls[0]!.prompt[0] as { content: string }).content;
    expect(sistema).toContain('[triste]');
  });

  it('una respuesta que solo trae la etiqueta es inválida', async () => {
    const modelo = modeloQueResponde('[emocion: triste]');
    await expect(generarRespuestaPaciente(entrada, solo(modelo))).rejects.toMatchObject({
      tipo: 'respuesta_invalida',
    });
  });

  it('lanza ErrorIA respuesta_invalida si el modelo responde vacío', async () => {
    await expect(
      generarRespuestaPaciente(entrada, solo(modeloQueResponde('   ')))
    ).rejects.toMatchObject({ tipo: 'respuesta_invalida' });
  });

  it('envuelve los errores del proveedor en ErrorIA', async () => {
    const promesa = generarRespuestaPaciente(entrada, solo(modeloQueFalla(errorApi(401))));
    await expect(promesa).rejects.toBeInstanceOf(ErrorIA);
    await expect(promesa).rejects.toMatchObject({ tipo: 'autenticacion' });
  });
});

describe('modelo de respaldo', () => {
  const entrada = { promptSistema: 'Eres Marta Lucía.', historial: [], mensaje: 'Hola' };

  it.each([
    ['saturado (503)', errorApi(503)],
    ['límite de uso (429)', errorApi(429)],
    ['tiempo agotado', new DOMException('timeout', 'TimeoutError')],
  ])('si el principal falla por %s responde el respaldo', async (_, error) => {
    const respaldo = modeloQueResponde('Hola, buenas tardes.');
    const respuesta = await generarRespuestaPaciente(entrada, {
      principal: { id: 'gemini-3.5-flash', modelo: modeloQueFalla(error) },
      respaldo: { id: 'gemini-3.5-flash-lite', modelo: respaldo },
    });
    expect(respuesta).toMatchObject({
      texto: 'Hola, buenas tardes.',
      modelo: 'gemini-3.5-flash-lite',
    });
    expect(respaldo.doGenerateCalls).toHaveLength(1);
  });

  it('no usa el respaldo ante un error de autenticación', async () => {
    const respaldo = modeloQueResponde('No debería llamarse.');
    await expect(
      generarRespuestaPaciente(entrada, {
        principal: { id: 'p', modelo: modeloQueFalla(errorApi(401)) },
        respaldo: { id: 'r', modelo: respaldo },
      })
    ).rejects.toMatchObject({ tipo: 'autenticacion' });
    expect(respaldo.doGenerateCalls).toHaveLength(0);
  });

  it('no usa el respaldo si ya no queda tiempo', async () => {
    let reloj = 0;
    const principal = new MockLanguageModelV4({
      doGenerate: async () => {
        reloj += 23_000; // el principal consumió casi todo el presupuesto
        throw errorApi(503);
      },
    });
    const respaldo = modeloQueResponde('No debería llamarse.');
    await expect(
      generarRespuestaPaciente(
        entrada,
        { principal: { id: 'p', modelo: principal }, respaldo: { id: 'r', modelo: respaldo } },
        () => reloj
      )
    ).rejects.toMatchObject({ tipo: 'proveedor' });
    expect(respaldo.doGenerateCalls).toHaveLength(0);
  });

  it('si ambos fallan propaga el error del respaldo', async () => {
    await expect(
      generarRespuestaPaciente(entrada, {
        principal: { id: 'p', modelo: modeloQueFalla(errorApi(503)) },
        respaldo: { id: 'r', modelo: modeloQueFalla(new DOMException('t', 'TimeoutError')) },
      })
    ).rejects.toMatchObject({ tipo: 'tiempo_agotado' });
  });
});
