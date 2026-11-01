import { afterEach, describe, expect, it, vi } from 'vitest';

import { enviarTelemetria, reiniciarTelemetria } from './enviar';
import { ENCABEZADO_PETICION, idPeticion, resolverIdPeticion } from './peticion';
import {
  limpiarMensaje,
  MAX_BYTES_TELEMETRIA,
  rutaSinParametros,
  telemetriaSchema,
} from './telemetria';

describe('telemetría: esquema', () => {
  it('acepta un error y una métrica web válidos', () => {
    expect(
      telemetriaSchema.safeParse({ tipo: 'error', ruta: '/inicio', mensaje: 'x is undefined' })
        .success
    ).toBe(true);
    expect(
      telemetriaSchema.safeParse({ tipo: 'vital', ruta: '/', nombre: 'LCP', valor: 1830.4 }).success
    ).toBe(true);
  });

  it.each([
    ['tipo desconocido', { tipo: 'clic', ruta: '/' }],
    ['ruta que no empieza por /', { tipo: 'error', ruta: 'https://otro.com', mensaje: 'x' }],
    ['mensaje enorme', { tipo: 'error', ruta: '/', mensaje: 'x'.repeat(301) }],
    ['métrica desconocida', { tipo: 'vital', ruta: '/', nombre: 'FID', valor: 1 }],
    ['valor negativo', { tipo: 'vital', ruta: '/', nombre: 'CLS', valor: -1 }],
    ['valor no numérico', { tipo: 'vital', ruta: '/', nombre: 'CLS', valor: 'alto' }],
  ])('rechaza %s', (_, cuerpo) => {
    expect(telemetriaSchema.safeParse(cuerpo).success).toBe(false);
  });

  it('el tope de tamaño cabe un error típico pero no un volcado', () => {
    expect(MAX_BYTES_TELEMETRIA).toBe(2048);
  });
});

describe('telemetría: sin datos personales', () => {
  it('la ruta pierde parámetros y fragmento (pueden llevar códigos de acceso)', () => {
    expect(rutaSinParametros('/unirse/abc-defg-hij?x=1#y')).toBe('/unirse/abc-defg-hij');
    expect(rutaSinParametros('/resultados?sesion=123')).toBe('/resultados');
    expect(rutaSinParametros('javascript:alert(1)')).toBe('/');
  });

  it('el mensaje pierde direcciones, correos y códigos de acceso', () => {
    const limpio = limpiarMensaje(
      'Falló https://psysim.vercel.app/unirse/abc-defg-hij para ana.perez@correounivalle.edu.co con abc-defg-hij'
    );
    expect(limpio).not.toMatch(/https?:|@|abc-defg-hij/);
    expect(limpio).toContain('[url]');
    expect(limpio).toContain('[código]');
  });

  it('un correo suelto se oculta', () => {
    expect(limpiarMensaje('No existe ana.perez@correounivalle.edu.co')).toBe('No existe [correo]');
  });
});

describe('telemetría: envío desde el navegador', () => {
  afterEach(() => {
    reiniciarTelemetria();
    vi.unstubAllGlobals();
  });

  it('usa sendBeacon con la ruta sin parámetros', async () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });
    vi.stubGlobal('window', { location: { pathname: '/resultados', search: '?sesion=1' } });

    enviarTelemetria({ tipo: 'error', mensaje: 'falló' });

    expect(sendBeacon).toHaveBeenCalledOnce();
    const [url, blob] = sendBeacon.mock.calls[0] as unknown as [string, Blob];
    expect(url).toBe('/api/telemetria');
    expect(JSON.parse(await blob.text())).toEqual({
      tipo: 'error',
      mensaje: 'falló',
      ruta: '/resultados',
    });
  });

  it('envía como máximo 8 eventos por visita (un error en bucle no inunda el registro)', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });
    vi.stubGlobal('window', { location: { pathname: '/' } });

    for (let i = 0; i < 20; i++) enviarTelemetria({ tipo: 'error', mensaje: `fallo ${i}` });

    expect(sendBeacon).toHaveBeenCalledTimes(8);
  });

  it('nunca lanza, aunque el navegador falle', () => {
    vi.stubGlobal('navigator', {
      sendBeacon: () => {
        throw new Error('bloqueado');
      },
    });
    vi.stubGlobal('window', { location: { pathname: '/' } });

    expect(() => enviarTelemetria({ tipo: 'error', mensaje: 'x' })).not.toThrow();
  });
});

describe('identificador de petición', () => {
  it('usa el de la petición si es válido y «sin-id» si falta o es sospechoso', () => {
    const con = (valor: string) =>
      new Request('http://localhost/', { headers: { [ENCABEZADO_PETICION]: valor } });
    expect(idPeticion(con('gru1::abcde-1234567890'))).toBe('gru1::abcde-1234567890');
    expect(idPeticion(con('x'))).toBe('sin-id');
    expect(idPeticion(con('<script>alert(1)</script>'))).toBe('sin-id');
    expect(idPeticion(new Request('http://localhost/'))).toBe('sin-id');
  });

  it('el proxy usa el id de Vercel o genera uno nuevo', () => {
    expect(resolverIdPeticion('iad1::xxxxx-1700000000-aaaa')).toBe('iad1::xxxxx-1700000000-aaaa');
    expect(resolverIdPeticion(null)).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolverIdPeticion('???')).toMatch(/^[0-9a-f-]{36}$/);
  });
});
