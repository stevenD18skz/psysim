import { beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '@/lib/log';

import { POST } from './route';

vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

let ip = 0;
function peticion(cuerpo: unknown, encabezados: Record<string, string> = {}) {
  return new Request('http://localhost/api/telemetria', {
    method: 'POST',
    headers: { 'x-forwarded-for': `10.0.0.${ip}`, ...encabezados },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  ip += 1;
});

describe('POST /api/telemetria', () => {
  it('registra un error del navegador con su ruta, sin datos personales', async () => {
    const respuesta = await POST(
      peticion({
        tipo: 'error',
        ruta: '/resultados',
        mensaje: 'Falló para ana@correounivalle.edu.co en https://psysim.vercel.app/x',
        digest: '1234',
      })
    );

    expect(respuesta.status).toBe(204);
    expect(log.error).toHaveBeenCalledWith(
      'cliente.error',
      expect.objectContaining({ ruta: '/resultados', digest: '1234' })
    );
    const datos = vi.mocked(log.error).mock.calls[0]![1] as { mensaje: string };
    expect(datos.mensaje).not.toMatch(/@|https?:/);
  });

  it('registra una métrica web', async () => {
    const respuesta = await POST(
      peticion({ tipo: 'vital', ruta: '/', nombre: 'LCP', valor: 1830.123456, valoracion: 'good' })
    );

    expect(respuesta.status).toBe(204);
    expect(log.info).toHaveBeenCalledWith(
      'cliente.vital',
      expect.objectContaining({ nombre: 'LCP', valor: 1830.123, valoracion: 'good' })
    );
  });

  it('400 si el cuerpo no es JSON o no cumple el esquema (y no registra nada)', async () => {
    expect((await POST(peticion('no es json'))).status).toBe(400);
    expect((await POST(peticion({ tipo: 'clic' }))).status).toBe(400);
    expect(log.info).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });

  it('413 si el cuerpo supera 2 KiB', async () => {
    const enorme = { tipo: 'error', ruta: '/', mensaje: 'x', relleno: 'y'.repeat(3000) };
    expect((await POST(peticion(enorme))).status).toBe(413);
  });

  it('403 si el envío viene de otro sitio', async () => {
    const respuesta = await POST(
      peticion(
        { tipo: 'error', ruta: '/', mensaje: 'x' },
        { origin: 'https://sitio-malicioso.example' }
      )
    );
    expect(respuesta.status).toBe(403);
    expect(log.error).not.toHaveBeenCalled();
  });

  it('acepta el envío del propio sitio', async () => {
    const respuesta = await POST(
      peticion({ tipo: 'error', ruta: '/', mensaje: 'x' }, { origin: 'http://localhost' })
    );
    expect(respuesta.status).toBe(204);
  });

  it('429 después de 40 envíos por minuto desde la misma dirección', async () => {
    const mismaDireccion = { 'x-forwarded-for': '203.0.113.9' };
    let ultimo = 204;
    for (let i = 0; i < 45; i++) {
      ultimo = (await POST(peticion({ tipo: 'error', ruta: '/', mensaje: 'x' }, mismaDireccion)))
        .status;
    }
    expect(ultimo).toBe(429);
  });

  it('no registra la dirección IP', async () => {
    await POST(peticion({ tipo: 'error', ruta: '/', mensaje: 'x' }));
    expect(JSON.stringify(vi.mocked(log.error).mock.calls)).not.toMatch(/10\.0\.0\./);
  });
});
