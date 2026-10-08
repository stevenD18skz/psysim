import { z } from 'zod';

/**
 * Límites compartidos con las restricciones CHECK de la base de datos
 * (supabase/migrations/20260930010000_escenarios_npc_sesiones.sql).
 */
export const LIMITES = {
  codigoEstudiante: { min: 5, max: 12 },
  nombreEstudiante: { min: 2, max: 120 },
  prompt: { min: 20, max: 8000 },
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

/** Días que el código de acceso es válido antes de canjearse (el docente elige). */
export const VIGENCIAS_DIAS = [1, 3, 7, 30] as const;
export type VigenciaDias = (typeof VIGENCIAS_DIAS)[number];
export const VIGENCIA_POR_DEFECTO: VigenciaDias = 7;

/**
 * Formulario de /configuracion: el docente elige el caso, ajusta al paciente y asigna la
 * simulación a uno de sus estudiantes con cuenta. Genera un código de acceso individual.
 */
export const generarAsignacionSchema = z.object({
  escenarioId: escenarioIdSchema,
  promptSistema: promptSchema,
  estudianteId: z.uuid('Elige al estudiante que va a practicar.'),
  vigenciaDias: z.literal(VIGENCIAS_DIAS, 'Elige cuánto tiempo será válido el código.'),
});

export type GenerarAsignacionInput = z.input<typeof generarAsignacionSchema>;
export type GenerarAsignacionData = z.output<typeof generarAsignacionSchema>;

export const finalizarSesionSchema = z.object({ sesionId: z.uuid() });

/** HU-23: el estudiante confirma las instrucciones y comienza la simulación. */
export const comenzarSesionSchema = z.object({ sesionId: z.uuid() });
