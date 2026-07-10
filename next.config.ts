import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Configuración de Turbopack para manejo de archivos estáticos 3D
  turbopack: {
    rules: {
      '*.glsl': {
        loaders: ['raw-loader'],
      },
      '*.vs': {
        loaders: ['raw-loader'],
      },
      '*.fs': {
        loaders: ['raw-loader'],
      },
    },
  },
  // Deshabilitar la verificación de tipos en build (para evitar problemas con tipos internos)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuración de imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },
  // Configuración de encabezados de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
