'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { useEffect } from 'react';

import { enviarTelemetria } from '@/lib/observabilidad/enviar';
import { METRICAS_WEB } from '@/lib/observabilidad/telemetria';

const METRICAS = new Set<string>(METRICAS_WEB);

/**
 * Envía a `/api/telemetria` los errores de JavaScript que nadie captura y los Core Web Vitals
 * de visitas reales (no de una prueba de laboratorio). Se monta una vez en el layout raíz y no
 * pinta nada.
 */
export function TelemetriaCliente() {
  useReportWebVitals(metrica => {
    if (!METRICAS.has(metrica.name)) return;
    enviarTelemetria({
      tipo: 'vital',
      nombre: metrica.name as (typeof METRICAS_WEB)[number],
      valor: metrica.value,
      valoracion: metrica.rating,
    });
  });

  useEffect(() => {
    const alFallar = (evento: ErrorEvent) =>
      enviarTelemetria({ tipo: 'error', mensaje: evento.message || 'Error sin mensaje' });
    const alRechazar = (evento: PromiseRejectionEvent) =>
      enviarTelemetria({
        tipo: 'error',
        mensaje: String((evento.reason as Error | undefined)?.message ?? evento.reason),
      });
    window.addEventListener('error', alFallar);
    window.addEventListener('unhandledrejection', alRechazar);
    return () => {
      window.removeEventListener('error', alFallar);
      window.removeEventListener('unhandledrejection', alRechazar);
    };
  }, []);

  return null;
}
