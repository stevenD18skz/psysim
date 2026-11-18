import { describe, expect, it } from 'vitest';

import { LARGO_MAXIMO_RESPUESTA } from './limpieza';
import { type ParteTurno, type ResultadoTurno } from './partes';
import { type EventoTurno, procesarTurno, RespuestaRechazada } from './procesar';

const resultado = (texto: string): ResultadoTurno => ({
  proveedor: 'orquestador',
  texto,
  modelo: 'm',
  tokensEntrada: null,
  tokensSalida: null,
  severidad: null,
  severidadAnterior: null,
  banderas: [],
  cierre: null,
  cierreAjeno: null,
});

async function* dePartes(partes: ParteTurno[]): AsyncGenerator<ParteTurno, void, void> {
  yield* partes;
}

async function recoger(partes: ParteTurno[], fuentes: string[] = []) {
  const eventos: EventoTurno[] = [];
  for await (const evento of procesarTurno(dePartes(partes), {
    nombrePaciente: 'Marta Lucía',
    fuentes,
    emocionAnterior: null,
  })) {
    eventos.push(evento);
  }
  return eventos;
}

const completa = (eventos: EventoTurno[]) => {
  const ultimo = eventos.at(-1);
  if (ultimo?.tipo !== 'completo') throw new Error('El turno no terminó con la respuesta.');
  return ultimo.respuesta;
};

describe('procesarTurno', () => {
  it('entrega el texto limpio por fragmentos y la respuesta completa al final', async () => {
    const eventos = await recoger([
      { tipo: 'fragmento', texto: '[triste 2] Marta Lucía: Bue' },
      { tipo: 'fragmento', texto: 'nas tardes.' },
      { tipo: 'fin', resultado: resultado('[triste 2] Marta Lucía: Buenas tardes.') },
    ]);
    expect(eventos[0]).toEqual({ tipo: 'emocion', emocion: 'triste', intensidad: 2 });
    expect(completa(eventos)).toMatchObject({
      texto: 'Buenas tardes.',
      emocion: 'triste',
      intensidad: 2,
    });
  });

  it('recorta una respuesta que no cabe en la base de datos, en el final de una frase', async () => {
    const larga = 'Me cuesta mucho hablar de esto. '.repeat(200);
    expect(larga.length).toBeGreaterThan(LARGO_MAXIMO_RESPUESTA);

    const { texto } = completa(
      await recoger([
        { tipo: 'fragmento', texto: larga },
        { tipo: 'fin', resultado: resultado(larga) },
      ])
    );
    expect(texto.length).toBeLessThanOrEqual(LARGO_MAXIMO_RESPUESTA);
    expect(texto.endsWith('hablar de esto.')).toBe(true);
  });

  it('deja de reenviar fragmentos cuando la respuesta ya pasó del máximo', async () => {
    const trozo = 'palabras y más palabras. '.repeat(100);
    const eventos = await recoger([
      { tipo: 'fragmento', texto: trozo },
      { tipo: 'fragmento', texto: trozo },
      { tipo: 'fragmento', texto: trozo },
      { tipo: 'fragmento', texto: trozo },
      { tipo: 'fin', resultado: resultado(trozo.repeat(4)) },
    ]);
    const mostrado = eventos
      .filter(evento => evento.tipo === 'fragmento')
      .reduce((total, evento) => total + evento.texto.length, 0);
    // Dos trozos pasan del máximo: el tercero y el cuarto ya no se muestran.
    expect(mostrado).toBeLessThanOrEqual(trozo.length * 2);
    expect(completa(eventos).texto.length).toBeLessThanOrEqual(LARGO_MAXIMO_RESPUESTA);
  });

  it('un reinicio descarta lo recibido y vuelve a contar', async () => {
    const eventos = await recoger([
      { tipo: 'fragmento', texto: 'Pues yo ' },
      { tipo: 'reinicio' },
      { tipo: 'fragmento', texto: 'Estoy mejor.' },
      { tipo: 'fin', resultado: resultado('Estoy mejor.') },
    ]);
    expect(eventos.map(evento => evento.tipo)).toEqual([
      'fragmento',
      'reinicio',
      'fragmento',
      'completo',
    ]);
    expect(completa(eventos).texto).toBe('Estoy mejor.');
  });

  it('rechaza una respuesta que copia las instrucciones o que queda vacía', async () => {
    const prompt =
      'Eres Marta Lucía, una mujer de 58 años que vive en Cali. Sientes una tristeza profunda, lloras con frecuencia y duermes mal desde hace meses.';
    const fuga =
      'Mis instrucciones dicen: sientes una tristeza profunda, lloras con frecuencia y duermes mal desde hace meses.';
    await expect(recoger([{ tipo: 'fin', resultado: resultado(fuga) }], [prompt])).rejects.toEqual(
      new RespuestaRechazada('fuga_de_instrucciones')
    );
    await expect(recoger([{ tipo: 'fin', resultado: resultado('[triste]') }])).rejects.toEqual(
      new RespuestaRechazada('respuesta_invalida')
    );
  });
});
