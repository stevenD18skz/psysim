/**
 * Dominio de las cuentas de prueba (seeds y E2E). Son las únicas cuentas de estudiante que entran
 * con contraseña: los estudiantes reales entran con Google.
 */
export const DOMINIO_DE_PRUEBA = 'psysim.test';

export function esCuentaDePrueba(correo: string | null | undefined): boolean {
  return (correo ?? '').toLowerCase().endsWith(`@${DOMINIO_DE_PRUEBA}`);
}

/** Una forma de entrar usada en la sesión y cuándo se usó (segundos desde 1970), si se sabe. */
export interface EntradaDeAcceso {
  metodo: string;
  momento: number | null;
}

/**
 * Con qué se abrió la sesión, según el `amr` del token de acceso (`password`, `oauth`, `otp`…).
 * Supabase lo escribe como una lista de textos o de `{ method, timestamp }`.
 *
 * No verifica la firma: se llama con el token de una sesión que el servidor de Auth acaba de
 * validar (`getUser()`) o de emitir. Si el token no se puede leer devuelve una lista vacía, para
 * no dejar fuera a nadie por un formato inesperado.
 */
export function entradasDeAcceso(tokenDeAcceso: string | null | undefined): EntradaDeAcceso[] {
  const cuerpo = tokenDeAcceso?.split('.')[1];
  if (!cuerpo) return [];
  try {
    const datos: unknown = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    if (typeof datos !== 'object' || datos === null || !('amr' in datos)) return [];
    const amr = datos.amr;
    if (!Array.isArray(amr)) return [];
    return amr.flatMap((entrada: unknown): EntradaDeAcceso[] => {
      if (typeof entrada === 'string') return [{ metodo: entrada, momento: null }];
      if (typeof entrada !== 'object' || entrada === null || !('method' in entrada)) return [];
      if (typeof entrada.method !== 'string') return [];
      const momento =
        'timestamp' in entrada && typeof entrada.timestamp === 'number' ? entrada.timestamp : null;
      return [{ metodo: entrada.method, momento }];
    });
  } catch {
    return [];
  }
}

/** Solo los métodos (`password`, `oauth`…) con los que se abrió la sesión. */
export function metodosDeAcceso(tokenDeAcceso: string | null | undefined): string[] {
  return entradasDeAcceso(tokenDeAcceso).map(entrada => entrada.metodo);
}
