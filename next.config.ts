import type { NextConfig } from 'next';

/**
 * Encabezados de seguridad aplicados a todas las respuestas.
 * HSTS lo añade Vercel automáticamente en los dominios HTTPS.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
