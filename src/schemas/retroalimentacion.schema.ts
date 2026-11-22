import { z } from 'zod';

/** Límites compartidos con las restricciones CHECK de `retroalimentacion` y `anotacion`. */
export const LIMITES_RETROALIMENTACION = {
  comentarioGeneral: 5000,
  comentario: 2000,
  nota: { min: 0, max: 5 },
} as const;

/** Nota de 0.0 a 5.0 con un decimal (escala colombiana). */
export const notaSchema = z
  .number('Escribe la nota con números, p. ej. 4,5.')
  .min(LIMITES_RETROALIMENTACION.nota.min, 'La nota mínima es 0,0.')
  .max(LIMITES_RETROALIMENTACION.nota.max, 'La nota máxima es 5,0.')
  .refine(nota => Math.abs(nota * 10 - Math.round(nota * 10)) < 1e-9, 'Usa un solo decimal.');

/** "4,5" o "4.5" → 4.5; vacío → `null`; texto no numérico → `NaN` (lo rechaza `notaSchema`). */
export function leerNota(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  return /^\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : Number.NaN;
}

const comentarioGeneralSchema = z
  .string()
  .trim()
  .max(
    LIMITES_RETROALIMENTACION.comentarioGeneral,
    `La retroalimentación no puede superar los ${LIMITES_RETROALIMENTACION.comentarioGeneral.toLocaleString('es-CO')} caracteres.`
  );

export const guardarRetroalimentacionSchema = z
  .object({
    sesionId: z.uuid(),
    modo: z.enum(['borrador', 'publicar', 'editar']),
    version: z.iso.datetime({ offset: true }).nullable(),
    comentarioGeneral: comentarioGeneralSchema,
    nota: notaSchema.nullable(),
  })
  .refine(({ modo, comentarioGeneral }) => modo === 'borrador' || comentarioGeneral.length > 0, {
    path: ['comentarioGeneral'],
    message: 'Escribe la retroalimentación general antes de guardar cambios públicos.',
  })
  .refine(({ modo, nota }) => modo === 'borrador' || nota !== null, {
    path: ['nota'],
    message: 'Pon la nota antes de guardar cambios públicos.',
  });

export type ModoRevision = z.infer<typeof guardarRetroalimentacionSchema>['modo'];

export const borradorRevisionSchema = z.object({
  comentario: z.string().max(LIMITES_RETROALIMENTACION.comentarioGeneral),
  notaTexto: z.string(),
  version: z.iso.datetime({ offset: true }).nullable(),
});

const comentarioSchema = z
  .string()
  .trim()
  .min(1, 'Escribe el comentario.')
  .max(
    LIMITES_RETROALIMENTACION.comentario,
    `El comentario no puede superar los ${LIMITES_RETROALIMENTACION.comentario.toLocaleString('es-CO')} caracteres.`
  );

/** Subrayar una frase de una intervención del estudiante y comentarla. */
export const crearAnotacionSchema = z
  .object({
    id: z.uuid(),
    sesionId: z.uuid(),
    mensajeId: z.uuid(),
    inicio: z.int().min(0),
    fin: z.int().min(1),
    comentario: comentarioSchema,
  })
  .refine(({ inicio, fin }) => fin > inicio, {
    path: ['fin'],
    message: 'Selecciona un fragmento.',
  });

export type CrearAnotacionInput = z.input<typeof crearAnotacionSchema>;

export const borradoresAnotacionSchema = z.array(
  z.object({
    tipo: z.enum(['nueva', 'edicion']),
    id: z.uuid(),
    mensajeId: z.uuid(),
    inicio: z.int().min(0),
    fin: z.int().min(1),
    comentario: z.string().max(LIMITES_RETROALIMENTACION.comentario),
  })
);

export type BorradorAnotacion = z.infer<typeof borradoresAnotacionSchema>[number];

export const actualizarAnotacionSchema = z.object({ id: z.uuid(), comentario: comentarioSchema });

export const idAnotacionSchema = z.object({ id: z.uuid() });

export const idSesionSchema = z.object({ sesionId: z.uuid() });
