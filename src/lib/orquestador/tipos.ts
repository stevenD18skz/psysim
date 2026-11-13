import { z } from 'zod';

/*
 * Contratos del orquestador de NPC (FastAPI de Juan José Moreno), según su OpenAPI. Solo se
 * declaran los campos que PsySim usa: el resto se ignora para no romperse si la API crece.
 */

export const ROLES_ORQUESTADOR = ['student', 'teacher', 'admin'] as const;

/** Cómo terminó una sesión para el orquestador (`PATCH /sessions/{id}/end`). */
export const CIERRES_ORQUESTADOR = ['success', 'crisis', 'inappropriate'] as const;
export type CierreOrquestador = (typeof CIERRES_ORQUESTADOR)[number];

export const loginSchema = z.object({
  access_token: z.string().min(1),
  /** Segundos de vigencia del token (3600 hoy). */
  expires_in: z.number().positive(),
});

export const usuarioOrquestadorSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  role: z.enum(ROLES_ORQUESTADOR),
});
export type UsuarioOrquestador = z.infer<typeof usuarioOrquestadorSchema>;

/** Perfil o escenario recién creado o actualizado: solo interesa su id. */
export const recursoSchema = z.object({ id: z.uuid() });

export const sesionOrquestadorSchema = z.object({
  id: z.uuid(),
  status: z.string().default('active'),
  user_id: z.uuid().nullish(),
  current_severity: z.number(),
});
export type SesionOrquestador = z.infer<typeof sesionOrquestadorSchema>;

export const mensajeOrquestadorSchema = z.object({
  id: z.uuid(),
  /** `trainee` (quien practica) o `patient` (el personaje). */
  role: z.string(),
  content: z.string(),
  severity: z.number(),
  risk_flags: z.array(z.string()).default([]),
  ai_provider: z.string().nullish(),
  tokens_used: z.number().int().nullish(),
});
export type MensajeOrquestador = z.infer<typeof mensajeOrquestadorSchema>;

export const historialOrquestadorSchema = z.array(mensajeOrquestadorSchema);

/** Evento `done` del stream: fin del turno con la severidad recalculada. */
export const eventoFinSchema = z.object({
  severity: z.number(),
  should_close: z.boolean().default(false),
  closing_kind: z.string().nullish(),
  /** Métricas de la llamada de IA. Su forma no está en el OpenAPI: se lee con tolerancia. */
  metrics: z.record(z.string(), z.unknown()).nullish(),
});

export const eventoErrorSchema = z.object({
  error: z.string().default(''),
  /** `false`: no se pudo confirmar el descarte del turno; hay que leer el historial. */
  discarded: z.boolean().default(false),
});

/** Evento del stream de conversación ya interpretado. */
export type EventoOrquestador =
  | { tipo: 'fragmento'; texto: string }
  | {
      tipo: 'fin';
      severidad: number;
      debeCerrar: boolean;
      cierre: CierreOrquestador | null;
      metricas: MetricasTurno;
    }
  | { tipo: 'error'; descartado: boolean }
  /** Evento desconocido o con datos ilegibles: se ignora. */
  | { tipo: 'ignorado' };

/** Lo que PsySim guarda de las métricas de un turno del orquestador. */
export interface MetricasTurno {
  proveedor: string | null;
  modelo: string | null;
  tokensEntrada: number | null;
  tokensSalida: number | null;
}

export interface PerfilOrquestador {
  name: string;
  description: string;
  traits: Record<string, string | number>;
  behavior: {
    behavior_min: number;
    behavior_max: number;
    triggers: string[];
    regulators: string[];
  };
}

export interface EscenarioOrquestador {
  name: string;
  context: string;
  /** Severidad emocional inicial, 1 a 5. */
  severity: number;
  risk_flags: string[];
  constraints: Record<string, string | number | string[]>;
}
