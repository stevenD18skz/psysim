import { type MotivoCierre } from '@/lib/conversacion/cierre';
import { type ProveedorIA } from '@/lib/env/orquestador';

/**
 * Lo que entrega un proveedor del paciente (el orquestador o Gemini) mientras responde un turno.
 * Los dos hablan este mismo protocolo, así la ruta del chat no distingue quién respondió.
 */
export type ParteTurno =
  /** El servidor está esperando cupo en la cuenta del orquestador. */
  | { tipo: 'espera'; segundos: number }
  /** Texto crudo del modelo, tal como llega (puede traer la etiqueta de emoción). */
  | { tipo: 'fragmento'; texto: string }
  /** Lo entregado hasta ahora no vale: el intento falló a medias y se responde desde cero. */
  | { tipo: 'reinicio' }
  | { tipo: 'fin'; resultado: ResultadoTurno };

export interface ResultadoTurno {
  proveedor: ProveedorIA;
  /** Respuesta completa tal como la escribió el modelo, con su etiqueta de emoción si la puso. */
  texto: string;
  modelo: string | null;
  tokensEntrada: number | null;
  tokensSalida: number | null;
  /** Severidad emocional que recalculó el orquestador en este turno (Gemini no la tiene). */
  severidad: number | null;
  /** Severidad del turno anterior, para deducir la emoción cuando falta la etiqueta. */
  severidadAnterior: number | null;
  /** `risk_flags` del turno en el orquestador. */
  banderas: string[];
  /** El orquestador decidió cerrar la práctica. */
  cierre: MotivoCierre | null;
}
