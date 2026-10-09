import { z } from 'zod';

/** Roles que el Administrador puede asignar a una cuenta del equipo docente. */
export const ROLES_EQUIPO = ['docente', 'superadmin'] as const;
export type RolEquipo = (typeof ROLES_EQUIPO)[number];

/** Cómo entra el docente: con su cuenta de Google o con una contraseña temporal. */
export const ACCESOS_DOCENTE = ['google', 'contrasena'] as const;
export type AccesoDocente = (typeof ACCESOS_DOCENTE)[number];

export const LIMITES_DOCENTE = {
  nombre: { min: 3, max: 120 },
  codigo: { min: 1, max: 30 },
  correo: { max: 254 },
} as const;

const nombreDocenteSchema = z
  .string()
  .trim()
  .min(LIMITES_DOCENTE.nombre.min, 'Escribe el nombre completo.')
  .max(LIMITES_DOCENTE.nombre.max, 'El nombre es demasiado largo.');

const correoDocenteSchema = z
  .string()
  .trim()
  .min(1, 'Ingresa el correo del docente.')
  .max(LIMITES_DOCENTE.correo.max, 'El correo es demasiado largo.')
  .pipe(z.email('Ingresa un correo electrónico válido.'))
  .transform(correo => correo.toLowerCase());

const codigoDocenteSchema = z
  .string()
  .trim()
  .min(LIMITES_DOCENTE.codigo.min, 'Ingresa el código institucional.')
  .max(LIMITES_DOCENTE.codigo.max, 'El código es demasiado largo.');

const datosDocenteSchema = z.object({
  nombre: nombreDocenteSchema,
  correo: correoDocenteSchema,
  codigo: codigoDocenteSchema,
  rol: z.enum(ROLES_EQUIPO, 'Elige el rol de la cuenta.'),
});

/** El Administrador crea la cuenta de un docente (o de otro Administrador). */
export const crearDocenteSchema = datosDocenteSchema.extend({
  acceso: z.enum(ACCESOS_DOCENTE, 'Elige cómo entrará a PsySim.'),
});

export type CrearDocenteInput = z.input<typeof crearDocenteSchema>;
export type CrearDocenteData = z.output<typeof crearDocenteSchema>;

/** Corrige los datos o el rol de una cuenta del equipo docente. */
export const actualizarDocenteSchema = datosDocenteSchema.extend({ id: z.uuid() });

export const idDocenteSchema = z.object({ id: z.uuid() });

export const cambiarEstadoDocenteSchema = z.object({ id: z.uuid(), activo: z.boolean() });
