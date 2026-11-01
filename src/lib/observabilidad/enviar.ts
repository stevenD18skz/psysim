import { rutaSinParametros, type Telemetria } from './telemetria';

/** Tope por visita: un error que se repite en bucle no debe inundar el registro. */
const MAX_ENVIOS_POR_VISITA = 8;
let enviados = 0;

/** `Omit` sobre una unión la aplastaría: se aplica a cada variante por separado. */
type Evento = Telemetria extends infer T ? (T extends unknown ? Omit<T, 'ruta'> : never) : never;

/**
 * Envía un evento de telemetría sin bloquear la página ni lanzar errores. Usa `sendBeacon`
 * (sobrevive a que se cierre la pestaña) y, si no existe, `fetch` con `keepalive`.
 */
export function enviarTelemetria(evento: Evento): void {
  if (typeof window === 'undefined' || enviados >= MAX_ENVIOS_POR_VISITA) return;
  enviados += 1;
  try {
    const cuerpo = JSON.stringify({ ...evento, ruta: rutaSinParametros(window.location.pathname) });
    const enviadoPorBeacon =
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon('/api/telemetria', new Blob([cuerpo], { type: 'application/json' }));
    if (!enviadoPorBeacon) {
      void fetch('/api/telemetria', {
        method: 'POST',
        body: cuerpo,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // La telemetría nunca debe causar un error.
  }
}

/** Solo para las pruebas. */
export function reiniciarTelemetria(): void {
  enviados = 0;
}
