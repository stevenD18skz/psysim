import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdminClient } from '@/lib/supabase/admin';

import { GET } from './route';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

function baseDeDatos(error: unknown) {
  vi.mocked(createAdminClient).mockReturnValue({
    from: () => ({ select: () => Promise.resolve({ error }) }),
  } as never);
}

const llamar = (consulta = '') => GET(new Request(`http://localhost/api/salud${consulta}`));

beforeEach(() => vi.clearAllMocks());

describe('GET /api/salud', () => {
  it('responde ok sin tocar la base de datos', async () => {
    const respuesta = await llamar();

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toMatchObject({ estado: 'ok' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('no se guarda en caché', async () => {
    expect((await llamar()).headers.get('Cache-Control')).toBe('no-store');
  });

  it('la comprobación profunda mide la base de datos', async () => {
    baseDeDatos(null);
    const cuerpo = await (await llamar('?profunda=1')).json();

    expect(cuerpo.estado).toBe('ok');
    expect(cuerpo.base_de_datos_ms).toEqual(expect.any(Number));
  });

  it('la comprobación profunda responde 503 si la base de datos falla, sin detalles', async () => {
    baseDeDatos({ message: 'connection refused to db.internal:5432', code: '08006' });
    const respuesta = await llamar('?profunda=1');
    const texto = await respuesta.text();

    expect(respuesta.status).toBe(503);
    expect(texto).toContain('degradado');
    expect(texto).not.toMatch(/refused|5432|08006|internal/);
  });

  it('no expone secretos ni variables de entorno', async () => {
    const texto = await (await llamar()).text();
    expect(texto).not.toMatch(/KEY|SECRET|TOKEN|supabase\.co/i);
  });
});
