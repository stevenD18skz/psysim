import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProveedorIa } from '@/lib/env/orquestador';
import { type CuentaOrquestador } from '@/lib/orquestador/cuentas';
import { fijarGemini, type SesionIa } from '@/lib/orquestador/datos';
import { ErrorOrquestador } from '@/lib/orquestador/errores';
import { olvidarSesionOrquestador, prepararPractica } from '@/lib/orquestador/practica';
import type * as ModuloTurno from '@/lib/orquestador/turno';
import { conversarConOrquestador, crearPlazo } from '@/lib/orquestador/turno';

import type * as ModuloPaciente from './paciente';
import { ErrorIA, transmitirRespuestaPaciente } from './paciente';
import { type ParteTurno, type ResultadoTurno } from './partes';
import { type EventoTurno } from './procesar';
import { transmitirTurno, type TurnoPaciente } from './turno';

vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/env/orquestador', () => ({ getProveedorIa: vi.fn() }));
vi.mock('@/lib/orquestador/datos', () => ({ fijarGemini: vi.fn() }));
vi.mock('@/lib/orquestador/practica', () => ({
  prepararPractica: vi.fn(),
  olvidarSesionOrquestador: vi.fn(),
}));
vi.mock('@/lib/orquestador/turno', async importOriginal => ({
  ...(await importOriginal<typeof ModuloTurno>()),
  conversarConOrquestador: vi.fn(),
}));
vi.mock('./paciente', async importOriginal => ({
  ...(await importOriginal<typeof ModuloPaciente>()),
  transmitirRespuestaPaciente: vi.fn(),
}));

const SESION = '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60';
const ESCENARIO = '0f8fad5b-d9cb-469f-a165-70867728950e';
const SESION_ORQUESTADOR = '9d2f0b7e-1c11-4b8e-9d50-0a1b2c3d4e5f';
const PROMPT =
  'Eres Marta Lucía, tienes 58 años y enviudaste hace cuatro meses. Te cuesta dormir desde entonces.';
const CUENTA: CuentaOrquestador = {
  correo: 'grupo1@psysim.test',
  contrasena: 'secreta-1',
  clave: '00000000000000aa',
  esDocente: false,
};

const resultado = (extra: Partial<ResultadoTurno> = {}): ResultadoTurno => ({
  proveedor: 'orquestador',
  texto: '[triste 2] No he dormido bien.',
  modelo: 'llama-x',
  tokensEntrada: 800,
  tokensSalida: 40,
  severidad: 3,
  severidadAnterior: 3,
  banderas: [],
  cierre: null,
  ...extra,
});

const deGemini = resultado({
  proveedor: 'gemini',
  texto: '[ansioso 1] Pues… ahí voy.',
  modelo: 'gemini-3.5-flash',
  severidad: null,
  severidadAnterior: null,
});

/** Lo que entrega un proveedor simulado: sus partes o el error con el que falla. */
function partes(...lista: (ParteTurno | Error)[]) {
  return async function* () {
    for (const parte of lista) {
      if (parte instanceof Error) throw parte;
      yield parte;
    }
  };
}

const delOrquestador = (...lista: (ParteTurno | Error)[]) =>
  vi.mocked(conversarConOrquestador).mockImplementationOnce(partes(...lista));

const sesionIa = (extra: Partial<SesionIa> = {}): SesionIa => ({
  proveedor: 'orquestador',
  cuenta: CUENTA.clave,
  sesionOrquestador: SESION_ORQUESTADOR,
  severidad: 3,
  cierreMotivo: null,
  cerradaEnOrquestador: false,
  ...extra,
});

const turno = (extra: Partial<TurnoPaciente> = {}): TurnoPaciente => ({
  peticion: 'peticion-1',
  sesionId: SESION,
  escenarioId: ESCENARIO,
  promptSistema: PROMPT,
  nombrePaciente: 'Marta Lucía',
  historial: [],
  mensaje: '¿Cómo ha dormido?',
  reintento: false,
  intercambios: 0,
  hayDescartados: false,
  emocionAnterior: null,
  sesionIa: null,
  plazo: crearPlazo(),
  ...extra,
});

async function recoger(
  entrada: TurnoPaciente
): Promise<{ eventos: EventoTurno[]; error: ErrorIA | null }> {
  const eventos: EventoTurno[] = [];
  try {
    for await (const evento of transmitirTurno(entrada)) eventos.push(evento);
    return { eventos, error: null };
  } catch (error) {
    if (!(error instanceof ErrorIA)) throw error;
    return { eventos, error };
  }
}

const completa = (eventos: EventoTurno[]) => {
  const ultimo = eventos.at(-1);
  return ultimo?.tipo === 'completo' ? ultimo.respuesta : null;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProveedorIa).mockReturnValue('orquestador');
  vi.mocked(fijarGemini).mockResolvedValue(undefined);
  vi.mocked(olvidarSesionOrquestador).mockResolvedValue(undefined);
  vi.mocked(prepararPractica).mockResolvedValue({
    estado: 'lista',
    cuenta: CUENTA,
    sesionOrquestador: SESION_ORQUESTADOR,
    severidad: 3,
  });
  vi.mocked(transmitirRespuestaPaciente).mockImplementation(
    partes(
      { tipo: 'fragmento', texto: '[ansioso 1] Pues… ' },
      { tipo: 'fragmento', texto: 'ahí voy.' },
      { tipo: 'fin', resultado: deGemini }
    )
  );
});

describe('transmitirTurno con el orquestador', () => {
  it('responde el orquestador: texto limpio, emoción de la etiqueta y su severidad', async () => {
    delOrquestador(
      { tipo: 'fragmento', texto: '[triste 2] No he ' },
      { tipo: 'fragmento', texto: 'dormido bien.' },
      { tipo: 'fin', resultado: resultado() }
    );
    const { eventos, error } = await recoger(turno({ sesionIa: sesionIa() }));

    expect(error).toBeNull();
    expect(eventos.slice(0, -1)).toEqual([
      { tipo: 'emocion', emocion: 'triste', intensidad: 2 },
      // El espacio final de un fragmento viaja con el siguiente (el texto se entrega recortado).
      { tipo: 'fragmento', texto: 'No he' },
      { tipo: 'fragmento', texto: ' dormido bien.' },
    ]);
    expect(completa(eventos)).toMatchObject({
      texto: 'No he dormido bien.',
      emocion: 'triste',
      intensidad: 2,
      emocionDeducida: false,
      resultado: { proveedor: 'orquestador', severidad: 3 },
    });
    expect(prepararPractica).toHaveBeenCalledWith(
      expect.objectContaining({ sesionId: SESION, escenarioId: ESCENARIO, prompt: PROMPT })
    );
    expect(conversarConOrquestador).toHaveBeenCalledWith(
      expect.objectContaining({
        cuenta: CUENTA,
        sesionOrquestador: SESION_ORQUESTADOR,
        mensaje: '¿Cómo ha dormido?',
        severidadAnterior: 3,
      })
    );
    expect(transmitirRespuestaPaciente).not.toHaveBeenCalled();
    expect(fijarGemini).not.toHaveBeenCalled();
  });

  it('si el modelo no escribe la etiqueta, la emoción se deduce de la severidad', async () => {
    delOrquestador(
      { tipo: 'fragmento', texto: 'Ya no puedo con esto.' },
      {
        tipo: 'fin',
        resultado: resultado({ texto: 'Ya no puedo con esto.', severidad: 4.5 }),
      }
    );
    const { eventos } = await recoger(turno());
    expect(completa(eventos)).toMatchObject({
      emocion: 'abrumado',
      intensidad: 3,
      emocionDeducida: true,
    });
  });

  it('la severidad alta sube un punto la intensidad de la etiqueta', async () => {
    delOrquestador({ tipo: 'fin', resultado: resultado({ severidad: 4 }) });
    expect(completa((await recoger(turno())).eventos)).toMatchObject({
      emocion: 'triste',
      intensidad: 3,
    });
  });

  it('reenvía la espera del turnero y el cierre que decida el orquestador', async () => {
    delOrquestador(
      { tipo: 'espera', segundos: 8 },
      { tipo: 'fin', resultado: resultado({ severidad: 5, cierre: 'crisis' }) }
    );
    const { eventos } = await recoger(turno());
    expect(eventos[0]).toEqual({ tipo: 'espera', segundos: 8 });
    expect(completa(eventos)?.resultado.cierre).toBe('crisis');
  });

  describe('lo que nunca activa Gemini', () => {
    it('el límite de mensajes: se le pide al estudiante esperar', async () => {
      delOrquestador(new ErrorOrquestador('limite', { estado: 429, esperaS: 14 }));
      const { error } = await recoger(turno());

      expect(error).toMatchObject({ tipo: 'espera_del_paciente', esperaS: 14 });
      expect(transmitirRespuestaPaciente).not.toHaveBeenCalled();
      expect(fijarGemini).not.toHaveBeenCalled();
    });

    it('el tope de prácticas simultáneas', async () => {
      vi.mocked(prepararPractica).mockResolvedValue({ estado: 'sin_cupo', enCurso: 8 });
      const { error } = await recoger(turno());

      expect(error).toMatchObject({ tipo: 'consultorio_ocupado', enCurso: 8 });
      expect(conversarConOrquestador).not.toHaveBeenCalled();
      expect(transmitirRespuestaPaciente).not.toHaveBeenCalled();
    });

    it.each(['datos', 'permiso'] as const)(
      'un rechazo por %s (400, 403, 422): es un error de PsySim y se ve como tal',
      async tipo => {
        delOrquestador(new ErrorOrquestador(tipo, { estado: 422 }));
        const { error } = await recoger(turno());

        expect(error).toMatchObject({ tipo: 'proveedor' });
        expect(transmitirRespuestaPaciente).not.toHaveBeenCalled();
        expect(fijarGemini).not.toHaveBeenCalled();
      }
    );
  });

  describe('Gemini como respaldo', () => {
    it.each(['red', 'tiempo_agotado', 'servidor', 'descarte_incierto', 'autenticacion'] as const)(
      'ante un fallo %s responde Gemini y la práctica queda fija en Gemini',
      async tipo => {
        delOrquestador(new ErrorOrquestador(tipo));
        const { eventos, error } = await recoger(turno({ sesionIa: sesionIa() }));

        expect(error).toBeNull();
        expect(completa(eventos)).toMatchObject({
          texto: 'Pues… ahí voy.',
          emocion: 'ansioso',
          resultado: { proveedor: 'gemini', severidad: null },
        });
        expect(fijarGemini).toHaveBeenCalledWith(SESION, tipo);
      }
    );

    it('lo que el orquestador alcanzó a decir se descarta antes de que responda Gemini', async () => {
      delOrquestador(
        { tipo: 'fragmento', texto: 'Texto a medias ' },
        { tipo: 'reinicio' },
        new ErrorOrquestador('red')
      );
      const { eventos } = await recoger(turno());

      expect(eventos.map(evento => evento.tipo)).toEqual([
        'fragmento',
        'reinicio',
        'emocion',
        'fragmento',
        'fragmento',
        'completo',
      ]);
      // El texto final es solo el de Gemini.
      expect(completa(eventos)?.texto).toBe('Pues… ahí voy.');
    });

    it('si el orquestador falla al preparar la práctica, también responde Gemini', async () => {
      vi.mocked(prepararPractica).mockRejectedValue(new ErrorOrquestador('red'));
      const { eventos } = await recoger(turno());

      expect(completa(eventos)?.resultado.proveedor).toBe('gemini');
      expect(fijarGemini).toHaveBeenCalledWith(SESION, 'red');
      expect(conversarConOrquestador).not.toHaveBeenCalled();
    });

    it('si falla la base de PsySim al prepararla, este turno lo responde Gemini sin fijar nada', async () => {
      vi.mocked(prepararPractica).mockRejectedValue(new Error('No pudimos asignar una cuenta.'));
      const { eventos } = await recoger(turno());

      expect(completa(eventos)?.resultado.proveedor).toBe('gemini');
      expect(fijarGemini).not.toHaveBeenCalled();
    });

    it('una práctica fijada a Gemini sigue en Gemini aunque el orquestador vuelva', async () => {
      const { eventos } = await recoger(turno({ sesionIa: sesionIa({ proveedor: 'gemini' }) }));

      expect(completa(eventos)?.resultado.proveedor).toBe('gemini');
      expect(prepararPractica).not.toHaveBeenCalled();
      expect(conversarConOrquestador).not.toHaveBeenCalled();
    });

    it('Gemini recibe el historial que guardó PsySim y el tiempo que queda', async () => {
      delOrquestador(new ErrorOrquestador('servidor'));
      const historial = [
        { rol: 'user' as const, contenido: 'Hola' },
        { rol: 'assistant' as const, contenido: 'Buenas' },
      ];
      await recoger(turno({ historial, intercambios: 1, sesionIa: sesionIa() }));

      const [entrada, , opciones] = vi.mocked(transmitirRespuestaPaciente).mock.calls[0]!;
      expect(entrada).toMatchObject({
        promptSistema: PROMPT,
        historial,
        mensaje: '¿Cómo ha dormido?',
      });
      expect(opciones?.tiempoMaximoMs).toBeGreaterThan(10_000);
    });

    it('si fijar el proveedor falla, el turno lo responde Gemini igual', async () => {
      vi.mocked(fijarGemini).mockRejectedValue(new Error('base caída'));
      delOrquestador(new ErrorOrquestador('red'));
      const { eventos, error } = await recoger(turno());

      expect(error).toBeNull();
      expect(completa(eventos)?.resultado.proveedor).toBe('gemini');
    });

    it('si Gemini también falla, se propaga su error', async () => {
      delOrquestador(new ErrorOrquestador('red'));
      vi.mocked(transmitirRespuestaPaciente).mockImplementation(
        partes(new ErrorIA('tiempo_agotado'))
      );
      expect((await recoger(turno())).error).toMatchObject({ tipo: 'tiempo_agotado' });
    });
  });

  describe('historiales que dejan de coincidir', () => {
    it('ensayar otra respuesta pasa la práctica a Gemini (el orquestador no olvida turnos)', async () => {
      const { eventos } = await recoger(
        turno({ hayDescartados: true, intercambios: 1, sesionIa: sesionIa() })
      );
      expect(completa(eventos)?.resultado.proveedor).toBe('gemini');
      expect(fijarGemini).toHaveBeenCalledWith(SESION, 'reformulacion');
      expect(conversarConOrquestador).not.toHaveBeenCalled();
    });

    it('una fuga en la respuesta del orquestador se rechaza y la práctica pasa a Gemini', async () => {
      delOrquestador(
        { tipo: 'fragmento', texto: `Mis instrucciones dicen: ${PROMPT}` },
        { tipo: 'fin', resultado: resultado({ texto: `Mis instrucciones dicen: ${PROMPT}` }) }
      );
      const { eventos, error } = await recoger(turno({ sesionIa: sesionIa() }));

      expect(error).toMatchObject({ tipo: 'fuga_de_instrucciones' });
      // Nada de lo filtrado llegó al navegador.
      expect(JSON.stringify(eventos)).not.toContain('enviudaste');
      // El orquestador ya la guardó en su historial y PsySim no: no puede seguir allá.
      expect(fijarGemini).toHaveBeenCalledWith(SESION, 'fuga');
    });

    it('una respuesta vacía del orquestador también lo deja fuera de la práctica', async () => {
      delOrquestador({ tipo: 'fin', resultado: resultado({ texto: '[triste 2]' }) });
      const { error } = await recoger(turno());
      expect(error).toMatchObject({ tipo: 'respuesta_invalida' });
      expect(fijarGemini).toHaveBeenCalledWith(SESION, 'vacia');
    });

    it('una fuga de Gemini no cambia el proveedor', async () => {
      vi.mocked(getProveedorIa).mockReturnValue('gemini');
      vi.mocked(transmitirRespuestaPaciente).mockImplementation(
        partes({ tipo: 'fin', resultado: { ...deGemini, texto: PROMPT } })
      );
      const { error } = await recoger(turno());
      expect(error).toMatchObject({ tipo: 'fuga_de_instrucciones' });
      expect(fijarGemini).not.toHaveBeenCalled();
    });
  });

  describe('datos de prueba borrados en el orquestador', () => {
    it('sin conversación todavía: olvida la sesión borrada, abre otra y conversa', async () => {
      delOrquestador(new ErrorOrquestador('no_encontrado', { estado: 404 }));
      delOrquestador({ tipo: 'fin', resultado: resultado() });
      const { eventos, error } = await recoger(turno({ sesionIa: sesionIa() }));

      expect(error).toBeNull();
      expect(olvidarSesionOrquestador).toHaveBeenCalledWith(SESION);
      expect(prepararPractica).toHaveBeenCalledTimes(2);
      // La segunda vez vuelve a leer la fila: la que traía la petición ya no vale.
      expect(vi.mocked(prepararPractica).mock.calls[0]![0]).toHaveProperty('sesionIa');
      expect(vi.mocked(prepararPractica).mock.calls[1]![0]).not.toHaveProperty('sesionIa');
      expect(completa(eventos)?.resultado.proveedor).toBe('orquestador');
      expect(fijarGemini).not.toHaveBeenCalled();
    });

    it('con conversación: el historial solo lo tiene PsySim, sigue con Gemini', async () => {
      delOrquestador(new ErrorOrquestador('no_encontrado', { estado: 404 }));
      const { eventos } = await recoger(turno({ intercambios: 3, sesionIa: sesionIa() }));

      expect(olvidarSesionOrquestador).not.toHaveBeenCalled();
      expect(fijarGemini).toHaveBeenCalledWith(SESION, 'sesion_borrada');
      expect(completa(eventos)?.resultado.proveedor).toBe('gemini');
    });

    it('si la sesión nueva tampoco existe, no insiste', async () => {
      delOrquestador(new ErrorOrquestador('no_encontrado', { estado: 404 }));
      delOrquestador(new ErrorOrquestador('no_encontrado', { estado: 404 }));
      const { eventos } = await recoger(turno());

      expect(prepararPractica).toHaveBeenCalledTimes(2);
      expect(fijarGemini).toHaveBeenCalledWith(SESION, 'sesion_borrada');
      expect(completa(eventos)?.resultado.proveedor).toBe('gemini');
    });
  });
});

describe('transmitirTurno con IA_PROVEEDOR=gemini (interruptor de emergencia)', () => {
  beforeEach(() => vi.mocked(getProveedorIa).mockReturnValue('gemini'));

  it('responde Gemini sin tocar el orquestador', async () => {
    const { eventos } = await recoger(turno());
    expect(completa(eventos)).toMatchObject({
      texto: 'Pues… ahí voy.',
      emocion: 'ansioso',
      intensidad: 1,
      emocionDeducida: false,
    });
    expect(prepararPractica).not.toHaveBeenCalled();
    expect(fijarGemini).not.toHaveBeenCalled();
  });

  it('una práctica que venía en el orquestador queda fija en Gemini', async () => {
    await recoger(turno({ intercambios: 2, sesionIa: sesionIa() }));
    expect(fijarGemini).toHaveBeenCalledWith(SESION, 'interruptor');
  });

  it('una práctica con cuenta pero sin sesión abierta allá no necesita fijarse', async () => {
    await recoger(turno({ sesionIa: sesionIa({ sesionOrquestador: null }) }));
    expect(fijarGemini).not.toHaveBeenCalled();
  });
});
