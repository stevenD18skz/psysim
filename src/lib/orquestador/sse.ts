import { type EventoSse } from '@/lib/sse';

import {
  CIERRES_ORQUESTADOR,
  type CierreOrquestador,
  type EventoOrquestador,
  eventoErrorSchema,
  eventoFinSchema,
  type MetricasTurno,
} from './tipos';

function entero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0
    ? Math.round(valor)
    : null;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim().slice(0, 80) : null;
}

/**
 * Métricas del evento `done`. Su forma no está en el OpenAPI, así que se buscan los nombres que
 * usa el orquestador en sus otras respuestas (`tokens_input`, `tokens_used`, `ai_provider`…) y lo
 * que no aparezca queda en `null`.
 */
export function leerMetricas(metricas: Record<string, unknown> | null | undefined): MetricasTurno {
  const m = metricas ?? {};
  const entrada = entero(m.tokens_input ?? m.tokens_in ?? m.prompt_tokens ?? m.input_tokens);
  const salida = entero(m.tokens_output ?? m.tokens_out ?? m.completion_tokens ?? m.output_tokens);
  const total = entero(m.tokens_used ?? m.total_tokens ?? m.tokens);
  return {
    proveedor: texto(m.ai_provider ?? m.provider),
    modelo: texto(m.ai_model ?? m.model),
    // Si solo llega el total, se anota como salida: es el consumo que se le atribuye al turno.
    tokensEntrada: entrada,
    tokensSalida: salida ?? (entrada === null ? total : null),
  };
}

function esCierre(valor: unknown): valor is CierreOrquestador {
  return (CIERRES_ORQUESTADOR as readonly unknown[]).includes(valor);
}

/** Traduce un evento del stream de conversación (`chunk`, `done`, `error`) al modelo de PsySim. */
export function interpretarEvento({ evento, datos }: EventoSse): EventoOrquestador {
  let json: unknown;
  try {
    json = JSON.parse(datos);
  } catch {
    return { tipo: 'ignorado' };
  }
  if (typeof json !== 'object' || json === null) return { tipo: 'ignorado' };

  if (evento === 'chunk') {
    const fragmento = 'chunk' in json ? json.chunk : null;
    return typeof fragmento === 'string' && fragmento
      ? { tipo: 'fragmento', texto: fragmento }
      : { tipo: 'ignorado' };
  }
  if (evento === 'done') {
    const fin = eventoFinSchema.safeParse(json);
    if (!fin.success) return { tipo: 'ignorado' };
    const cierre = esCierre(fin.data.closing_kind) ? fin.data.closing_kind : null;
    return {
      tipo: 'fin',
      severidad: fin.data.severity,
      debeCerrar: fin.data.should_close,
      cierre,
      metricas: leerMetricas(fin.data.metrics),
    };
  }
  if (evento === 'error') {
    const error = eventoErrorSchema.safeParse(json);
    return { tipo: 'error', descartado: error.success ? error.data.discarded : false };
  }
  return { tipo: 'ignorado' };
}
