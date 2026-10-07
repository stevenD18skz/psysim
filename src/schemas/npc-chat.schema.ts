import { z } from 'zod';

import { EMOCIONES_NPC } from '@/lib/conversacion/emociones';

/** Límites del contrato de /api/npc/chat (HU-12 · T02). */
export const LIMITES_CHAT = {
  /** Máximo de caracteres de una intervención del estudiante. */
  mensaje: 1000,
  /** Máximo de caracteres de un mensaje del historial (las respuestas del NPC son breves). */
  contenidoHistorial: 4000,
  /** Máximo de mensajes de historial aceptados en una petición. */
  historial: 80,
} as const;

export const ROLES_HISTORIAL = ['user', 'assistant'] as const;

export const mensajeHistorialSchema = z.object({
  rol: z.enum(ROLES_HISTORIAL, 'El rol debe ser "user" o "assistant".'),
  contenido: z
    .string()
    .trim()
    .min(1, 'El contenido no puede estar vacío.')
    .max(LIMITES_CHAT.contenidoHistorial),
});

/** HU-12 · T01/T02 — Cuerpo de la petición al Route Handler del paciente virtual. */
export const npcChatRequestSchema = z.object({
  sesion_id: z.uuid('sesion_id debe ser un UUID válido.'),
  npc_id: z.uuid('npc_id debe ser un UUID válido.'),
  mensaje_usuario: z
    .string('mensaje_usuario es obligatorio.')
    .trim()
    .min(1, 'mensaje_usuario no puede estar vacío.')
    .max(
      LIMITES_CHAT.mensaje,
      `mensaje_usuario no puede superar ${LIMITES_CHAT.mensaje} caracteres.`
    ),
  historial: z
    .array(mensajeHistorialSchema, 'historial debe ser un arreglo.')
    .max(LIMITES_CHAT.historial, `historial no puede superar ${LIMITES_CHAT.historial} mensajes.`),
});

/** HU-12 · T01/T05 — Respuesta exitosa del Route Handler. */
export const npcChatResponseSchema = z.object({
  respuesta_npc: z.string().min(1),
  /** Emoción que el paciente expresa con el cuerpo (no se muestra como texto). */
  emocion_npc: z.enum(EMOCIONES_NPC).nullable().default(null),
  /** Momento (ISO 8601) en que el servidor recibió la respuesta de la IA. */
  timestamp_respuesta: z.iso.datetime(),
  /** Consumo de la IA: no se muestra en la interfaz, se acumula para el cierre (Sprint 4). */
  tokens_entrada: z.number().int().nonnegative().nullable(),
  tokens_salida: z.number().int().nonnegative().nullable(),
});

/** Cuerpo de las respuestas de error (400, 401, 403, 404, 409, 502, 503, 504). */
export const npcChatErrorSchema = z.object({
  error: z.string(),
  /** Detalle por campo cuando la validación falla (400). */
  campos: z.record(z.string(), z.array(z.string())).optional(),
});

export type MensajeHistorial = z.infer<typeof mensajeHistorialSchema>;
export type NpcChatRequest = z.infer<typeof npcChatRequestSchema>;
export type NpcChatResponse = z.infer<typeof npcChatResponseSchema>;
export type NpcChatError = z.infer<typeof npcChatErrorSchema>;
