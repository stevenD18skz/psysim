/**
 * HU-14 · T01 — Máquina de estados del paciente virtual (diagrama de la sección 4.3.4).
 *
 *   inactivo ──(el estudiante inicia la conversación)──▶ esperando_input
 *   esperando_input ──(envía un mensaje)──▶ procesando
 *   procesando ──(llega la respuesta)──▶ respondiendo ──(termina de mostrarse)──▶ esperando_input
 *   procesando ──(falla la IA)──▶ error_comunicacion ──(reintentar)──▶ procesando
 *   esperando_input ──(se aleja)──▶ inactivo
 *   (casi) cualquier estado ──(finalizar)──▶ sesion_finalizada   [estado terminal]
 */
export const ESTADOS_NPC = [
  'inactivo',
  'esperando_input',
  'procesando',
  'respondiendo',
  'error_comunicacion',
  'sesion_finalizada',
] as const;

export type EstadoNpc = (typeof ESTADOS_NPC)[number];

const TRANSICIONES: Record<EstadoNpc, readonly EstadoNpc[]> = {
  inactivo: ['esperando_input', 'sesion_finalizada'],
  esperando_input: ['procesando', 'inactivo', 'sesion_finalizada'],
  // Mientras se espera a la IA no se puede cerrar la sesión (evita cierres accidentales).
  procesando: ['respondiendo', 'error_comunicacion'],
  respondiendo: ['esperando_input', 'sesion_finalizada'],
  error_comunicacion: ['procesando', 'sesion_finalizada'],
  sesion_finalizada: [],
};

export function esTransicionValida(desde: EstadoNpc, hacia: EstadoNpc): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

/** ¿El estudiante está frente al paciente (la cámara de conversación está activa)? */
export function estaConversando(estado: EstadoNpc): boolean {
  return estado !== 'inactivo' && estado !== 'sesion_finalizada';
}
