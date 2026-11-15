import { type EventoSse } from '@/lib/sse';

import { type EventoOrquestador, eventoErrorSchema, type MetricasTurno } from './tipos';

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
    // `done` significa que el orquestador YA guardó el turno. Se acepta siempre, aunque algún
    // campo llegue con otra forma: ignorarlo dejaba el flujo «cortado», la respuesta recibida se
    // perdía y la práctica pasaba a Gemini con un turno de menos. Lo ilegible degrada a lo
    // inocuo: sin severidad nueva, sin cierre y sin métricas.
    const fin = json as Record<string, unknown>;
    const metricas = fin.metrics;
    return {
      tipo: 'fin',
      severidad:
        typeof fin.severity === 'number' && Number.isFinite(fin.severity) ? fin.severity : null,
      debeCerrar: fin.should_close === true,
      // Se entrega tal cual (acotado): un valor desconocido no se confunde con «sin motivo».
      cierre: texto(fin.closing_kind),
      metricas: leerMetricas(
        typeof metricas === 'object' && metricas !== null && !Array.isArray(metricas)
          ? (metricas as Record<string, unknown>)
          : null
      ),
    };
  }
  if (evento === 'error') {
    const error = eventoErrorSchema.safeParse(json);
    return { tipo: 'error', descartado: error.success ? error.data.discarded : false };
  }
  return { tipo: 'ignorado' };
}
