import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ParteTurno } from '@/lib/ia/partes';

import { type ClienteOrquestador } from './cliente';
import { type CuentaOrquestador } from './cuentas';
import { registrarEvento, reservarTurno } from './datos';
import { ErrorOrquestador } from './errores';
import { type EventoOrquestador, type MensajeOrquestador } from './tipos';
import {
  conciliar,
  conversarConOrquestador,
  crearPlazo,
  MINIMO_PARA_TURNO_MS,
  PLAZO_PETICION_MS,
  RESERVA_RESPALDO_MS,
  RETROCESO_LIMITE_MS,
} from './turno';

vi.mock('./datos', () => ({ reservarTurno: vi.fn(), registrarEvento: vi.fn() }));

const CUENTA: CuentaOrquestador = {
  correo: 'grupo1@psysim.test',
  contrasena: 'secreta-1',
  clave: '00000000000000aa',
  esDocente: false,
};
const SESION = '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60';
const SESION_ORQUESTADOR = '9d2f0b7e-1c11-4b8e-9d50-0a1b2c3d4e5f';
const MENSAJE = '¿Cómo se ha sentido esta semana?';

const fin = (severidad = 3, extra: Partial<Extract<EventoOrquestador, { tipo: 'fin' }>> = {}) =>
  ({
    tipo: 'fin',
    severidad,
    debeCerrar: false,
    cierre: null,
    metricas: { proveedor: 'groq', modelo: 'llama-x', tokensEntrada: 800, tokensSalida: 40 },
    ...extra,
  }) satisfies EventoOrquestador;

const texto = (...trozos: string[]): EventoOrquestador[] =>
  trozos.map(trozo => ({ tipo: 'fragmento', texto: trozo }));

let ids = 0;
const mensaje = (
  role: 'trainee' | 'patient',
  content: string,
  extra: Partial<MensajeOrquestador> = {}
): MensajeOrquestador => ({
  id: `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`,
  role,
  content,
  severity: 3,
  risk_flags: [],
  ...extra,
});

/** Cliente falso: cada llamada a `conversar` consume el siguiente intento de la lista. */
function clienteFalso(
  intentos: (EventoOrquestador[] | ErrorOrquestador)[],
  opciones: { historial?: MensajeOrquestador[]; estado?: string } = {}
) {
  const cola = [...intentos];
  const conversar = vi.fn(async function* () {
    const intento = cola.shift();
    if (!intento) throw new Error('No se esperaba otra llamada al orquestador.');
    if (intento instanceof ErrorOrquestador) throw intento;
    yield* intento;
  });
  const historial = vi.fn(async () => opciones.historial ?? []);
  const sesion = vi.fn(async () => ({
    id: SESION_ORQUESTADOR,
    status: opciones.estado ?? 'active',
    current_severity: 3,
  }));
  return {
    cliente: { conversar, historial, sesion } as unknown as ClienteOrquestador,
    conversar,
    historial,
    sesion,
  };
}

/** Plazo con un reloj que avanza solo cuando el turno «espera». */
function plazoFalso(totalMs = PLAZO_PETICION_MS) {
  let reloj = 0;
  const esperar = vi.fn(async (ms: number) => {
    reloj += ms;
  });
  return {
    plazo: crearPlazo(totalMs, () => reloj),
    esperar,
    avanzar: (ms: number) => (reloj += ms),
  };
}

async function recoger(
  generador: AsyncGenerator<ParteTurno>
): Promise<{ partes: ParteTurno[]; error: ErrorOrquestador | null }> {
  const partes: ParteTurno[] = [];
  try {
    for await (const parte of generador) partes.push(parte);
    return { partes, error: null };
  } catch (error) {
    if (!(error instanceof ErrorOrquestador)) throw error;
    return { partes, error };
  }
}

function conversar(
  cliente: ClienteOrquestador,
  extra: Partial<Parameters<typeof conversarConOrquestador>[0]> = {}
) {
  const { plazo, esperar } = plazoFalso();
  return recoger(
    conversarConOrquestador({
      sesionId: SESION,
      cuenta: CUENTA,
      sesionOrquestador: SESION_ORQUESTADOR,
      mensaje: MENSAJE,
      reintento: false,
      intercambios: 0,
      severidadAnterior: 2,
      plazo,
      esperar,
      cliente,
      ...extra,
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(reservarTurno).mockResolvedValue(0);
  vi.mocked(registrarEvento).mockResolvedValue(undefined);
});

describe('conciliar (historial del orquestador contra el de PsySim)', () => {
  const previo = [mensaje('trainee', 'Hola'), mensaje('patient', 'Buenas')];

  it('si allá hay tantos mensajes del estudiante como intercambios guardados, está limpio', () => {
    expect(conciliar([], 0, MENSAJE)).toEqual({ estado: 'limpio' });
    expect(conciliar(previo, 1, MENSAJE)).toEqual({ estado: 'limpio' });
  });

  it('un intercambio de más con este mismo mensaje ya respondido es el turno perdido', () => {
    const respuesta = mensaje('patient', 'Más o menos.');
    const historial = [...previo, mensaje('trainee', ` ${MENSAJE} `), respuesta];
    expect(conciliar(historial, 1, MENSAJE)).toEqual({ estado: 'guardado', respuesta });
  });

  it('cuenta los mensajes del estudiante: un saludo inicial del paciente no desfasa', () => {
    const saludo = mensaje('patient', 'Buenas tardes, doctor.');
    expect(conciliar([saludo], 0, MENSAJE)).toEqual({ estado: 'limpio' });
  });

  it.each([
    [
      'el mensaje de más es otro',
      [...previo, mensaje('trainee', 'Otra cosa'), mensaje('patient', 'x')],
    ],
    ['el mensaje quedó sin respuesta', [...previo, mensaje('trainee', MENSAJE)]],
    [
      'la respuesta quedó vacía',
      [...previo, mensaje('trainee', MENSAJE), mensaje('patient', '  ')],
    ],
    ['allá faltan intercambios', []],
  ])('si %s, los historiales ya no coinciden', (_, historial) => {
    expect(conciliar(historial, 1, MENSAJE)).toEqual({ estado: 'inconsistente' });
  });
});

describe('conversarConOrquestador', () => {
  it('entrega los fragmentos y termina con el resultado y la severidad del turno', async () => {
    const { cliente, conversar: llamada } = clienteFalso([
      [...texto('[triste 2] Más o ', 'menos.'), fin(3.5)],
    ]);
    const { partes, error } = await conversar(cliente);

    expect(error).toBeNull();
    expect(partes).toEqual([
      { tipo: 'fragmento', texto: '[triste 2] Más o ' },
      { tipo: 'fragmento', texto: 'menos.' },
      {
        tipo: 'fin',
        resultado: {
          proveedor: 'orquestador',
          texto: '[triste 2] Más o menos.',
          modelo: 'llama-x',
          tokensEntrada: 800,
          tokensSalida: 40,
          severidad: 3.5,
          severidadAnterior: 2,
          banderas: [],
          cierre: null,
        },
      },
    ]);
    // Antes de llamar reservó un cupo de esa cuenta en el turnero.
    expect(reservarTurno).toHaveBeenCalledWith(CUENTA.clave);
    expect(llamada).toHaveBeenCalledWith(CUENTA, SESION_ORQUESTADOR, MENSAJE, expect.any(Object));
  });

  it.each([
    ['crisis', 'crisis'],
    ['inappropriate', 'inapropiada'],
    // Si cierra sin decir por qué, se anota como crisis.
    [null, 'crisis'],
  ] as const)(
    'con should_close y closing_kind %s cierra la práctica (%s)',
    async (kind, motivo) => {
      const { cliente } = clienteFalso([
        [...texto('No puedo más.'), fin(5, { debeCerrar: true, cierre: kind })],
      ]);
      const { partes } = await conversar(cliente);
      expect(partes.at(-1)).toMatchObject({ tipo: 'fin', resultado: { cierre: motivo } });
    }
  );

  it('closing_kind sin should_close no cierra nada', async () => {
    const { cliente } = clienteFalso([[...texto('Bien.'), fin(2, { cierre: 'success' })]]);
    const { partes } = await conversar(cliente);
    expect(partes.at(-1)).toMatchObject({ resultado: { cierre: null } });
  });

  describe('turnero y límite de mensajes por minuto', () => {
    it('sin cupo espera lo que diga el turnero, avisa y después conversa', async () => {
      vi.mocked(reservarTurno).mockResolvedValueOnce(7_300).mockResolvedValueOnce(0);
      const { cliente } = clienteFalso([[...texto('Hola.'), fin()]]);
      const { plazo, esperar } = plazoFalso();
      const { partes, error } = await conversar(cliente, { plazo, esperar });

      expect(error).toBeNull();
      expect(partes[0]).toEqual({ tipo: 'espera', segundos: 8 });
      expect(esperar).toHaveBeenCalledOnce();
      expect(esperar.mock.calls[0]![0]).toBeGreaterThanOrEqual(7_300);
      expect(registrarEvento).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'espera', detalle: 'turnero', esperaMs: 7_300 })
      );
    });

    it('si la espera no cabe en la petición, no llama y pide reintentar (limite con segundos)', async () => {
      vi.mocked(reservarTurno).mockResolvedValue(40_000);
      const { cliente, conversar: llamada } = clienteFalso([]);
      const { partes, error } = await conversar(cliente);

      expect(partes).toEqual([]);
      expect(error).toMatchObject({ tipo: 'limite', esperaS: 40 });
      expect(llamada).not.toHaveBeenCalled();
    });

    it('espera en el borde: cabe justo antes de la reserva para el respaldo', async () => {
      const margen = PLAZO_PETICION_MS - RESERVA_RESPALDO_MS - MINIMO_PARA_TURNO_MS;
      vi.mocked(reservarTurno).mockResolvedValueOnce(margen).mockResolvedValueOnce(0);
      const { cliente } = clienteFalso([[...texto('Hola.'), fin()]]);
      expect((await conversar(cliente)).error).toBeNull();

      vi.mocked(reservarTurno)
        .mockReset()
        .mockResolvedValue(margen + 1);
      expect((await conversar(clienteFalso([]).cliente)).error).toMatchObject({ tipo: 'limite' });
    });

    it('un 429 real se espera (Retry-After) y se reintenta: nunca es un fallo del servicio', async () => {
      const { cliente, conversar: llamada } = clienteFalso([
        new ErrorOrquestador('limite', { estado: 429, esperaS: 6 }),
        [...texto('Ya.'), fin()],
      ]);
      const { plazo, esperar } = plazoFalso();
      const { partes, error } = await conversar(cliente, { plazo, esperar });

      expect(error).toBeNull();
      expect(partes[0]).toEqual({ tipo: 'espera', segundos: 6 });
      expect(esperar.mock.calls[0]![0]).toBeGreaterThanOrEqual(6_000);
      expect(llamada).toHaveBeenCalledTimes(2);
      expect(registrarEvento).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'limite', detalle: 'orquestador' })
      );
    });

    it('un 429 sin Retry-After usa un retroceso corto', async () => {
      const { cliente } = clienteFalso([
        new ErrorOrquestador('limite', { estado: 429 }),
        [...texto('Ya.'), fin()],
      ]);
      const { plazo, esperar } = plazoFalso();
      await conversar(cliente, { plazo, esperar });
      expect(esperar.mock.calls[0]![0]).toBeGreaterThanOrEqual(RETROCESO_LIMITE_MS);
    });

    it('si el 429 se repite hasta agotar el tiempo, termina como límite (no pasa a Gemini)', async () => {
      const { cliente } = clienteFalso(
        Array.from(
          { length: 10 },
          () => new ErrorOrquestador('limite', { estado: 429, esperaS: 9 })
        )
      );
      const { error } = await conversar(cliente);
      expect(error).toMatchObject({ tipo: 'limite', esperaS: 9 });
    });
  });

  describe('fallos y reintentos', () => {
    it('un 502 (turno descartado) se reintenta una vez sin mirar el historial', async () => {
      const { cliente, historial } = clienteFalso([
        new ErrorOrquestador('servidor', { estado: 502 }),
        [...texto('Ahora sí.'), fin()],
      ]);
      const { partes, error } = await conversar(cliente);

      expect(error).toBeNull();
      expect(partes.at(-1)).toMatchObject({ tipo: 'fin', resultado: { texto: 'Ahora sí.' } });
      expect(historial).not.toHaveBeenCalled();
      expect(registrarEvento).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'error', detalle: 'servidor' })
      );
    });

    it('un 502 que se repite deja de reintentar: lo decide quien llama (Gemini)', async () => {
      const { cliente, conversar: llamada } = clienteFalso([
        new ErrorOrquestador('servidor', { estado: 502 }),
        new ErrorOrquestador('servidor', { estado: 502 }),
      ]);
      const { error } = await conversar(cliente);
      expect(error).toMatchObject({ tipo: 'servidor', estado: 502 });
      expect(llamada).toHaveBeenCalledTimes(2);
    });

    it('error con discarded: true a mitad del texto: avisa el reinicio y reintenta', async () => {
      const { cliente, historial } = clienteFalso([
        [...texto('Pues yo '), { tipo: 'error', descartado: true }],
        [...texto('Pues yo estoy mejor.'), fin()],
      ]);
      const { partes } = await conversar(cliente);

      expect(partes.map(parte => parte.tipo)).toEqual([
        'fragmento',
        'reinicio',
        'fragmento',
        'fin',
      ]);
      expect(historial).not.toHaveBeenCalled();
    });

    it('error con discarded: false: lee el historial y, si el turno no quedó, lo reenvía', async () => {
      const {
        cliente,
        historial,
        conversar: llamada,
      } = clienteFalso([[{ tipo: 'error', descartado: false }], [...texto('Aquí estoy.'), fin()]], {
        historial: [],
      });
      const { partes, error } = await conversar(cliente);

      expect(error).toBeNull();
      expect(historial).toHaveBeenCalledWith(CUENTA, SESION_ORQUESTADOR);
      expect(llamada).toHaveBeenCalledTimes(2);
      expect(partes.at(-1)).toMatchObject({ resultado: { texto: 'Aquí estoy.' } });
    });

    it('error con discarded: false y el turno guardado allá: lo aprovecha sin duplicarlo', async () => {
      const guardada = mensaje('patient', '[ansioso 2] Regular.', {
        severity: 4,
        risk_flags: ['risk'],
        ai_provider: 'groq',
        tokens_used: 950,
      });
      const { cliente, conversar: llamada } = clienteFalso(
        [[{ tipo: 'error', descartado: false }]],
        {
          historial: [mensaje('trainee', MENSAJE), guardada],
        }
      );
      const { partes, error } = await conversar(cliente);

      expect(error).toBeNull();
      expect(llamada).toHaveBeenCalledOnce();
      expect(partes).toEqual([
        { tipo: 'fragmento', texto: '[ansioso 2] Regular.' },
        {
          tipo: 'fin',
          resultado: expect.objectContaining({
            texto: '[ansioso 2] Regular.',
            severidad: 4,
            banderas: ['risk'],
            modelo: 'groq',
            tokensSalida: 950,
            cierre: null,
          }),
        },
      ]);
    });

    it('si los historiales ya no coinciden, falla como descarte incierto', async () => {
      const { cliente } = clienteFalso([[{ tipo: 'error', descartado: false }]], {
        historial: [mensaje('trainee', 'Otra cosa'), mensaje('patient', 'x')],
      });
      expect((await conversar(cliente)).error).toMatchObject({ tipo: 'descarte_incierto' });
    });

    it('un flujo que se corta sin `done` no se reintenta a ciegas', async () => {
      const { cliente, conversar: llamada } = clienteFalso([texto('Pues ')]);
      const { partes, error } = await conversar(cliente);

      expect(error).toMatchObject({ tipo: 'red' });
      expect(partes.map(parte => parte.tipo)).toEqual(['fragmento', 'reinicio']);
      expect(llamada).toHaveBeenCalledOnce();
    });

    it.each(['permiso', 'no_encontrado', 'datos', 'autenticacion', 'tiempo_agotado'] as const)(
      'un fallo %s no se reintenta',
      async tipo => {
        const { cliente, conversar: llamada } = clienteFalso([new ErrorOrquestador(tipo)]);
        expect((await conversar(cliente)).error).toMatchObject({ tipo });
        expect(llamada).toHaveBeenCalledOnce();
      }
    );

    it('sin tiempo para que el orquestador responda, no lo llama', async () => {
      const { cliente, conversar: llamada } = clienteFalso([]);
      const { plazo, esperar, avanzar } = plazoFalso();
      avanzar(PLAZO_PETICION_MS - RESERVA_RESPALDO_MS - 500);
      const { error } = await conversar(cliente, { plazo, esperar });

      expect(error).toMatchObject({ tipo: 'tiempo_agotado' });
      expect(llamada).not.toHaveBeenCalled();
    });
  });

  describe('reintento del navegador', () => {
    it('si el turno quedó guardado allá, lo entrega sin volver a conversar', async () => {
      const { cliente, conversar: llamada } = clienteFalso([], {
        historial: [mensaje('trainee', MENSAJE), mensaje('patient', 'Regular.', { severity: 3 })],
      });
      const { partes, error } = await conversar(cliente, { reintento: true });

      expect(error).toBeNull();
      expect(llamada).not.toHaveBeenCalled();
      expect(reservarTurno).not.toHaveBeenCalled();
      expect(partes.at(-1)).toMatchObject({ resultado: { texto: 'Regular.', severidad: 3 } });
    });

    it('si allá no quedó nada, conversa normalmente', async () => {
      const { cliente, conversar: llamada } = clienteFalso([[...texto('Hola.'), fin()]]);
      const { error } = await conversar(cliente, { reintento: true });
      expect(error).toBeNull();
      expect(llamada).toHaveBeenCalledOnce();
    });

    it.each([
      [['abuse'], 'inapropiada'],
      [['risk'], 'crisis'],
    ])(
      'un turno recuperado que cerró la sesión allá conserva el motivo (%s → %s)',
      async (banderas, motivo) => {
        const { cliente } = clienteFalso([], {
          estado: 'terminated',
          historial: [
            mensaje('trainee', MENSAJE),
            mensaje('patient', 'Me voy.', { risk_flags: banderas }),
          ],
        });
        const { partes } = await conversar(cliente, { reintento: true });
        expect(partes.at(-1)).toMatchObject({ resultado: { cierre: motivo } });
      }
    );
  });
});

describe('crearPlazo', () => {
  it('cuenta el tiempo que le queda a la petición', () => {
    let reloj = 100;
    const plazo = crearPlazo(1_000, () => reloj);
    expect(plazo.restanteMs()).toBe(1_000);
    reloj = 700;
    expect(plazo.restanteMs()).toBe(400);
  });

  it('el plazo de la petición deja sitio al turno y al respaldo', () => {
    expect(PLAZO_PETICION_MS).toBeLessThan(60_000);
    expect(PLAZO_PETICION_MS - RESERVA_RESPALDO_MS).toBeGreaterThanOrEqual(MINIMO_PARA_TURNO_MS);
  });
});
