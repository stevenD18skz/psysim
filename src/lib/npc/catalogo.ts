import { type Voz } from '@/lib/audio/voz';

/**
 * Personajes 3D (NPC) disponibles. Cada uno es un GLB en `public/models/personajes/` con el mismo
 * esqueleto y las 13 animaciones de `acciones.ts` (exportados desde los prototipos de Claude
 * Design). Los usan el laboratorio y, como pacientes, las escenas de la simulación (campo
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
