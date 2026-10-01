/**
 * NPC disponibles en el laboratorio. Cada uno es un GLB en `public/models/laboratorio/` con su
 * esqueleto y las 13 animaciones de `acciones.ts` (exportados desde los prototipos de Claude
 * Design). Para añadir uno: copia el GLB a esa carpeta y agrega su entrada aquí.
 */

export interface ModeloNpc {
  /** Identificador para la URL (`/laboratorio/npc?npc=tomas`). */
  id: string;
  nombre: string;
  /** Archivo dentro de `public/models/laboratorio/`. */
  archivo: string;
  /** Color de acento de la tarjeta del selector. */
  color: string;
}

export const CARPETA_MODELOS_LABORATORIO = '/models/laboratorio';

export const CATALOGO_NPC = [
  { id: 'tomas', nombre: 'Tomás', archivo: 'npc_tomas.glb', color: '#416180' },
  { id: 'ernesto', nombre: 'Ernesto', archivo: 'npc_ernesto.glb', color: '#6b5d52' },
  { id: 'leo', nombre: 'Leo', archivo: 'npc_leo.glb', color: '#c0714f' },
  { id: 'lucia', nombre: 'Lucía', archivo: 'npc_lucia.glb', color: '#7f9a86' },
  { id: 'marina', nombre: 'Marina', archivo: 'npc_marina.glb', color: '#5980a6' },
  { id: 'rosa', nombre: 'Rosa', archivo: 'npc_rosa.glb', color: '#b5835a' },
] as const satisfies readonly ModeloNpc[];

export type IdModeloNpc = (typeof CATALOGO_NPC)[number]['id'];

/** NPC que se muestra si la URL no indica otro (o indica uno que no existe). */
export const NPC_POR_DEFECTO: ModeloNpc = CATALOGO_NPC[0];

export function urlModeloNpc(modelo: ModeloNpc): string {
  return `${CARPETA_MODELOS_LABORATORIO}/${modelo.archivo}`;
}

/** Busca un NPC por id; si no existe, devuelve el NPC por defecto. */
export function buscarModeloNpc(id: string | null | undefined): ModeloNpc {
  return CATALOGO_NPC.find(m => m.id === id) ?? NPC_POR_DEFECTO;
}
