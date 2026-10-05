import { z } from 'zod';

import { IDS_ACTITUD, IDS_RIESGO, IDS_SINTOMA, RUTAS_CONSULTORIO } from '@/lib/casos/opciones';

import { promptSchema } from './configuracion.schema';

/** Límites compartidos con las restricciones CHECK de `escenario` y `npc`. */
export const LIMITES_CASO = {
  titulo: { min: 3, max: 120 },
  competencia: { min: 3, max: 120 },
  nombre: { min: 2, max: 80 },
  edad: { min: 1, max: 110 },
  ocupacion: { max: 80 },
  situacion: { min: 20, max: 600 },
  extra: { max: 400 },
  fraseApertura: { min: 5, max: 300 },
  notas: { max: 1200 },
} as const;

const texto = (min: number, max: number, etiqueta: string) =>
  z
    .string()
    .trim()
    .min(1, `${etiqueta} es obligatorio.`)
    .min(min, `${etiqueta} debe tener al menos ${min} caracteres.`)
    .max(max, `${etiqueta} no puede superar los ${max} caracteres.`);

const opcional = (max: number, etiqueta: string) =>
  z.string().trim().max(max, `${etiqueta} no puede superar los ${max} caracteres.`);

/**
 * Datos del constructor guiado. Es también lo que se guarda en `escenario.borrador` para poder
 * volver a editar el caso.
 */
export const camposCasoSchema = z.object({
  nombre: texto(LIMITES_CASO.nombre.min, LIMITES_CASO.nombre.max, 'El nombre'),
  edad: z
    .number('Indica la edad del paciente.')
    .int('La edad debe ser un número entero.')
    .min(LIMITES_CASO.edad.min, 'La edad no es válida.')
    .max(LIMITES_CASO.edad.max, 'La edad no es válida.'),
  ocupacion: opcional(LIMITES_CASO.ocupacion.max, 'La ocupación'),
  situacion: texto(LIMITES_CASO.situacion.min, LIMITES_CASO.situacion.max, 'La situación'),
  sintomas: z.array(z.enum(IDS_SINTOMA)),
  sintomasExtra: opcional(LIMITES_CASO.extra.max, 'El texto'),
  actitudes: z.array(z.enum(IDS_ACTITUD)),
  seAbreSi: opcional(LIMITES_CASO.extra.max, 'El texto'),
  seCierraSi: opcional(LIMITES_CASO.extra.max, 'El texto'),
  riesgo: z.enum(IDS_RIESGO),
  fraseApertura: z
    .string()
    .trim()
    .max(LIMITES_CASO.fraseApertura.max, 'La frase es demasiado larga.'),
  notas: opcional(LIMITES_CASO.notas.max, 'Las notas'),
});

export type CamposCaso = z.infer<typeof camposCasoSchema>;

const datosGeneralesSchema = z.object({
  titulo: texto(LIMITES_CASO.titulo.min, LIMITES_CASO.titulo.max, 'El título'),
  categoria: z.enum(['clinico', 'cotidiano'], 'Elige una categoría.'),
  dificultad: z.enum(['basico', 'intermedio', 'avanzado'], 'Elige un nivel.'),
  competenciaCentral: texto(
    LIMITES_CASO.competencia.min,
    LIMITES_CASO.competencia.max,
    'La competencia'
  ),
  consultorio: z.enum(RUTAS_CONSULTORIO, 'Elige un consultorio.'),
});

/**
 * Formulario completo del constructor. En modo texto el prompt lo redacta el docente
 * (`promptManual`); en modo guiado se compone a partir de los campos.
 */
export const casoFormSchema = datosGeneralesSchema
  .extend(camposCasoSchema.shape)
  .extend({ modoTexto: z.boolean(), promptManual: z.string() })
  .superRefine((valor, ctx) => {
    if (valor.modoTexto) {
      const resultado = promptSchema.safeParse(valor.promptManual);
      if (!resultado.success) {
        ctx.addIssue({
          code: 'custom',
          path: ['promptManual'],
          message: resultado.error.issues[0]?.message ?? 'El prompt no es válido.',
        });
      }
      return;
    }
    if (valor.fraseApertura.length < LIMITES_CASO.fraseApertura.min) {
      ctx.addIssue({
        code: 'custom',
        path: ['fraseApertura'],
        message: `Escribe lo que dirá primero el paciente (mínimo ${LIMITES_CASO.fraseApertura.min} caracteres).`,
      });
    }
  });

export type CasoFormInput = z.input<typeof casoFormSchema>;
export type CasoFormData = z.output<typeof casoFormSchema>;

/** Lo que se guarda en `escenario.borrador`: permite reabrir el caso en el constructor. */
export const borradorCasoSchema = z.object({
  campos: camposCasoSchema,
  modoTexto: z.boolean(),
  promptManual: z.string(),
});

export type BorradorCaso = z.infer<typeof borradorCasoSchema>;

export const idCasoSchema = z.object({ id: z.uuid() });

export const actualizarCasoSchema = z.object({ id: z.uuid(), caso: casoFormSchema });

/** Guardar un escenario oficial con el prompt ajustado como caso propio. */
export const guardarVarianteSchema = z.object({
  escenarioId: z.uuid('Selecciona un escenario para continuar.'),
  titulo: datosGeneralesSchema.shape.titulo,
  prompt: promptSchema,
});

/** Prueba del paciente en el constructor (no se guarda nada). */
export const probarPacienteSchema = z.object({
  prompt: promptSchema,
  nombre: z.string().trim().max(LIMITES_CASO.nombre.max).optional(),
  mensaje: z.string().trim().min(1, 'Escribe un mensaje.').max(1000),
  historial: z
    .array(
      z.object({
        rol: z.enum(['user', 'assistant']),
        contenido: z.string().trim().min(1).max(4000),
      })
    )
    .max(20),
});
