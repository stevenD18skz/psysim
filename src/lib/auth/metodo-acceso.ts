/**
 * Dominio de las cuentas de prueba (seeds y E2E). Son las únicas cuentas de estudiante que entran
 * con contraseña: los estudiantes reales entran con Google.
 */
export const DOMINIO_DE_PRUEBA = 'psysim.test';

export function esCuentaDePrueba(correo: string | null | undefined): boolean {
  return (correo ?? '').toLowerCase().endsWith(`@${DOMINIO_DE_PRUEBA}`);
}

/**
 * Métodos con los que se abrió la sesión, según el `amr` del token de acceso (`password`,
 * `oauth`, `otp`…). Supabase lo escribe como una lista de textos o de `{ method, timestamp }`.
 *
 * No verifica la firma: se llama con el token de una sesión que el servidor de Auth acaba de
 * validar (`getUser()`). Si el token no se puede leer devuelve una lista vacía, para no dejar
 * fuera a nadie por un formato inesperado.
 */
export function metodosDeAcceso(tokenDeAcceso: string | null | undefined): string[] {
  const cuerpo = tokenDeAcceso?.split('.')[1];
  if (!cuerpo) return [];
  try {
    const datos: unknown = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    if (typeof datos !== 'object' || datos === null || !('amr' in datos)) return [];
    const amr = datos.amr;
    if (!Array.isArray(amr)) return [];
    return amr
      .map((entrada: unknown) =>
        typeof entrada === 'string'
          ? entrada
          : typeof entrada === 'object' && entrada !== null && 'method' in entrada
            ? entrada.method
            : null
      )
      .filter((metodo): metodo is string => typeof metodo === 'string');
  } catch {
    return [];
  }
}
