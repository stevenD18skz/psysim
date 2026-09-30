import { z } from 'zod';

/**
 * Límites compartidos con las restricciones CHECK de la base de datos
 * (supabase/migrations/20260930010000_escenarios_npc_sesiones.sql).
 */
export const LIMITES = {
  codigoEstudiante: { min: 5, max: 12 },
  nombreEstudiante: { min: 2, max: 120 },
  prompt: { min: 20, max: 8000 },
  nombreConfiguracion: { min: 3, max: 150 },
} as const;

/** Letras (incluidas tildes y ñ), espacios, apóstrofes, puntos y guiones. */
const PATRON_NOMBRE_PERSONA = /^[\p{L}][\p{L}\s'.-]*$/u;

/** Colapsa espacios repetidos: "  Ana   María " → "Ana María". */
const normalizarEspacios = (valor: string) => valor.trim().replace(/\s+/g, ' ');

export const codigoEstudianteSchema = z
  .string()
  .trim()
  .min(1, 'Ingresa el código institucional del estudiante.')
  .regex(/^\d+$/, 'El código solo puede contener números.')
  .min(
    LIMITES.codigoEstudiante.min,
    `El código debe tener al menos ${LIMITES.codigoEstudiante.min} dígitos.`
  )
  .max(
    LIMITES.codigoEstudiante.max,
    `El código no puede superar los ${LIMITES.codigoEstudiante.max} dígitos.`
  );

export const nombreEstudianteSchema = z
  .string()
  .transform(normalizarEspacios)
  .pipe(
    z
      .string()
      .min(1, 'Ingresa el nombre completo del estudiante.')
      .min(
        LIMITES.nombreEstudiante.min,
        `El nombre debe tener al menos ${LIMITES.nombreEstudiante.min} caracteres.`
      )
      .max(
        LIMITES.nombreEstudiante.max,
        `El nombre no puede superar los ${LIMITES.nombreEstudiante.max} caracteres.`
      )
      .regex(PATRON_NOMBRE_PERSONA, 'El nombre solo puede contener letras y espacios.')
  );

export const promptSchema = z
  .string()
  .trim()
  .min(1, 'El comportamiento del paciente no puede estar vacío.')
  .min(
    LIMITES.prompt.min,
    `Describe el comportamiento con al menos ${LIMITES.prompt.min} caracteres.`
  )
  .max(LIMITES.prompt.max, `El texto no puede superar los ${LIMITES.prompt.max} caracteres.`);

const escenarioIdSchema = z.uuid('Selecciona un escenario para continuar.');

/** HU-06 · T03/T04 — Formulario completo para iniciar una simulación. */
export const iniciarSimulacionSchema = z.object({
  escenarioId: escenarioIdSchema,
  promptSistema: promptSchema,
  codigoEstudiante: codigoEstudianteSchema,
  nombreEstudiante: nombreEstudianteSchema,
});

export type IniciarSimulacionInput = z.input<typeof iniciarSimulacionSchema>;
export type IniciarSimulacionData = z.output<typeof iniciarSimulacionSchema>;

/** HU-07 · T02 — Guardar la configuración actual con un nombre propio. */
export const guardarConfiguracionSchema = z.object({
  escenarioId: escenarioIdSchema,
  promptPersonalizado: promptSchema,
  nombre: z
    .string()
    .transform(normalizarEspacios)
    .pipe(
      z
        .string()
        .min(1, 'Ponle un nombre a la configuración.')
        .min(
          LIMITES.nombreConfiguracion.min,
          `El nombre debe tener al menos ${LIMITES.nombreConfiguracion.min} caracteres.`
        )
        .max(
          LIMITES.nombreConfiguracion.max,
          `El nombre no puede superar los ${LIMITES.nombreConfiguracion.max} caracteres.`
        )
    ),
});

export type GuardarConfiguracionInput = z.input<typeof guardarConfiguracionSchema>;
export type GuardarConfiguracionData = z.output<typeof guardarConfiguracionSchema>;

export const eliminarConfiguracionSchema = z.object({ id: z.uuid() });

export const finalizarSesionSchema = z.object({ sesionId: z.uuid() });
