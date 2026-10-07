import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** `publicEnv` se lee al importar el módulo: cada caso lo importa de nuevo. */
async function cargar() {
  return import('./modelos');
}

describe('URL de los modelos 3D', () => {
  it('por defecto usa el bucket público de Supabase Storage', async () => {
    const { resolverUrlModelo } = await cargar();
    expect(resolverUrlModelo('muebles/sofa.glb')).toBe(
      'http://localhost:54321/storage/v1/object/public/modelos-3d/muebles/sofa.glb'
    );
  });

  it('en desarrollo puede apuntar a los archivos locales (sin barras repetidas)', async () => {
    vi.stubEnv('NEXT_PUBLIC_MODELOS_BASE_URL', '/models/');
    const { resolverUrlModelo } = await cargar();
    expect(resolverUrlModelo('/muebles/sofa.glb')).toBe('/models/muebles/sofa.glb');
  });
});
