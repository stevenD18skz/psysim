import {
  type EmocionNpc,
  extraerEmocion,
  type IntensidadEmocion,
} from '@/lib/conversacion/emociones';

import { revelaInstrucciones } from './fuga-prompt';
import { limpiarTexto } from './limpieza';

/** Una etiqueta de emoción (`[triste 2]`, `(emoción: ansioso)`) no pasa de este largo. */
const LARGO_MAXIMO_ETIQUETA = 44;

/**
 * Parte del texto que ya se puede mostrar: se retiene el final si puede ser una etiqueta de
 * emoción a medio llegar (un corchete o paréntesis abierto que todavía no cierra), para que el
 * estudiante nunca vea `[tris` en pantalla.
 */
export function tramoSeguro(texto: string): string {
  const abre = Math.max(texto.lastIndexOf('['), texto.lastIndexOf('('));
  if (abre === -1) return texto;
  const cierra = Math.max(texto.indexOf(']', abre), texto.indexOf(')', abre));
  if (cierra !== -1) return texto;
  // Un paréntesis que lleva mucho abierto es texto normal, no una etiqueta.
  return texto.length - abre > LARGO_MAXIMO_ETIQUETA ? texto : texto.slice(0, abre);
}

export interface AvanceDeFlujo {
  /** Texto limpio nuevo para mostrar (puede venir vacío). */
  texto: string;
  /** La emoción de la etiqueta, la primera vez que se reconoce. */
  emocion: { emocion: EmocionNpc; intensidad: IntensidadEmocion | null } | null;
  /** La respuesta está copiando las instrucciones del paciente: hay que cortar. */
  fuga: boolean;
}

export interface RespuestaLimpia {
  texto: string;
  emocion: EmocionNpc | null;
  intensidad: IntensidadEmocion | null;
  fuga: boolean;
}

/**
 * Limpia la respuesta del paciente mientras llega por partes: separa la etiqueta de emoción, quita
 * el prefijo «Nombre:» y vigila el filtro de fuga (LLM07). Lo que entrega `agregar` es solo un
 * adelanto para la pantalla; el texto que se guarda es el de `terminar`, calculado sobre la
 * respuesta completa con las mismas funciones del camino sin streaming.
 */
export function crearLimpiadorDeFlujo(opciones: {
  nombrePaciente?: string;
  /** Prompt del caso y reglas fijas, contra los que se compara la respuesta. */
  fuentes: readonly string[];
}) {
  let bruto = '';
  let mostrado = '';
  let emocionAvisada = false;

  const limpiar = (texto: string) => {
    const { texto: sinEtiqueta, emocion, intensidad } = extraerEmocion(texto);
    return { texto: limpiarTexto(sinEtiqueta, opciones.nombrePaciente), emocion, intensidad };
  };

  return {
    agregar(fragmento: string): AvanceDeFlujo {
      bruto += fragmento;
      const { texto, emocion, intensidad } = limpiar(tramoSeguro(bruto));

      const avance: AvanceDeFlujo = { texto: '', emocion: null, fuga: false };
      if (emocion && !emocionAvisada) {
        emocionAvisada = true;
        avance.emocion = { emocion, intensidad };
      }
      if (revelaInstrucciones(texto, opciones.fuentes)) {
        avance.fuga = true;
        return avance;
      }
      // Solo se añade al final de lo ya mostrado: si la limpieza cambió algo anterior (unas
      // comillas, un espacio), se espera al texto final, que reemplaza todo.
      if (texto.length > mostrado.length && texto.startsWith(mostrado)) {
        avance.texto = texto.slice(mostrado.length);
        mostrado = texto;
      }
      return avance;
    },

    /** Olvida lo recibido: el proveedor falló a medias y otro va a responder desde cero. */
    reiniciar(): void {
      bruto = '';
      mostrado = '';
      emocionAvisada = false;
    },

    /** Respuesta completa y limpia. `brutoFinal` sustituye a lo acumulado si se indica. */
    terminar(brutoFinal?: string): RespuestaLimpia {
      const { texto, emocion, intensidad } = limpiar(brutoFinal ?? bruto);
      return { texto, emocion, intensidad, fuga: revelaInstrucciones(texto, opciones.fuentes) };
    },
  };
}
