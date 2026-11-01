import { z } from 'zod';

/** Límites del contrato de /api/metrics/save (HU-19 · T01). */
export const LIMITES_METRICAS = {
  /** Intervenciones máximas de una práctica (el historial del chat acepta 80 mensajes). */
  mensajes: 1000,
  /** Una respuesta del paciente no tarda más de una hora: por encima, el dato es inválido. */
  latenciaMs: 3_600_000,
  /** Distancia máxima al paciente, en metros (el consultorio mide unos pocos). */
  proximidadM: 100,
} as const;

/** Indicadores que solo se pueden medir en el navegador (HU-18 · T03). */
export const indicadoresSchema = z.object({
  /** Distancia media entre el estudiante y el paciente durante la práctica, en metros. */
  proximidad_promedio: z.number().min(0).max(LIMITES_METRICAS.proximidadM).nullable(),
});

const latencia = (campo: string) =>
  z
    .number(`${campo} debe ser un número.`)
    .int(`${campo} debe ser un número entero de milisegundos.`)
    .min(0, `${campo} no puede ser negativo.`)
    .max(LIMITES_METRICAS.latenciaMs, `${campo} es demasiado grande.`)
    .nullable();

/** HU-19 · T01 — Cuerpo de la petición con las métricas consolidadas al cerrar la sesión. */
export const metricsSaveRequestSchema = z
  .object({
    sesion_id: z.uuid('sesion_id debe ser un UUID válido.'),
    total_mensajes: z
      .number('total_mensajes debe ser un número.')
      .int('total_mensajes debe ser un número entero.')
      .min(0, 'total_mensajes no puede ser negativo.')
      .max(LIMITES_METRICAS.mensajes, 'total_mensajes es demasiado grande.'),
    latencia_promedio_ms: latencia('latencia_promedio_ms'),
    latencia_maxima_ms: latencia('latencia_maxima_ms'),
    indicadores: indicadoresSchema.nullable(),
  })
  .superRefine((datos, contexto) => {
    const { latencia_promedio_ms: promedio, latencia_maxima_ms: maxima } = datos;
    if ((promedio === null) !== (maxima === null)) {
      contexto.addIssue({
        code: 'custom',
        path: [promedio === null ? 'latencia_promedio_ms' : 'latencia_maxima_ms'],
        message: 'La latencia promedio y la máxima se envían juntas o ninguna.',
      });
    } else if (promedio !== null && maxima !== null && maxima < promedio) {
      contexto.addIssue({
        code: 'custom',
        path: ['latencia_maxima_ms'],
        message: 'La latencia máxima no puede ser menor que el promedio.',
      });
    }
  });

/** HU-19 · T01 — Respuesta exitosa: la sesión quedó finalizada con sus métricas guardadas. */
export const metricsSaveResponseSchema = z.object({
  sesion_id: z.uuid(),
  metrica_id: z.uuid(),
});

/** Cuerpo de las respuestas de error (400, 401, 403, 404, 409, 500). */
export const metricsSaveErrorSchema = z.object({
  error: z.string(),
  /** Detalle por campo cuando la validación falla (400). */
  campos: z.record(z.string(), z.array(z.string())).optional(),
});

export type Indicadores = z.infer<typeof indicadoresSchema>;
export type MetricsSaveRequest = z.infer<typeof metricsSaveRequestSchema>;
export type MetricsSaveResponse = z.infer<typeof metricsSaveResponseSchema>;
export type MetricsSaveError = z.infer<typeof metricsSaveErrorSchema>;
