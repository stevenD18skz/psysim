import { z } from 'zod';

/*
 * Contratos del orquestador de NPC (FastAPI de Juan José Moreno), según su OpenAPI. Solo se
 * declaran los campos que PsySim usa: el resto se ignora para no romperse si la API crece.
 */

/**
 * Cómo terminó una sesión para el orquestador (`PATCH /sessions/{id}/end`). `success` la deja
 * `completed`; `crisis` e `inappropriate`, `terminated`. Sin `closing_kind` también `completed`.
 */
export const CIERRES_ORQUESTADOR = ['success', 'crisis', 'inappropriate'] as const;
export type CierreOrquestador = (typeof CIERRES_ORQUESTADOR)[number];

/** Estados de una sesión del orquestador que PsySim conoce. Cualquier otro se trata como cerrada. */
export const ESTADO_SESION_ACTIVA = 'active';

/*
 * Los identificadores se validan con `guid` (8-4-4-4-12 hexadecimales) y no con `uuid`: Zod 4
 * exige en `uuid` la versión y la variante del RFC, y una respuesta entera se rechazaría por un
 * id que la base de datos acepta sin problema.
 */

export const loginSchema = z.object({
  access_token: z.string().min(1),
  /** Segundos de vigencia del token (3600 hoy). */
  expires_in: z.number().positive(),
});

export const usuarioOrquestadorSchema = z.object({
  id: z.guid(),
  email: z.string(),
  /** `student`, `teacher` o `admin`. PsySim no decide nada con él: un rol nuevo no lo rompe. */
  role: z.string(),
});
export type UsuarioOrquestador = z.infer<typeof usuarioOrquestadorSchema>;

/** Perfil o escenario recién creado o actualizado: solo interesa su id. */
export const recursoSchema = z.object({ id: z.guid() });

export const sesionOrquestadorSchema = z.object({
  id: z.guid(),
  /** `active`, `completed` (cierre `success` o manual) o `terminated` (crisis o inapropiado). */
  status: z.string().default(ESTADO_SESION_ACTIVA),
  user_id: z.string().nullish(),
  /** Se acota con `acotarSeveridad` antes de guardarla: la base solo acepta de 0 a 5. */
  current_severity: z.number().nullish(),
});
export type SesionOrquestador = z.infer<typeof sesionOrquestadorSchema>;

export const mensajeOrquestadorSchema = z.object({
  id: z.guid(),
  /** `trainee` (quien practica) o `patient` (el personaje). */
  role: z.string(),
  content: z.string(),
  // Lo que no decide si el turno quedó guardado se lee con tolerancia: un mensaje sin severidad
  // no debe invalidar el historial entero (de él depende no duplicar un turno).
  severity: z.number().nullish(),
  risk_flags: z
    .array(z.string())
    .nullish()
    .transform(banderas => banderas ?? []),
  ai_provider: z.string().nullish(),
  tokens_used: z.number().nullish(),
});
export type MensajeOrquestador = z.output<typeof mensajeOrquestadorSchema>;

export const historialOrquestadorSchema = z.array(mensajeOrquestadorSchema);

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
      /** `null` si el evento no trajo una severidad legible (se conserva la anterior). */
      severidad: number | null;
      debeCerrar: boolean;
      /**
       * `closing_kind` tal como llegó (`success`, `crisis`, `inappropriate`, vacío o un valor que
       * PsySim no conoce). Qué significa lo decide `decidirCierre`, no quien lo lee.
       */
      cierre: string | null;
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
