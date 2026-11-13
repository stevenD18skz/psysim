import { duracionEscritura } from '@/components/simulacion/use-texto-progresivo';
import { planDesde, planVoz, type Silaba, type Voz } from '@/lib/audio/voz';
import { emocionActual, type EmocionNpc } from '@/lib/conversacion/emociones';
import { type AppState } from '@/store/app-store';

/** Cada cuánto, como mucho, se vuelve a planificar la voz mientras el texto sigue llegando. */
export const PAUSA_ENTRE_PLANES_MS = 700;

/** Lo que el paciente tiene que decir a partir de este momento. */
export interface TramoDeHabla {
  /** Sílabas que faltan, con sus tiempos contados desde ahora. */
  silabas: Silaba[];
  /** Texto que falta por decir (los gestos de las frases clave salen de aquí). */
  texto: string;
  /** La respuesta entera, tal como se conoce ahora. */
  respuesta: string;
  emocion: EmocionNpc;
  /** El paciente acaba de tomar la palabra. */
  primero: boolean;
  /** La respuesta ya llegó completa: no habrá más tramos. */
  completa: boolean;
}

/**
 * Sigue la respuesta del paciente mientras llega por partes y dice cuándo hay que (volver a)
 * planificar su voz y sus ademanes. La voz dura lo mismo que la escritura del texto en pantalla;
 * como el texto crece mientras se dice, el plan se rehace con lo que se conoce (sin pasar de una
 * vez cada 700 ms) y continúa desde el segundo por el que va, no desde el principio.
 *
 * Se llama en cada cambio del store. Devuelve `null` si no hay nada nuevo que decir.
 */
export function crearSeguidorDeHabla(voz: Voz, ahora: () => number = () => performance.now()) {
  let inicio = 0;
  let ultimoPlan = 0;
  let planificado: string | null = null;
  let cerrado = false;

  return (previo: AppState, actual: AppState): TramoDeHabla | null => {
    if (actual.npc.estado !== 'respondiendo') {
      planificado = null;
      return null;
    }
    const mensajes = actual.conversacion.mensajes;
    const ultima = mensajes.findLast(mensaje => mensaje.remitente === 'npc');
    const respuesta = ultima?.contenido ?? '';
    const completa = ultima?.enCurso !== true;
    const momento = ahora();

    const primero = previo.npc.estado !== 'respondiendo' || planificado === null;
    if (!primero && (cerrado || (respuesta === planificado && !completa))) return null;
    if (primero || !planificado || !respuesta.startsWith(planificado)) {
      // Toma la palabra, o la respuesta empezó de nuevo (otro proveedor respondió desde cero).
      inicio = momento;
    } else if (!completa && momento - ultimoPlan < PAUSA_ENTRE_PLANES_MS) {
      return null;
    }

    ultimoPlan = momento;
    planificado = respuesta;
    cerrado = completa;

    const emocion = emocionActual(mensajes);
    const duracion = duracionEscritura(respuesta);
    const transcurrido = Math.min(duracion, (momento - inicio) / 1000);
    const dicho = duracion > 0 ? Math.floor(respuesta.length * (transcurrido / duracion)) : 0;
    return {
      silabas: planDesde(planVoz(respuesta, voz, emocion, duracion), transcurrido),
      texto: respuesta.slice(dicho),
      respuesta,
      emocion,
      primero,
      completa,
    };
  };
}
