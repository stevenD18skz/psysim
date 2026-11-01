/**
 * OWASP A02 (configuración de seguridad) y A05 (inyección / XSS) — Política de seguridad de
 * contenido (CSP) con un nonce distinto en cada petición, como recomienda la guía de Next.js.
 *
 * - `script-src` solo ejecuta scripts con el nonce de la petición (`strict-dynamic` deja que esos
 *   scripts carguen los suyos). Un `<script>` inyectado por un atacante no lo trae y no corre.
 * - `wasm-unsafe-eval`: el decodificador Draco de los modelos 3D es WebAssembly.
 * - `unsafe-eval` solo en desarrollo: React lo usa para reconstruir errores en el navegador.
 * - Estilos en línea permitidos: Tailwind, Radix y Sonner inyectan `<style>` y atributos `style`
 *   en tiempo de ejecución; un estilo inyectado es mucho menos grave que un script.
 * - `connect-src` e `img-src` se limitan a este sitio y a Supabase (datos, sesión y modelos 3D).
 * - `frame-ancestors 'none'`, `object-src 'none'`, `base-uri` y `form-action` cierran el
 *   clickjacking, los plugins, el cambio de `<base>` y los formularios hacia otros destinos.
 */

export interface OpcionesCsp {
  /** Valor aleatorio de esta petición (base64). */
  nonce: string;
  /** URL del proyecto de Supabase (`https://<ref>.supabase.co`). */
  urlSupabase: string;
  /** En desarrollo se añade `unsafe-eval` y se permite el WebSocket local de recarga en caliente. */
  desarrollo?: boolean;
}

/** Un nonce nuevo e impredecible por petición. */
export function generarNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

export function construirCsp({ nonce, urlSupabase, desarrollo = false }: OpcionesCsp): string {
  const { origin, host } = new URL(urlSupabase);

  const directivas: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "'wasm-unsafe-eval'",
      ...(desarrollo ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', origin],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      origin,
      `wss://${host}`,
      // GLTFLoader lee las texturas incrustadas en los GLB con `fetch` sobre URL `blob:` (o
      // `data:`), y eso lo rige connect-src: sin ellas, las tazas de E-07 a E-12 salen sin textura.
      'blob:',
      'data:',
      ...(desarrollo ? ['ws://localhost:*', 'http://localhost:*'] : []),
    ],
    'media-src': ["'self'", 'blob:', 'data:'],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    // El inicio de sesión con Google redirige a accounts.google.com pasando por Supabase.
    'form-action': ["'self'", origin, 'https://accounts.google.com'],
    'frame-ancestors': ["'none'"],
  };

  const texto = Object.entries(directivas)
    .map(([nombre, valores]) => `${nombre} ${valores.join(' ')}`)
    .join('; ');
  // En desarrollo se sirve por http: forzar https dejaría la aplicación sin cargar.
  return desarrollo ? texto : `${texto}; upgrade-insecure-requests`;
}
