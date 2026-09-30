import { z } from 'zod';

/**
 * HU-09 · T01 — Estructura del archivo JSON que describe la escena 3D de un escenario
 * (public/scenes/e-XX.json). La documentación de cada campo está en public/scenes/README.md.
 *
 * Convenciones: unidades en metros, eje Y hacia arriba, suelo en y = 0, sala centrada en el
 * origen. El estudiante entra por +Z y el paciente se ubica hacia -Z. Rotaciones en grados.
 */

const vector3 = z.tuple([z.number(), z.number(), z.number()]);
const colorHex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Usa un color hexadecimal como #d97757.');
const grados = z.number().min(-360).max(360);
const escala = z.number().positive().max(100);

/** Ruta de un GLB relativa a la raíz de modelos (public/models o el bucket `modelos-3d`). */
export const rutaModeloSchema = z
  .string()
  .regex(
    /^(?!.*\.\.)[a-z0-9][a-z0-9/_-]*\.glb$/,
    'Ruta de modelo inválida: usa minúsculas, guiones y la extensión .glb (p. ej. props/sofa.glb).'
  );

export const TIPOS_MUEBLE = [
  'sofa',
  'sillon',
  'silla',
  'mesa-centro',
  'mesa-auxiliar',
  'escritorio',
  'estanteria',
  'planta',
  'lampara-pie',
  'alfombra',
  'cuadro',
  'ventana',
  'reloj',
  /** Objeto decorativo solo GLB (taza, libros, lámpara de escritorio…); sin versión procedural. */
  'decoracion',
] as const;

export const tipoMuebleSchema = z.enum(TIPOS_MUEBLE);

/**
 * Normalización de un GLB de terceros: los paquetes de modelos mezclan unidades (m, cm, …) y
 * orígenes. Si se define, el modelo se escala de forma uniforme hasta la medida objetivo (en
 * metros), se apoya en el suelo (y = 0) y se centra en X/Z antes de aplicar `escala`.
 */
export const ajusteModeloSchema = z
  .object({
    alto: z.number().positive().max(10).optional(),
    ancho: z.number().positive().max(20).optional(),
    /** Giro previo en grados para corregir modelos que no miran hacia +Z. */
    girar: grados.default(0),
  })
  .refine(a => a.alto === undefined || a.ancho === undefined, {
    message: 'Define `alto` o `ancho`, no ambos.',
  });

export type AjusteModelo = z.output<typeof ajusteModeloSchema>;

const muebleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'El id del mueble debe ser kebab-case.'),
  tipo: tipoMuebleSchema,
  /** Si se omite (o el GLB no carga) se dibuja un mueble procedural del mismo tipo. */
  modelo: rutaModeloSchema.optional(),
  ajuste: ajusteModeloSchema.optional(),
  posicion: vector3,
  rotacion: grados.default(0),
  escala: escala.default(1),
  /** Color principal del mueble procedural. */
  color: colorHex.optional(),
  /** Si el estudiante choca con él. Las alfombras, cuadros y ventanas no colisionan. */
  colision: z.boolean().default(true),
});

const limitesSchema = z
  .object({ min: vector3, max: vector3 })
  .refine(({ min, max }) => min.every((valor, i) => valor < max[i]!), {
    message: 'Cada componente de `min` debe ser menor que la de `max`.',
  });

export const escenaSchema = z
  .object({
    version: z.literal(1),
    nombre: z.string().min(1),
    sala: z.object({
      ancho: z.number().min(2).max(40),
      largo: z.number().min(2).max(40),
      alto: z.number().min(2).max(10),
      colores: z.object({
        paredes: colorHex,
        acento: colorHex,
        suelo: colorHex,
        techo: colorHex,
        zocalo: colorHex,
      }),
    }),
    /** Modelo GLB opcional del entorno completo; si existe, reemplaza la sala procedural. */
    entorno: z
      .object({
        modelo: rutaModeloSchema,
        ajuste: ajusteModeloSchema.optional(),
        posicion: vector3.default([0, 0, 0]),
        rotacion: grados.default(0),
        escala: escala.default(1),
      })
      .optional(),
    mobiliario: z.array(muebleSchema).max(80),
    npc: z.object({
      modelo: rutaModeloSchema.optional(),
      ajuste: ajusteModeloSchema.optional(),
      posicion: vector3,
      rotacion: grados,
      escala: escala.default(1),
      postura: z.enum(['sentado', 'de-pie']).default('sentado'),
      /** Nombre del clip de animación en reposo dentro del GLB. */
      animacionIdle: z.string().min(1).default('Idle'),
      colorRopa: colorHex.default('#6f8f7a'),
      colorPiel: colorHex.default('#c99a7b'),
      colorCabello: colorHex.default('#3b2a22'),
    }),
    camara: z.object({
      posicion: vector3,
      mirarA: vector3,
      fov: z.number().min(30).max(100).default(60),
    }),
    navegacion: z.object({
      limites: limitesSchema,
      /** Radio del "cuerpo" del estudiante para las colisiones, en metros. */
      radioJugador: z.number().min(0.1).max(1).default(0.3),
      /** Velocidad al caminar, en metros por segundo. */
      velocidad: z.number().min(0.5).max(6).default(2),
    }),
    iluminacion: z.object({
      fondo: colorHex,
      ambiental: z.object({ intensidad: z.number().min(0).max(5), color: colorHex }),
      hemisferica: z.object({
        intensidad: z.number().min(0).max(5),
        cielo: colorHex,
        suelo: colorHex,
      }),
      direccional: z.object({
        intensidad: z.number().min(0).max(10),
        color: colorHex,
        posicion: vector3,
      }),
      /** Luces cálidas de lámparas; cada una añade coste de render, úsalas con moderación. */
      puntuales: z
        .array(
          z.object({
            posicion: vector3,
            color: colorHex,
            intensidad: z.number().min(0).max(20),
            distancia: z.number().min(0).max(30),
          })
        )
        .max(4)
        .default([]),
    }),
  })
  .superRefine((escena, ctx) => {
    const { min, max } = escena.navegacion.limites;
    const dentro = (p: readonly number[]) => p.every((v, i) => v >= min[i]! && v <= max[i]!);

    if (!dentro(escena.camara.posicion)) {
      ctx.addIssue({
        code: 'custom',
        path: ['camara', 'posicion'],
        message: 'La posición inicial de la cámara debe estar dentro de los límites de navegación.',
      });
    }

    const ids = escena.mobiliario.map(m => m.id);
    const duplicado = ids.find((id, i) => ids.indexOf(id) !== i);
    if (duplicado) {
      ctx.addIssue({
        code: 'custom',
        path: ['mobiliario'],
        message: `El id de mueble "${duplicado}" está repetido.`,
      });
    }
  });

export type Escena = z.output<typeof escenaSchema>;
export type Mueble = Escena['mobiliario'][number];
export type TipoMueble = z.infer<typeof tipoMuebleSchema>;
export type Vector3Tuple = [number, number, number];
