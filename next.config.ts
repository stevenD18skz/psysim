import type { NextConfig } from 'next';

/**
 * Encabezados de seguridad aplicados a todas las respuestas.
 * La política de contenido (CSP) lleva un nonce por petición y se fija en src/proxy.ts.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Solo https durante dos años (se ignora sobre http, como en localhost).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // La página no comparte contexto de navegación con ventanas de otros orígenes.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // El micrófono queda para este sitio: el dictado por voz de la conversación lo usa.
    value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Solo en desarrollo: el indicador de Next.js no tapa el pie del menú lateral.
  devIndicators: { position: 'bottom-right' },
  typedRoutes: true,
  turbopack: {
    rules: {
      // Shaders GLSL importados como texto plano (p. ej. `import frag from './x.frag'`).
      // Los modelos .glb/.gltf NO pasan por el bundler: se sirven desde /public/models.
      '*.{glsl,vert,frag,vs,fs}': { loaders: ['raw-loader'], as: '*.js' },
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
