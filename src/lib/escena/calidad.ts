/**
 * Calidad de la escena según el rendimiento (auditoría P4-02). `PerformanceMonitor` de drei
 * avisa cuando los FPS se sostienen por debajo o por encima de lo que da la pantalla; esto decide
 * qué hacer con cada aviso, en dos escalones:
 *
 * 1. Resolución: de 1,5× a 1× si cae; de vuelta a 1,5× si se recupera. Cada cambio produce un
 *    tirón, así que tras `CAMBIOS_MAXIMOS` cambios queda fija en 1×. Sin ese tope, un equipo que
 *    sostiene 1× pero no 1,5× cambiaba de resolución cada pocos segundos.
 * 2. Sombras: si a 1× sigue lento `BAJAS_PARA_SIN_SOMBRAS` veces seguidas, se apagan. Es lo que
 *    más cuesta después de la resolución (una segunda pasada de la sala desde la luz de la
 *    ventana). No vuelven: encenderlas otra vez recompila los materiales, otro tirón.
 *
 * Pedir dos avisos a 1× antes de apagar las sombras evita castigar a un equipo capaz por los
 * primeros segundos, cuando todavía se compilan los materiales.
 */

/** Límite del devicePixelRatio: en pantallas HiDPI, 2× o 3× multiplica el coste sin mejora visible. */
export const DPR_MAXIMO = 1.5;
export const DPR_REDUCIDO = 1;
/** Cambios de resolución tolerados antes de dejarla fija en la baja. */
export const CAMBIOS_MAXIMOS = 3;
/** Avisos de rendimiento bajo seguidos, ya a 1×, antes de apagar las sombras. */
export const BAJAS_PARA_SIN_SOMBRAS = 2;

export interface CalidadEscena {
  dpr: number;
  sombras: boolean;
  /** Cambios de resolución hechos hasta ahora. */
  cambios: number;
  /** La resolución ya no cambia (oscilaba). */
  fija: boolean;
  /** Avisos de rendimiento bajo seguidos recibidos ya a 1×. */
  bajasEnReducida: number;
}

export const CALIDAD_INICIAL: CalidadEscena = {
  dpr: DPR_MAXIMO,
  sombras: true,
  cambios: 0,
  fija: false,
  bajasEnReducida: 0,
};

export type AvisoRendimiento = 'baja' | 'sube';

/** Nueva calidad tras un aviso del monitor. Devuelve el mismo objeto si nada cambia. */
export function ajustarCalidad(calidad: CalidadEscena, aviso: AvisoRendimiento): CalidadEscena {
  if (aviso === 'baja') {
    if (calidad.dpr > DPR_REDUCIDO) {
      const cambios = calidad.cambios + 1;
      return {
        ...calidad,
        dpr: DPR_REDUCIDO,
        cambios,
        fija: cambios >= CAMBIOS_MAXIMOS,
        bajasEnReducida: 0,
      };
    }
    if (!calidad.sombras) return calidad;
    const bajasEnReducida = calidad.bajasEnReducida + 1;
    return {
      ...calidad,
      bajasEnReducida,
      sombras: bajasEnReducida < BAJAS_PARA_SIN_SOMBRAS,
    };
  }

  // Sin sombras, el equipo va bien porque ya no las dibuja: subir la resolución lo devolvería al
  // punto en que no daba abasto.
  if (calidad.dpr === DPR_MAXIMO || calidad.fija || !calidad.sombras) {
    return calidad.bajasEnReducida === 0 ? calidad : { ...calidad, bajasEnReducida: 0 };
  }
  return { ...calidad, dpr: DPR_MAXIMO, cambios: calidad.cambios + 1, bajasEnReducida: 0 };
}
