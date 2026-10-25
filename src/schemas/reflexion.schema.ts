import { z } from 'zod';

/** Límite compartido con la restricción CHECK de `reflexion.contenido`. */
export const LIMITE_REFLEXION = 2000;

/**
 * La reflexión del estudiante al terminar su práctica. Un texto vacío la retira, así que se acepta:
 * la base de datos decide (`guardar_reflexion`).
 */
export const guardarReflexionSchema = z.object({
  sesionId: z.uuid(),
  contenido: z
    .string('Escribe tu reflexión.')
    .trim()
    .max(LIMITE_REFLEXION, `La reflexión no puede superar ${LIMITE_REFLEXION} caracteres.`),
});

export type GuardarReflexion = z.infer<typeof guardarReflexionSchema>;
