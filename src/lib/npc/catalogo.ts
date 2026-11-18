import { type Voz } from '@/lib/audio/voz';

/**
 * Personajes 3D (NPC) disponibles. Cada uno es un GLB en `public/models/personajes/` con el mismo
 * esqueleto y las 13 animaciones de `acciones.ts`. Los seis originales vienen de los prototipos
 * de Claude Design; las variantes se generan con `scripts/generar-personajes.mjs`.
 * Los usan el laboratorio y, como pacientes, las escenas de la simulación (campo
 * `npc.personaje` del JSON de escena).
 *
 * Para añadir uno: copia el GLB a esa carpeta y agrega su entrada aquí. Debe conservar los
 * nombres de huesos y clips (lo verifica `npc.test.ts`).
 */

export interface ModeloNpc {
  /** Identificador para la URL (`/laboratorio/npc?npc=tomas`) y el JSON de escena. */
  id: string;
  nombre: string;
  /** Archivo dentro de `public/models/personajes/`. */
  archivo: string;
  /** Color de acento de la tarjeta del selector. */
  color: string;
  /** Aspecto del personaje, para textos alternativos y la documentación. */
  descripcion: string;
  /** Voz inventada (balbuceo) con la que "habla" en la simulación. */
  voz: Voz;
}

export const CARPETA_MODELOS_PERSONAJES = '/models/personajes';

export const CATALOGO_NPC = [
  {
    id: 'tomas',
    nombre: 'Tomás',
    archivo: 'npc_tomas.glb',
    color: '#416180',
    descripcion: 'Hombre joven con gorro de lana y bufanda',
    voz: { tono: 150, ritmo: 1 },
  },
  {
    id: 'ernesto',
    nombre: 'Ernesto',
    archivo: 'npc_ernesto.glb',
    color: '#6b5d52',
    descripcion: 'Hombre mayor con barba blanca, gorra y chaleco',
    voz: { tono: 115, ritmo: 0.85 },
  },
  {
    id: 'leo',
    nombre: 'Leo',
    archivo: 'npc_leo.glb',
    color: '#c0714f',
    descripcion: 'Estudiante joven con buzo verde y morral',
    voz: { tono: 165, ritmo: 1.1 },
  },
  {
    id: 'lucia',
    nombre: 'Lucía',
    archivo: 'npc_lucia.glb',
    color: '#7f9a86',
    descripcion: 'Mujer joven pelirroja con suéter amarillo',
    voz: { tono: 255, ritmo: 1.05 },
  },
  {
    id: 'marina',
    nombre: 'Marina',
    archivo: 'npc_marina.glb',
    color: '#5980a6',
    descripcion: 'Mujer adulta con pañoleta y delantal',
    voz: { tono: 225, ritmo: 1 },
  },
  {
    id: 'rosa',
    nombre: 'Rosa',
    archivo: 'npc_rosa.glb',
    color: '#b5835a',
    descripcion: 'Mujer mayor de cabello cano, gafas y chal',
    voz: { tono: 200, ritmo: 0.9 },
  },
  {
    id: 'julian',
    nombre: 'Julián',
    archivo: 'npc_julian.glb',
    color: '#416b96',
    descripcion: 'Hombre joven de cabello ondulado con chaqueta azul y camiseta clara',
    voz: { tono: 160, ritmo: 1.08 },
  },
  {
    id: 'hernan',
    nombre: 'Hernán',
    archivo: 'npc_hernan.glb',
    color: '#80404d',
    descripcion: 'Hombre de mediana edad con entradas, canas, bigote y polo vinotinto',
    voz: { tono: 130, ritmo: 0.95 },
  },
  {
    id: 'yolanda',
    nombre: 'Yolanda',
    archivo: 'npc_yolanda.glb',
    color: '#69744e',
    descripcion: 'Mujer morena con trenza baja, blusa verde oliva y pantalón oscuro',
    voz: { tono: 215, ritmo: 0.95 },
  },
  {
    id: 'sara',
    nombre: 'Sara',
    archivo: 'npc_sara.glb',
    color: '#9b84b3',
    descripcion: 'Adolescente con coleta, buzo lila de manga larga y pantalón azul',
    voz: { tono: 245, ritmo: 1.03 },
  },
  {
    id: 'daniela',
    nombre: 'Daniela',
    archivo: 'npc_daniela.glb',
    color: '#c47764',
    descripcion: 'Mujer joven morena de cabello corto rizado con chaqueta coral',
    voz: { tono: 235, ritmo: 1.07 },
  },
  {
    id: 'paola',
    nombre: 'Paola',
    archivo: 'npc_paola.glb',
    color: '#3d737d',
    descripcion: 'Mujer de cabello castaño hasta los hombros con blusa azul petróleo',
    voz: { tono: 220, ritmo: 1 },
  },
] as const satisfies readonly ModeloNpc[];

export type IdModeloNpc = (typeof CATALOGO_NPC)[number]['id'];

export const IDS_MODELO_NPC = CATALOGO_NPC.map(m => m.id) as [IdModeloNpc, ...IdModeloNpc[]];

/** NPC que se muestra si la URL no indica otro (o indica uno que no existe). */
export const NPC_POR_DEFECTO: ModeloNpc = CATALOGO_NPC[0];

export function urlModeloNpc(modelo: ModeloNpc): string {
  return `${CARPETA_MODELOS_PERSONAJES}/${modelo.archivo}`;
}

/** Busca un NPC por id; si no existe, devuelve el NPC por defecto. */
export function buscarModeloNpc(id: string | null | undefined): ModeloNpc {
  return CATALOGO_NPC.find(m => m.id === id) ?? NPC_POR_DEFECTO;
}
