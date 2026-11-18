import { type EmocionNpc, type IntensidadEmocion } from '@/lib/conversacion/emociones';
import { lenguajeNoVerbal } from '@/lib/orquestador/severidad';

import { crearLimpiadorDeFlujo } from './flujo';
import { LARGO_MAXIMO_RESPUESTA, recortarRespuesta } from './limpieza';
import { type ParteTurno, type ResultadoTurno } from './partes';

/** Lo que la ruta del chat reenvía al navegador mientras el paciente responde. */
export type EventoTurno =
  | { tipo: 'espera'; segundos: number }
  /** Emoción de la etiqueta, en cuanto se reconoce (antes de que termine el texto). */
  | { tipo: 'emocion'; emocion: EmocionNpc; intensidad: IntensidadEmocion | null }
  /** Texto ya limpio para añadir a la burbuja del paciente. */
  | { tipo: 'fragmento'; texto: string }
  | { tipo: 'reinicio' }
  | { tipo: 'completo'; respuesta: RespuestaProcesada };

/** La respuesta completa, limpia y con su lenguaje no verbal: lo que se guarda. */
export interface RespuestaProcesada {
  texto: string;
  emocion: EmocionNpc | null;
  intensidad: IntensidadEmocion | null;
  /** La emoción no vino en la etiqueta: se dedujo de la severidad del orquestador. */
  emocionDeducida: boolean;
  resultado: ResultadoTurno;
}

/** Por qué una respuesta ya recibida no se puede usar. */
export class RespuestaRechazada extends Error {
  constructor(readonly motivo: 'fuga_de_instrucciones' | 'respuesta_invalida') {
    super(`Respuesta rechazada: ${motivo}`);
    this.name = 'RespuestaRechazada';
  }
}

export interface OpcionesProceso {
  nombrePaciente?: string;
  /** Prompt del caso y reglas fijas, para el filtro de fuga (LLM07). */
  fuentes: readonly string[];
  /** Emoción de la respuesta anterior del paciente, por si hay que deducir la de esta. */
  emocionAnterior: EmocionNpc | null;
}

/**
 * Convierte lo que entrega el proveedor en lo que puede ver el estudiante: quita la etiqueta de
 * emoción y el prefijo del nombre mientras el texto llega, corta si la respuesta copia las
 * instrucciones del paciente y, al final, calcula el lenguaje no verbal (la etiqueta, ajustada con
 * la severidad del orquestador, o deducida de ella si el modelo no la escribió).
 *
 * Lanza `RespuestaRechazada` si hay fuga o la respuesta queda vacía.
 */
export async function* procesarTurno(
  partes: AsyncIterable<ParteTurno>,
  { nombrePaciente, fuentes, emocionAnterior }: OpcionesProceso
): AsyncGenerator<EventoTurno, void, void> {
  const limpiador = crearLimpiadorDeFlujo({ nombrePaciente, fuentes });
  // Caracteres recibidos de este intento. Pasado el tope no se muestra ni se acumula más: la
  // respuesta se recorta al final y lo que siga llegando es un proveedor que no se detiene.
  let recibido = 0;

  for await (const parte of partes) {
    if (parte.tipo === 'espera') {
      yield parte;
    } else if (parte.tipo === 'reinicio') {
      limpiador.reiniciar();
      recibido = 0;
      yield parte;
    } else if (parte.tipo === 'fragmento') {
      if (recibido > LARGO_MAXIMO_RESPUESTA) continue;
      recibido += parte.texto.length;
      const avance = limpiador.agregar(parte.texto);
      if (avance.fuga) throw new RespuestaRechazada('fuga_de_instrucciones');
      if (avance.emocion) yield { tipo: 'emocion', ...avance.emocion };
      if (avance.texto) yield { tipo: 'fragmento', texto: avance.texto };
    } else {
      const { resultado } = parte;
      const limpia = limpiador.terminar(resultado.texto);
      if (limpia.fuga) throw new RespuestaRechazada('fuga_de_instrucciones');
      if (!limpia.texto) throw new RespuestaRechazada('respuesta_invalida');

      let { emocion, intensidad } = limpia;
      let emocionDeducida = false;
      if (resultado.severidad !== null) {
        const noVerbal = lenguajeNoVerbal(
          { emocion, intensidad },
          {
            severidad: resultado.severidad,
            severidadAnterior: resultado.severidadAnterior,
            emocionAnterior,
            banderas: resultado.banderas,
          }
        );
        emocion = noVerbal.emocion;
        intensidad = noVerbal.intensidad;
        emocionDeducida = noVerbal.deducida;
      }
      // La base no acepta más de `LARGO_MAXIMO_RESPUESTA`: una respuesta más larga se recorta
      // en el final de una frase. Sin esto el guardado fallaba en cada reintento.
      const texto = recortarRespuesta(limpia.texto);
      yield {
        tipo: 'completo',
        respuesta: { texto, emocion, intensidad, emocionDeducida, resultado },
      };
      return;
    }
  }
}
