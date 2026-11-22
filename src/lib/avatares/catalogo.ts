export const AVATARES = {
  brote: 'Brote',
  sol: 'Sol',
  marea: 'Marea',
  luna: 'Luna',
  flor: 'Flor',
  brujula: 'Brújula',
  montana: 'Montaña',
  horizonte: 'Horizonte',
  orbita: 'Órbita',
  concha: 'Concha',
  hoja: 'Hoja',
  destello: 'Destello',
  prisma: 'Prisma',
  brisa: 'Brisa',
  pluma: 'Pluma',
} as const;

export type AvatarId = keyof typeof AVATARES;

export function esAvatarId(id: unknown): id is AvatarId {
  return typeof id === 'string' && Object.hasOwn(AVATARES, id);
}
