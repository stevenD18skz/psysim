import { type EstadoAsignacion } from '@/types';

const LETRAS = 'abcdefghijklmnopqrstuvwxyz';

/** Formato del código de acceso, al estilo de Meet: tres, cuatro y tres letras. */
export const PATRON_CODIGO_ACCESO = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

/** Ruta pública del enlace que el docente puede enviar en lugar del código. */
export function rutaUnirse(codigo: string) {
  return `/unirse/${codigo}` as const;
}

/**
 * Código aleatorio `abc-defg-hij` (26^10 ≈ 1,4·10^14 combinaciones). Adivinar uno no sirve de
 * nada: solo lo puede canjear el estudiante al que se asignó. Si choca con uno existente, la base
 * de datos lo rechaza (único) y se genera otro.
 */
export function generarCodigoAcceso(): string {
  const valores = crypto.getRandomValues(new Uint32Array(10));
  const letras = Array.from(valores, valor => LETRAS[valor % LETRAS.length]).join('');
  return `${letras.slice(0, 3)}-${letras.slice(3, 7)}-${letras.slice(7)}`;
}

/**
 * Lo que escribe o pega el estudiante → código normalizado, o `null` si no lo es. Tolera
 * mayúsculas, espacios, guiones de más o de menos y el enlace completo
 * (`https://…/unirse/ABC-DEFG-HIJ`).
 */
export function normalizarCodigoAcceso(entrada: string): string | null {
  const coincidencia = entrada
    .trim()
    .match(/(?:^|[^a-z])([a-z]{3})[\s-]*([a-z]{4})[\s-]*([a-z]{3})\/?$/i);
  if (!coincidencia) return null;
  const [, a, b, c] = coincidencia;
  return `${a}-${b}-${c}`.toLowerCase();
}

/** Estado del código según sus fechas: el canje y la anulación mandan sobre el vencimiento. */
export function estadoAsignacion(
  fila: { sesionId: string | null; anuladaEn: string | null; expiraEn: string },
  ahora: Date = new Date()
): EstadoAsignacion {
  if (fila.sesionId) return 'usada';
  if (fila.anuladaEn) return 'anulada';
  return new Date(fila.expiraEn) <= ahora ? 'vencida' : 'pendiente';
}

/** Fecha de vencimiento a partir de ahora. */
export function calcularVencimiento(dias: number, ahora: Date = new Date()): Date {
  return new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000);
}

/** "1 día", "7 días". */
export function textoDias(dias: number): string {
  return `${dias} ${dias === 1 ? 'día' : 'días'}`;
}
