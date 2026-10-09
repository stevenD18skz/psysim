import { z } from 'zod';

import { DOMINIO_ESTUDIANTES } from '@/lib/auth/google';

import { codigoEstudianteSchema, nombreEstudianteSchema } from './configuracion.schema';

/** Correo de Google institucional del estudiante: con él inicia sesión. */
export const correoEstudianteSchema = z
  .string()
  .trim()
  .min(1, 'Ingresa el correo institucional del estudiante.')
  .max(254, 'El correo es demasiado largo.')
  .pipe(z.email('Ingresa un correo electrónico válido.'))
  .transform(correo => correo.toLowerCase())
  .refine(
    correo => correo.endsWith(`@${DOMINIO_ESTUDIANTES}`),
    `Usa el correo institucional (@${DOMINIO_ESTUDIANTES}).`
  );

/** El docente registra a un estudiante: se le crea la cuenta para entrar con Google. */
export const registrarEstudianteSchema = z.object({
  codigo: codigoEstudianteSchema,
  nombre: nombreEstudianteSchema,
  correo: correoEstudianteSchema,
});

export type RegistrarEstudianteInput = z.input<typeof registrarEstudianteSchema>;
export type RegistrarEstudianteData = z.output<typeof registrarEstudianteSchema>;

/** Corrige el nombre o el correo de un estudiante registrado (el código no cambia). */
export const actualizarEstudianteSchema = registrarEstudianteSchema
  .omit({ codigo: true })
  .extend({ id: z.uuid() });

export type ActualizarEstudianteInput = z.input<typeof actualizarEstudianteSchema>;

/** El docente elimina a un estudiante con todo su historial. */
export const eliminarEstudianteSchema = z.object({ id: z.uuid() });
