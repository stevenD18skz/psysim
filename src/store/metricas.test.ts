import { describe, expect, it } from 'vitest';

import { crearAppStore } from './app-store';
import { estadoInicialMetricas, metricasDesdeHistorial } from './metricas-slice';

describe('slice de métricas (HU-18)', () => {
  it('empieza sin muestras de cercanía', () => {
    expect(crearAppStore().getState().metricas).toMatchObject({
      proximidadSuma: 0,
      proximidadMuestras: 0,
    });
  });

  it('registrarProximidad acumula la suma y cuenta las muestras', () => {
    const store = crearAppStore();
    store.getState().metricas.registrarProximidad(1.5);
    store.getState().metricas.registrarProximidad(2.5);
    expect(store.getState().metricas).toMatchObject({
      proximidadSuma: 4,
      proximidadMuestras: 2,
    });
  });

  it.each([
    ['Infinity (la escena aún no carga)', Number.POSITIVE_INFINITY],
    ['NaN', Number.NaN],
    ['una distancia negativa', -1],
  ])('registrarProximidad ignora %s', (_, valor) => {
    const store = crearAppStore();
    store.getState().metricas.registrarProximidad(valor);
    expect(store.getState().metricas).toMatchObject({ proximidadSuma: 0, proximidadMuestras: 0 });
  });

  it('una muestra de 0 m cuenta (el estudiante pegado al paciente)', () => {
    const store = crearAppStore();
    store.getState().metricas.registrarProximidad(0);
    expect(store.getState().metricas.proximidadMuestras).toBe(1);
  });

  it('limpiar la sesión reinicia las muestras', () => {
    const store = crearAppStore();
    store.getState().metricas.registrarProximidad(2);
    store.getState().sesion.limpiar();
    expect(store.getState().metricas).toMatchObject({ proximidadSuma: 0, proximidadMuestras: 0 });
  });

  it('metricasDesdeHistorial cuenta intervenciones y latencias de un historial guardado', () => {
    const metricas = metricasDesdeHistorial([
      { remitente: 'estudiante' },
      { remitente: 'npc', latencia_ms: 900 },
      { remitente: 'estudiante' },
      { remitente: 'npc' },
    ]);
    expect(metricas).toEqual({
      ...estadoInicialMetricas,
      totalMensajes: 2,
      latencias: [900],
    });
  });
});
