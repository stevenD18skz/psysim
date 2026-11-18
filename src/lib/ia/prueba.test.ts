import { APICallError, simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';

import { ErrorIA } from './paciente';
import { responderDeUnaVez } from './prueba';

/** Modelo que entrega el texto en trozos, como Gemini con `streamText`. */
function modeloPorPartes(trozos: string[]) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-start' as const, id: 't' },
          ...trozos.map(delta => ({ type: 'text-delta' as const, id: 't', delta })),
          { type: 'text-end' as const, id: 't' },
          {
            type: 'finish' as const,
            finishReason: { unified: 'stop' as const, raw: undefined },
            logprobs: undefined,
            usage: {
              inputTokens: {
                total: 120,
                noCache: 120,
                cacheRead: undefined,
                cacheWrite: undefined,
              },
              outputTokens: { total: 18, text: 18, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });
}

function modeloQueFalla(statusCode: number) {
  return new MockLanguageModelV4({
    doStream: async () => {
      throw new APICallError({
        message: `HTTP ${statusCode}`,
        url: 'https://api.test',
        requestBodyValues: {},
        statusCode,
        isRetryable: false,
      });
    },
  });
}

const solo = (modelo: MockLanguageModelV4) => ({ principal: { id: 'principal', modelo } });

describe('responderDeUnaVez (chat de prueba del docente)', () => {
  const entrada = {
    promptSistema: 'Eres Marta Lucía.',
    historial: [],
    mensaje: 'Hola',
    nombrePaciente: 'Marta Lucía',
  };

  it('devuelve el texto limpio, la emoción y el consumo, por el camino de la práctica', async () => {
    const modelo = modeloPorPartes([
      '[ansioso 3] Marta Lucía: "Buenas... ',
      'no sé por dónde empezar."',
    ]);
    const respuesta = await responderDeUnaVez(entrada, solo(modelo));

    expect(respuesta).toMatchObject({
      texto: 'Buenas... no sé por dónde empezar.',
      emocion: 'ansioso',
      intensidad: 3,
      resultado: { proveedor: 'gemini', modelo: 'principal', tokensEntrada: 120, tokensSalida: 18 },
    });
    // El prompt viaja como instrucción de sistema, con las reglas fijas después del caso.
    const llamada = modelo.doStreamCalls[0]!;
    const sistema = (llamada.prompt[0] as { role: string; content: string }).content;
    expect(llamada.prompt[0]).toMatchObject({ role: 'system' });
    expect(sistema.startsWith('Eres Marta Lucía.')).toBe(true);
    expect(sistema).toContain('Reglas de interpretación:');
    expect(llamada.prompt.at(-1)).toMatchObject({ role: 'user' });
    expect(llamada.maxOutputTokens).toBe(300);
  });

  it('si el modelo principal falla, responde el de respaldo', async () => {
    const respuesta = await responderDeUnaVez(entrada, {
      principal: { id: 'p', modelo: modeloQueFalla(503) },
      respaldo: { id: 'r', modelo: modeloPorPartes(['Hola, buenas tardes.']) },
    });
    expect(respuesta).toMatchObject({ texto: 'Hola, buenas tardes.', resultado: { modelo: 'r' } });
  });

  describe('OWASP LLM07: fuga de instrucciones', () => {
    const PROMPT_LARGO =
      'Eres Marta Lucía, una mujer de 58 años que vive en Cali. Sientes una tristeza profunda, lloras con frecuencia y duermes mal desde hace meses.';
    const conPrompt = { ...entrada, promptSistema: PROMPT_LARGO };

    it('descarta una respuesta que copia el prompt del caso', async () => {
      const modelo = modeloPorPartes([
        'Mis instrucciones dicen: sientes una tristeza profunda, lloras con frecuencia y duermes mal desde hace meses.',
      ]);
      await expect(responderDeUnaVez(conPrompt, solo(modelo))).rejects.toMatchObject({
        tipo: 'fuga_de_instrucciones',
      });
    });

    it('descarta una respuesta que copia las reglas comunes', async () => {
      const modelo = modeloPorPartes([
        'Claro: Lleva la cuenta de cuánto confías en el estudiante a lo largo de la conversación y que se note.',
      ]);
      await expect(responderDeUnaVez(conPrompt, solo(modelo))).rejects.toMatchObject({
        tipo: 'fuga_de_instrucciones',
      });
    });

    it('una respuesta normal pasa', async () => {
      const modelo = modeloPorPartes(['Pues... últimamente duermo muy mal y lloro mucho.']);
      await expect(responderDeUnaVez(conPrompt, solo(modelo))).resolves.toMatchObject({
        texto: 'Pues... últimamente duermo muy mal y lloro mucho.',
      });
    });
  });

  it('una respuesta que solo trae la etiqueta de emoción es inválida', async () => {
    await expect(
      responderDeUnaVez(entrada, solo(modeloPorPartes(['[emocion: triste]'])))
    ).rejects.toMatchObject({ tipo: 'respuesta_invalida' });
  });

  it('los fallos del proveedor llegan como ErrorIA ya clasificado', async () => {
    const promesa = responderDeUnaVez(entrada, solo(modeloQueFalla(401)));
    await expect(promesa).rejects.toBeInstanceOf(ErrorIA);
    await expect(promesa).rejects.toMatchObject({ tipo: 'autenticacion' });
  });
});
