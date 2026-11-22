/**
 * Utilidades puras para los recorridos guiados (spotlight) y pistas contextuales (coach marks).
 * El estado visto/omitido se guarda por cuenta en `localStorage` bajo `psysim:ayuda:*` y se borra
 * automáticamente al cerrar sesión o entregar un computador compartido (`datos-locales.ts`).
 */

export const PREFIJO_AYUDA = 'psysim:ayuda:';

const EVENTO_CAMBIO = 'psysim:ayuda-cambio';
const EVENTO_INICIAR = 'psysim:iniciar-recorrido';

export function claveRecorrido(id: string): string {
  return `${PREFIJO_AYUDA}recorrido:${id}`;
}

export function clavePista(id: string): string {
  return `${PREFIJO_AYUDA}pista:${id}`;
}

export function leerAyudaVista(clave: string): boolean {
  try {
    return window.localStorage.getItem(clave) === '1';
  } catch {
    return true;
  }
}

export function marcarAyudaVista(clave: string): void {
  try {
    window.localStorage.setItem(clave, '1');
  } catch {
    // Sin acceso al almacenamiento (modo privado estricto): no bloquea la interfaz.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO, { detail: { clave } }));
  }
}

export function suscribirAyuda(notificar: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const escuchar = () => notificar();
  window.addEventListener(EVENTO_CAMBIO, escuchar);
  window.addEventListener('storage', escuchar);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, escuchar);
    window.removeEventListener('storage', escuchar);
  };
}

/** Dispara un recorrido guiado por su id desde cualquier botón (p. ej. en el encabezado). */
export function dispararRecorrido(id: string, pasoInicial = 0): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO_INICIAR, { detail: { id, pasoInicial } }));
}

export function suscribirDisparoRecorrido(
  id: string,
  alDisparar: (pasoInicial: number) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const escuchar = (evento: Event) => {
    const detalle = (evento as CustomEvent<{ id?: string; pasoInicial?: number }>).detail;
    if (detalle?.id === id) {
      alDisparar(typeof detalle.pasoInicial === 'number' ? detalle.pasoInicial : 0);
    }
  };
  window.addEventListener(EVENTO_INICIAR, escuchar);
  return () => window.removeEventListener(EVENTO_INICIAR, escuchar);
}

export interface Rectangulo {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type LadoTarjeta = 'bottom' | 'top' | 'right' | 'left' | 'sheet';

export interface PosicionTarjeta {
  top: number;
  left: number;
  width: number;
  lado: LadoTarjeta;
}

const MARGEN_PANTALLA = 16;
const SEPARACION_TARJETA = 14;
const PADDING_RECORTE = 8;

/**
 * Calcula el recorte del foco (spotlight) alrededor de un elemento en coordenadas del viewport.
 * Si el objetivo es muy alto (p. ej. una sección larga), acota su altura visible para que la
 * tarjeta explicativa siempre tenga espacio claro. Nunca fuerza `top` contra el borde inferior:
 * así el foco permanece pegado 1:1 al elemento real durante cualquier desplazamiento.
 */
export function calcularRecorteSpotlight(
  objetivo: Rectangulo,
  viewport: { width: number; height: number }
): Rectangulo {
  const altoMaximo = Math.max(160, Math.round(viewport.height * 0.52));
  const xSinAcotar = objetivo.left - PADDING_RECORTE;
  const ySinAcotar = objetivo.top - PADDING_RECORTE;
  const ancho = Math.min(objetivo.width + PADDING_RECORTE * 2, viewport.width - MARGEN_PANTALLA);
  const alto = Math.min(objetivo.height + PADDING_RECORTE * 2, altoMaximo);

  const left = Math.max(
    MARGEN_PANTALLA / 2,
    Math.min(xSinAcotar, viewport.width - ancho - MARGEN_PANTALLA / 2)
  );

  return {
    top: Math.round(ySinAcotar),
    left: Math.round(left),
    width: Math.round(Math.max(40, ancho)),
    height: Math.round(Math.max(36, alto)),
  };
}

/**
 * Calcula el desplazamiento vertical exacto (`scrollY`) necesario para encuadrar un paso del
 * recorrido sin rebotes. Devuelve `null` si el elemento ya está cómodamente visible en pantalla.
 */
export function calcularScrollObjetivo(
  objetivo: Rectangulo,
  viewport: { width: number; height: number },
  scrollYActual: number,
  altoDocumento: number
): number | null {
  const altoMaximo = Math.max(160, Math.round(viewport.height * 0.52));
  const altoVisible = Math.min(objetivo.height + PADDING_RECORTE * 2, altoMaximo);
  const margenSuperior = 88;
  const margenInferior = 96;

  if (
    objetivo.top >= margenSuperior &&
    objetivo.top + altoVisible <= viewport.height - margenInferior
  ) {
    return null;
  }

  const esMuyAlto = objetivo.height > viewport.height * 0.46;
  const topDeseado = esMuyAlto
    ? 96
    : Math.max(96, Math.round((viewport.height - altoVisible) * 0.34));

  const maximoScroll = Math.max(0, altoDocumento - viewport.height);
  const destino = Math.max(
    0,
    Math.min(maximoScroll, Math.round(scrollYActual + objetivo.top - topDeseado))
  );

  return Math.abs(destino - scrollYActual) < 6 ? null : destino;
}

/**
 * Ubica la tarjeta flotante del recorrido junto al recorte con volteo automático y ajuste seguro
 * dentro del viewport. En pantallas estrechas (< 640 px) ancla la tarjeta al borde inferior para
 * una lectura cómoda y ergonómica con una mano.
 */
export function calcularPosicionTarjeta(
  recorte: Rectangulo,
  tarjeta: { width: number; height: number },
  viewport: { width: number; height: number },
  preferido: Exclude<LadoTarjeta, 'sheet'> = 'bottom'
): PosicionTarjeta {
  const anchoSeguro = Math.min(tarjeta.width, viewport.width - MARGEN_PANTALLA * 2);

  if (viewport.width < 640) {
    const top = Math.max(MARGEN_PANTALLA, viewport.height - tarjeta.height - MARGEN_PANTALLA);
    return {
      top: Math.round(top),
      left: Math.round((viewport.width - anchoSeguro) / 2),
      width: Math.round(anchoSeguro),
      lado: 'sheet',
    };
  }

  const centroX = recorte.left + recorte.width / 2 - anchoSeguro / 2;
  const centroY = recorte.top + recorte.height / 2 - tarjeta.height / 2;
  const acotarX = (x: number) =>
    Math.max(MARGEN_PANTALLA, Math.min(x, viewport.width - anchoSeguro - MARGEN_PANTALLA));
  const acotarY = (y: number) =>
    Math.max(MARGEN_PANTALLA, Math.min(y, viewport.height - tarjeta.height - MARGEN_PANTALLA));

  const espacioAbajo = viewport.height - (recorte.top + recorte.height) - MARGEN_PANTALLA;
  const espacioArriba = recorte.top - MARGEN_PANTALLA;
  const espacioDerecha = viewport.width - (recorte.left + recorte.width) - MARGEN_PANTALLA;
  const espacioIzquierda = recorte.left - MARGEN_PANTALLA;

  const orden: Exclude<LadoTarjeta, 'sheet'>[] =
    preferido === 'top'
      ? ['top', 'bottom', 'right', 'left']
      : preferido === 'left'
        ? ['left', 'right', 'bottom', 'top']
        : preferido === 'right'
          ? ['right', 'left', 'bottom', 'top']
          : ['bottom', 'top', 'right', 'left'];

  for (const lado of orden) {
    if (lado === 'bottom' && espacioAbajo >= tarjeta.height + SEPARACION_TARJETA) {
      return {
        top: Math.round(recorte.top + recorte.height + SEPARACION_TARJETA),
        left: Math.round(acotarX(centroX)),
        width: Math.round(anchoSeguro),
        lado: 'bottom',
      };
    }
    if (lado === 'top' && espacioArriba >= tarjeta.height + SEPARACION_TARJETA) {
      return {
        top: Math.round(recorte.top - tarjeta.height - SEPARACION_TARJETA),
        left: Math.round(acotarX(centroX)),
        width: Math.round(anchoSeguro),
        lado: 'top',
      };
    }
    if (lado === 'right' && espacioDerecha >= anchoSeguro + SEPARACION_TARJETA) {
      return {
        top: Math.round(acotarY(centroY)),
        left: Math.round(recorte.left + recorte.width + SEPARACION_TARJETA),
        width: Math.round(anchoSeguro),
        lado: 'right',
      };
    }
    if (lado === 'left' && espacioIzquierda >= anchoSeguro + SEPARACION_TARJETA) {
      return {
        top: Math.round(acotarY(centroY)),
        left: Math.round(recorte.left - anchoSeguro - SEPARACION_TARJETA),
        width: Math.round(anchoSeguro),
        lado: 'left',
      };
    }
  }

  // Sin espacio holgado en ningún lado: elige el lado vertical más amplio y acota al viewport.
  const usarArriba = espacioArriba > espacioAbajo;
  const topCalculado = usarArriba
    ? recorte.top - tarjeta.height - SEPARACION_TARJETA
    : recorte.top + recorte.height + SEPARACION_TARJETA;
  return {
    top: Math.round(acotarY(topCalculado)),
    left: Math.round(acotarX(centroX)),
    width: Math.round(anchoSeguro),
    lado: usarArriba ? 'top' : 'bottom',
  };
}
