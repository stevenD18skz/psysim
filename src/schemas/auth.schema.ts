import { z } from 'zod';

/** Debe coincidir con `minimum_password_length` de Supabase Auth. */
export const LONGITUD_MINIMA_CONTRASENA = 8;
/** Límite de bcrypt: Supabase ignora los caracteres a partir del 72. */
export const LONGITUD_MAXIMA_CONTRASENA = 72;

export const loginSchema = z.object({
  correo: z
    .string()
    .trim()
    .min(1, 'Ingresa tu correo institucional.')
    .max(254, 'El correo es demasiado largo.')
    .pipe(z.email('Ingresa un correo electrónico válido.'))
    .transform(correo => correo.toLowerCase()),
  contrasena: z
    .string()
    .min(1, 'Ingresa tu contraseña.')
    .min(
      LONGITUD_MINIMA_CONTRASENA,
      `La contraseña debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`
    )
    .max(
      LONGITUD_MAXIMA_CONTRASENA,
      `La contraseña no puede superar los ${LONGITUD_MAXIMA_CONTRASENA} caracteres.`
    ),
});

export type LoginInput = z.input<typeof loginSchema>;
export type LoginData = z.output<typeof loginSchema>;
