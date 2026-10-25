import { describe, expect, it } from 'vitest';

import { construirCsp, generarNonce } from './csp';

const SUPABASE = 'https://abcdefgh.supabase.co';

function directivas(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp.split('; ').map(parte => {
      const [nombre, ...valores] = parte.split(' ');
      return [nombre!, valores];
    })
  );
}

describe('construirCsp (OWASP A02/A05)', () => {
  const produccion = directivas(construirCsp({ nonce: 'NONCE123', urlSupabase: SUPABASE }));

  it('solo ejecuta scripts con el nonce de la petición', () => {
    expect(produccion['script-src']).toContain("'nonce-NONCE123'");
    expect(produccion['script-src']).toContain("'strict-dynamic'");
  });

  it('nunca permite scripts en línea ni eval en producción', () => {
    expect(produccion['script-src']).not.toContain("'unsafe-inline'");
    expect(produccion['script-src']).not.toContain("'unsafe-eval'");
  });

  it('permite WebAssembly para el decodificador Draco de los modelos 3D', () => {
    expect(produccion['script-src']).toContain("'wasm-unsafe-eval'");
    expect(produccion['worker-src']).toContain('blob:');
  });

  it('cierra clickjacking, plugins, <base> y formularios hacia otros destinos', () => {
    expect(produccion['frame-ancestors']).toEqual(["'none'"]);
    expect(produccion['object-src']).toEqual(["'none'"]);
    expect(produccion['frame-src']).toEqual(["'none'"]);
    expect(produccion['base-uri']).toEqual(["'self'"]);
    expect(produccion['form-action']).toEqual(["'self'", SUPABASE, 'https://accounts.google.com']);
  });

  it('limita datos, imágenes y modelos 3D a este sitio y a Supabase', () => {
    expect(produccion['default-src']).toEqual(["'self'"]);
    expect(produccion['connect-src']).toEqual(["'self'", SUPABASE, 'wss://abcdefgh.supabase.co']);
    expect(produccion['img-src']).toEqual(["'self'", 'data:', 'blob:', SUPABASE]);
  });

  it('en producción fuerza https', () => {
    expect(construirCsp({ nonce: 'n', urlSupabase: SUPABASE })).toMatch(
      /; upgrade-insecure-requests$/
    );
  });

  describe('en desarrollo', () => {
    const csp = construirCsp({ nonce: 'n', urlSupabase: SUPABASE, desarrollo: true });
    const dev = directivas(csp);

    it('permite eval (React lo usa para los errores) y la recarga en caliente local', () => {
      expect(dev['script-src']).toContain("'unsafe-eval'");
      expect(dev['connect-src']).toContain('ws://localhost:*');
    });

    it('no fuerza https: se sirve por http', () => {
      expect(csp).not.toContain('upgrade-insecure-requests');
    });
  });

  it('acepta una URL de Supabase con ruta o barra final', () => {
    const csp = construirCsp({ nonce: 'n', urlSupabase: `${SUPABASE}/` });
    expect(csp).toContain(`connect-src 'self' ${SUPABASE} wss://abcdefgh.supabase.co`);
  });
});

describe('generarNonce', () => {
  it('es base64 y distinto en cada petición', () => {
    const nonces = new Set(Array.from({ length: 50 }, () => generarNonce()));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('tiene entropía suficiente (al menos 128 bits)', () => {
    expect(Buffer.from(generarNonce(), 'base64').length).toBeGreaterThanOrEqual(16);
  });
});
