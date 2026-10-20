import { type IntentoDescartado, type MensajeConversacion } from '@/types';

/**
 * Separa la conversación vigente de los intentos que el estudiante reformuló («ensayar otra
 * respuesta»). Los mensajes llegan en orden cronológico; cada tramo descartado se agrupa con los
 * demás que caen entre los mismos dos mensajes vigentes, así el docente los ve donde ocurrieron
 * aunque el estudiante haya reformulado varias veces en el mismo punto.
 */
export function separarIntentos(todos: readonly MensajeConversacion[]): {
  vigentes: MensajeConversacion[];
  intentos: IntentoDescartado[];
} {
  const vigentes: MensajeConversacion[] = [];
  const intentos: IntentoDescartado[] = [];
  for (const mensaje of todos) {
    if (!mensaje.descartadoEn) {
      vigentes.push(mensaje);
      continue;
    }
    const ultimo = intentos.at(-1);
    if (ultimo && ultimo.posicion === vigentes.length) ultimo.mensajes.push(mensaje);
    else intentos.push({ posicion: vigentes.length, mensajes: [mensaje] });
  }
  return { vigentes, intentos };
}

export type ElementoConversacion =
  | { tipo: 'mensaje'; mensaje: MensajeConversacion }
  | { tipo: 'intento'; intento: IntentoDescartado };

/** La conversación vigente con cada intento reformulado en su lugar, para mostrarla en orden. */
export function intercalarIntentos(
  mensajes: readonly MensajeConversacion[],
  intentos: readonly IntentoDescartado[]
): ElementoConversacion[] {
  const elementos: ElementoConversacion[] = [];
  const porPosicion = new Map(intentos.map(intento => [intento.posicion, intento]));
  mensajes.forEach((mensaje, indice) => {
    const intento = porPosicion.get(indice);
    if (intento) elementos.push({ tipo: 'intento', intento });
    elementos.push({ tipo: 'mensaje', mensaje });
  });
  const final = porPosicion.get(mensajes.length);
  if (final) elementos.push({ tipo: 'intento', intento: final });
  return elementos;
}

/** Intervenciones del estudiante dentro de un intento (para el resumen «2 intervenciones»). */
export function intervencionesDe(intento: IntentoDescartado): number {
  return intento.mensajes.filter(m => m.remitente === 'estudiante').length;
}

/**
 * ¿Se puede volver a este mensaje para ensayar otra respuesta? Solo intervenciones propias que ya
 * están guardadas (tienen id de la base de datos).
 */
export function sePuedeReformular(mensaje: MensajeConversacion): boolean {
  return mensaje.remitente === 'estudiante' && !mensaje.sinGuardar && !mensaje.descartadoEn;
}
