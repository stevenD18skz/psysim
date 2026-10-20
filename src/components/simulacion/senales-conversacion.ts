import { createStore } from 'zustand/vanilla';

/**
 * Señales de lo que hace el estudiante en el campo de la conversación, para el lenguaje no verbal
 * del paciente: escuchar mientras escribe y asentir cuando hace una pausa, como un interlocutor
 * atento (conductas contingentes: Gratch et al., Rapport Agent). Va fuera del store principal
 * porque cambia con cada tecla y solo la lee la escena 3D.
 */
export interface SenalesConversacion {
  /** El estudiante está escribiendo ahora (tecleó hace menos de `PAUSA_ESCRITURA_MS`). */
  escribiendo: boolean;
  /** Aumenta cada vez que el estudiante hace una pausa tras escribir algo: el paciente asiente. */
  pausas: number;
  /** Última actividad del estudiante en la conversación (ms, `performance.now()`). */
  ultimaActividad: number;
}

/** Sin teclear durante este tiempo, se considera una pausa (ms). */
export const PAUSA_ESCRITURA_MS = 900;
/** Caracteres mínimos escritos para que la pausa merezca un asentimiento. */
const MINIMO_PARA_ASENTIR = 25;

export const senalesConversacion = createStore<SenalesConversacion>(() => ({
  escribiendo: false,
  pausas: 0,
  ultimaActividad: 0,
}));

let temporizador: ReturnType<typeof setTimeout> | undefined;
let escritoDesdePausa = 0;

/** El estudiante escribió (o borró) en el campo de la conversación. */
export function registrarTecleo(caracteres: number) {
  escritoDesdePausa += Math.max(0, caracteres);
  senalesConversacion.setState({ escribiendo: true, ultimaActividad: performance.now() });
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    const asentir = escritoDesdePausa >= MINIMO_PARA_ASENTIR;
    escritoDesdePausa = 0;
    senalesConversacion.setState(estado => ({
      escribiendo: false,
      pausas: asentir ? estado.pausas + 1 : estado.pausas,
    }));
  }, PAUSA_ESCRITURA_MS);
}

/** Cualquier otra actividad del estudiante frente al paciente (enviar, reformular…). */
export function registrarActividadConversacion() {
  clearTimeout(temporizador);
  escritoDesdePausa = 0;
  senalesConversacion.setState({ escribiendo: false, ultimaActividad: performance.now() });
}
