/**
 * HU-10 · T02 — Colisiones del estudiante con la sala y el mobiliario.
 *
 * Decisión de diseño: en lugar de raycasting contra la malla completa, cada mueble registra
 * su caja delimitadora (AABB) en el plano XZ, calculada a partir de su geometría real
 * (procedural o GLB) al montarse. El estudiante es un círculo de radio `radio`. Esto:
 *   - funciona con salas que no son una caja perfecta (muebles, pasillos, esquinas),
 *   - cuesta O(n) por fotograma con n ≈ 10–20 obstáculos (despreciable en una iGPU),
 *   - permite "deslizarse" a lo largo de las paredes resolviendo cada eje por separado.
 * Los límites de navegación del JSON acotan además la posición de la cámara.
 */

export interface CajaXZ {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PuntoXZ {
  x: number;
  z: number;
}

/** ¿Un círculo de centro `p` y radio `radio` se superpone con la caja? */
export function circuloIntersectaCaja(p: PuntoXZ, radio: number, caja: CajaXZ): boolean {
  const cercanoX = Math.min(Math.max(p.x, caja.minX), caja.maxX);
  const cercanoZ = Math.min(Math.max(p.z, caja.minZ), caja.maxZ);
  const dx = p.x - cercanoX;
  const dz = p.z - cercanoZ;
  return dx * dx + dz * dz < radio * radio;
}

function limitar(valor: number, min: number, max: number): number {
  return Math.min(Math.max(valor, min), max);
}

/**
 * Calcula la nueva posición tras aplicar `desplazamiento`, respetando los límites y los
 * obstáculos. Los ejes se resuelven por separado para que el estudiante se deslice a lo
 * largo de un obstáculo en lugar de quedarse pegado.
 *
 * Si el estudiante ya está dentro de un obstáculo (p. ej. un mueble mal ubicado sobre el
 * punto de aparición), ese obstáculo se ignora para que pueda salir de él.
 */
export function resolverMovimiento(
  posicion: PuntoXZ,
  desplazamiento: PuntoXZ,
  obstaculos: readonly CajaXZ[],
  limites: CajaXZ,
  radio: number
): PuntoXZ {
  const activos = obstaculos.filter(caja => !circuloIntersectaCaja(posicion, radio, caja));
  const choca = (p: PuntoXZ) => activos.some(caja => circuloIntersectaCaja(p, radio, caja));

  let x = limitar(posicion.x + desplazamiento.x, limites.minX, limites.maxX);
  if (choca({ x, z: posicion.z })) x = posicion.x;

  let z = limitar(posicion.z + desplazamiento.z, limites.minZ, limites.maxZ);
  if (choca({ x, z })) z = posicion.z;

  return { x, z };
}
