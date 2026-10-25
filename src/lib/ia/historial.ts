import { LIMITES_CHAT, type MensajeHistorial } from '@/schemas/npc-chat.schema';

/**
 * LLM10 (consumo sin límite) — Tope de intervenciones del estudiante en una práctica. Cada una es
 * una llamada a la IA con costo; una práctica real tiene decenas, no cientos. Se cuentan también
 * las que reformuló: gastaron cuota aunque ya no estén en la conversación vigente.
 */
export const MAX_INTERVENCIONES_POR_SESION = 150;

/** Lo que se lee de `mensaje` para reconstruir el contexto de la IA. */
export interface FilaMensaje {
  remitente: 'estudiante' | 'npc';
  contenido: string;
  descartado_en: string | null;
}

/**
 * LLM01 (inyección de instrucciones) — El contexto de la IA se arma con lo que el servidor guardó,
 * nunca con lo que manda el navegador. Si el cliente pudiera enviar el historial, el estudiante
 * podría fabricar turnos del paciente («assistant») que acepten cambiar de personaje o revelar
 * sus instrucciones. Solo cuenta la conversación vigente: lo reformulado ya no la integra.
 */
export function historialDesdeFilas(filas: readonly FilaMensaje[]): MensajeHistorial[] {
  return filas
    .filter(fila => fila.descartado_en === null)
    .map((fila): MensajeHistorial => ({
      rol: fila.remitente === 'estudiante' ? 'user' : 'assistant',
      contenido: fila.contenido,
    }))
    .slice(-LIMITES_CHAT.historial);
}

/** Intervenciones del estudiante en la sesión, vigentes o reformuladas. */
export function contarIntervenciones(filas: readonly FilaMensaje[]): number {
  return filas.filter(fila => fila.remitente === 'estudiante').length;
}
