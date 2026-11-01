import { log } from '@/lib/log';
import { idPeticion } from '@/lib/observabilidad/peticion';
import {
  limpiarMensaje,
  MAX_BYTES_TELEMETRIA,
  rutaSinParametros,
  telemetriaSchema,
} from '@/lib/observabilidad/telemetria';

const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = 40;
const LIMITE_ENTRADAS = 5_000;

/** Contador por dirección en la memoria de la instancia: un freno barato, no una garantía. */
const contadores = new Map<string, { desde: number; total: number }>();

function superaElLimite(clave: string, ahora = Date.now()): boolean {
  if (contadores.size > LIMITE_ENTRADAS) contadores.clear();
  const actual = contadores.get(clave);
  if (!actual || ahora - actual.desde > VENTANA_MS) {
    contadores.set(clave, { desde: ahora, total: 1 });
    return false;
  }
  actual.total += 1;
  return actual.total > MAX_POR_VENTANA;
}

/**
 * Solo acepta envíos del propio sitio: bloquea que otra página llene los registros. `sendBeacon` y
 * `fetch` del mismo origen pueden omitir `Origin`, pero los navegadores actuales siempre mandan
 * `Sec-Fetch-Site`; una petición sin ninguno de los dos no viene de un navegador (p. ej. `curl`).
 * Quien falsifique las cabeceras sigue pasando: el tope por dirección acota el ruido.
 */
function esDelMismoSitio(request: Request): boolean {
  const origen = request.headers.get('origin');
  if (!origen) return request.headers.get('sec-fetch-site') === 'same-origin';
  try {
    return new URL(origen).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/**
 * Recibe errores del navegador y Core Web Vitals reales y los deja en el registro estructurado,
 * donde se consultan y alertan junto con los del servidor (docs/observabilidad.md).
 *
 * Es público a propósito (un error puede ocurrir antes de iniciar sesión), así que se protege:
 * mismo origen, 2 KiB como máximo, esquema estricto con Zod y 40 envíos por minuto por dirección.
 * No guarda nada en la base de datos ni registra la dirección IP.
 */
export async function POST(request: Request): Promise<Response> {
  if (!esDelMismoSitio(request)) return new Response(null, { status: 403 });

  const direccion = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconocida';
  if (superaElLimite(direccion)) return new Response(null, { status: 429 });

  // Se rechaza antes de leer el cuerpo si declara más de lo permitido.
  const declarado = Number(request.headers.get('content-length') ?? 0);
  if (declarado > MAX_BYTES_TELEMETRIA) return new Response(null, { status: 413 });

  const texto = await request.text();
  if (texto.length > MAX_BYTES_TELEMETRIA) return new Response(null, { status: 413 });

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return new Response(null, { status: 400 });
  }
  const datos = telemetriaSchema.safeParse(cuerpo);
  if (!datos.success) return new Response(null, { status: 400 });

  const peticion = idPeticion(request);
  const ruta = rutaSinParametros(datos.data.ruta);
  if (datos.data.tipo === 'error') {
    log.error('cliente.error', {
      peticion,
      ruta,
      mensaje: limpiarMensaje(datos.data.mensaje),
      digest: datos.data.digest,
    });
  } else {
    log.info('cliente.vital', {
      peticion,
      ruta,
      nombre: datos.data.nombre,
      valor: Math.round(datos.data.valor * 1000) / 1000,
      valoracion: datos.data.valoracion,
    });
  }
  return new Response(null, { status: 204 });
}
