import { describe, expect, it } from 'vitest';

import { crearLectorSse } from '@/lib/sse';

import { interpretarEvento, leerMetricas } from './sse';

describe('crearLectorSse', () => {
  it('separa los eventos completos de un trozo', () => {
    const lector = crearLectorSse();
    expect(
      lector.alimentar(
        'event: chunk\ndata: {"chunk":"Hola"}\n\nevent: done\ndata: {"done":true}\n\n'
      )
    ).toEqual([
      { evento: 'chunk', datos: '{"chunk":"Hola"}' },
      { evento: 'done', datos: '{"done":true}' },
    ]);
    expect(lector.terminar()).toBe(false);
  });

  it('une un evento partido en cualquier punto, carácter a carácter', () => {
    const flujo =
      'event: chunk\ndata: {"chunk":"No sé… es que"}\n\nevent: chunk\ndata: {"chunk":" todo"}\n\n';
    const lector = crearLectorSse();
    const eventos = [...flujo].flatMap(caracter => lector.alimentar(caracter));
    expect(eventos).toEqual([
      { evento: 'chunk', datos: '{"chunk":"No sé… es que"}' },
      { evento: 'chunk', datos: '{"chunk":" todo"}' },
    ]);
  });

  it('acepta finales de línea \\r\\n aunque el corte caiga entre el \\r y el \\n', () => {
    const lector = crearLectorSse();
    expect(lector.alimentar('event: chunk\r\ndata: {"chunk":"a"}\r\n\r')).toEqual([]);
    expect(lector.alimentar('\nevent: chunk\r\n')).toEqual([
      { evento: 'chunk', datos: '{"chunk":"a"}' },
    ]);
  });

  it('ignora comentarios y bloques sin datos, y usa «message» si falta el nombre', () => {
    const lector = crearLectorSse();
    expect(lector.alimentar(': latido\n\nevent: vacio\n\ndata: {"a":1}\n\n')).toEqual([
      { evento: 'message', datos: '{"a":1}' },
    ]);
  });

  it('une varias líneas data y respeta los dos puntos del contenido', () => {
    const lector = crearLectorSse();
    expect(lector.alimentar('data: {"a":\ndata: "b: c"}\n\n')).toEqual([
      { evento: 'message', datos: '{"a":\n"b: c"}' },
    ]);
  });

  it('descarta el evento que quedó cortado al terminar el flujo y lo avisa', () => {
    const lector = crearLectorSse();
    expect(
      lector.alimentar('event: chunk\ndata: {"chunk":"a"}\n\nevent: done\ndata: {"sev')
    ).toEqual([{ evento: 'chunk', datos: '{"chunk":"a"}' }]);
    expect(lector.terminar()).toBe(true);
    // Tras terminar no arrastra restos a un flujo nuevo.
    expect(lector.alimentar('data: {"b":2}\n\n')).toEqual([
      { evento: 'message', datos: '{"b":2}' },
    ]);
  });
});

describe('interpretarEvento', () => {
  it('traduce un fragmento de texto', () => {
    expect(interpretarEvento({ evento: 'chunk', datos: '{"chunk":"Hola"}' })).toEqual({
      tipo: 'fragmento',
      texto: 'Hola',
    });
  });

  it('traduce el fin del turno con severidad, cierre y métricas', () => {
    expect(
      interpretarEvento({
        evento: 'done',
        datos: JSON.stringify({
          done: true,
          severity: 4.5,
          should_close: true,
          closing_kind: 'crisis',
          metrics: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            tokens_input: 900,
            tokens_output: 60,
          },
        }),
      })
    ).toEqual({
      tipo: 'fin',
      severidad: 4.5,
      debeCerrar: true,
      cierre: 'crisis',
      metricas: {
        proveedor: 'openai',
        modelo: 'gpt-4o-mini',
        tokensEntrada: 900,
        tokensSalida: 60,
      },
    });
  });

  it('tolera un fin sin cierre ni métricas y un tipo de cierre desconocido', () => {
    expect(interpretarEvento({ evento: 'done', datos: '{"severity":2}' })).toMatchObject({
      tipo: 'fin',
      debeCerrar: false,
      cierre: null,
      metricas: { proveedor: null, tokensSalida: null },
    });
  });

  // El significado del cierre lo decide `decidirCierre`: aquí solo se transporta el valor. Antes
  // un valor desconocido se volvía `null` y, con `should_close`, terminaba anotado como crisis.
  it.each([
    ['"success"', 'success'],
    ['null', null],
    ['"algo_nuevo"', 'algo_nuevo'],
    ['"  "', null],
  ])('entrega closing_kind %s tal como llegó, sin interpretarlo', (kind, esperado) => {
    expect(
      interpretarEvento({
        evento: 'done',
        datos: `{"done":true,"severity":2,"should_close":true,"closing_kind":${kind}}`,
      })
    ).toMatchObject({ tipo: 'fin', debeCerrar: true, cierre: esperado });
  });

  it('traduce el error y, si no dice que se descartó, asume que no', () => {
    expect(interpretarEvento({ evento: 'error', datos: '{"error":"x","discarded":true}' })).toEqual(
      { tipo: 'error', descartado: true }
    );
    expect(interpretarEvento({ evento: 'error', datos: '{"error":"x"}' })).toEqual({
      tipo: 'error',
      descartado: false,
    });
  });

  it('ignora eventos desconocidos, JSON roto y datos que no son un objeto', () => {
    expect(interpretarEvento({ evento: 'ping', datos: '{}' })).toEqual({ tipo: 'ignorado' });
    expect(interpretarEvento({ evento: 'chunk', datos: '{"chunk":' })).toEqual({
      tipo: 'ignorado',
    });
    expect(interpretarEvento({ evento: 'chunk', datos: '"texto"' })).toEqual({ tipo: 'ignorado' });
    expect(interpretarEvento({ evento: 'chunk', datos: '{"chunk":""}' })).toEqual({
      tipo: 'ignorado',
    });
  });

  // Auditoría, punto 4: `done` significa que el turno ya quedó guardado allá. Si se ignoraba por
  // un campo con otra forma, el flujo parecía cortado, la respuesta se perdía y la práctica
  // pasaba a Gemini con un turno de menos.
  it.each([
    ['severidad en texto', '{"severity":"alta"}'],
    ['severidad nula', '{"severity":null,"should_close":false}'],
    ['sin severidad', '{"done":true}'],
    ['severidad no finita', '{"severity":1e999}'],
  ])('un done con %s sigue siendo el fin del turno, sin severidad nueva', (_, datos) => {
    expect(interpretarEvento({ evento: 'done', datos })).toEqual({
      tipo: 'fin',
      severidad: null,
      debeCerrar: false,
      cierre: null,
      metricas: { proveedor: null, modelo: null, tokensEntrada: null, tokensSalida: null },
    });
  });

  it.each(['"gpt-4o-mini"', '[1,2]', '42', 'null'])(
    'unas métricas con otra forma (%s) no invalidan el fin del turno',
    metrics => {
      expect(
        interpretarEvento({ evento: 'done', datos: `{"severity":2.4,"metrics":${metrics}}` })
      ).toMatchObject({ tipo: 'fin', severidad: 2.4, metricas: { tokensSalida: null } });
    }
  );

  it.each(['"true"', '1', 'null', '"crisis"'])(
    'should_close solo cierra si es exactamente true (%s no cierra)',
    valor => {
      expect(
        interpretarEvento({
          evento: 'done',
          datos: `{"severity":5,"should_close":${valor},"closing_kind":"crisis"}`,
        })
      ).toMatchObject({ tipo: 'fin', debeCerrar: false });
    }
  );

  it('un closing_kind que no es texto se lee como «sin motivo»', () => {
    expect(
      interpretarEvento({
        evento: 'done',
        datos: '{"severity":2,"should_close":true,"closing_kind":7}',
      })
    ).toMatchObject({ tipo: 'fin', debeCerrar: true, cierre: null });
  });
});

describe('leerMetricas', () => {
  it('si solo llega el total de tokens, lo anota como salida', () => {
    expect(leerMetricas({ tokens_used: 312, ai_provider: 'groq' })).toEqual({
      proveedor: 'groq',
      modelo: null,
      tokensEntrada: null,
      tokensSalida: 312,
    });
  });

  it('descarta valores que no son números válidos', () => {
    expect(leerMetricas({ tokens_input: -5, tokens_output: 'muchos', model: '  ' })).toEqual({
      proveedor: null,
      modelo: null,
      tokensEntrada: null,
      tokensSalida: null,
    });
    expect(leerMetricas(null).tokensSalida).toBeNull();
  });
});
