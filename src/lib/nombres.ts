/** Iniciales para un avatar ("Ana María Gómez" → "AG"). */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  const primera = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : '';
  return (primera + ultima).toUpperCase();
}

/** "Ana María Gómez" → "Ana". */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? '';
}
