import { type EmocionNpc, type IntensidadEmocion } from '@/lib/conversacion/emociones';

import { BANDERAS_DE_MALTRATO } from './cierre';

/*
 * La severidad del orquestador (0 a 5, recalculada en cada turno) se traduce al lenguaje no verbal
 * del paciente 3D. Según su documentación: 0–1 calmado y receptivo, 2–3 moderadamente angustiado,
 * 4 severamente angustiado, 5 muy alto (con posibilidad de cierre automático).
 */

/** Desde esta severidad el paciente está desbordado. */
export const SEVERIDAD_ALTA = 4;
/** Por debajo de esta severidad el paciente está tranquilo. */
export const SEVERIDAD_BAJA = 1.5;
/** Cambio de severidad entre dos turnos que ya se nota en el cuerpo. */
export const CAMBIO_NOTABLE = 0.5;

/** Rango de la severidad que PsySim guarda (`numeric(4,2) check between 0 and 5`). */
export const SEVERIDAD_MINIMA = 0;
export const SEVERIDAD_MAXIMA = 5;

/**
 * Severidad lista para guardar: dentro de 0 a 5 y con dos decimales. El orquestador promete ese
 * rango, pero un valor fuera de él haría fallar `guardar_intercambio_ia` y el turno se perdería
 * en cada reintento. Lo que no es un número queda en `null` (se conserva la severidad anterior).
 */
export function acotarSeveridad(valor: unknown): number | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  const acotada = Math.min(SEVERIDAD_MAXIMA, Math.max(SEVERIDAD_MINIMA, valor));
  return Math.round(acotada * 100) / 100;
}

/** Cuántas banderas de un turno se guardan, y su largo máximo: son códigos, no texto libre. */
const MAXIMO_BANDERAS = 12;
const LARGO_BANDERA = 40;

/** `risk_flags` listas para guardar: solo textos cortos, sin repetir. */
export function acotarBanderas(banderas: readonly unknown[]): string[] {
  const limpias = banderas
    .filter((bandera): bandera is string => typeof bandera === 'string')
    .map(bandera => bandera.trim().slice(0, LARGO_BANDERA))
    .filter(Boolean);
  return [...new Set(limpias)].slice(0, MAXIMO_BANDERAS);
}

/** Cuánto se le nota la emoción al paciente solo por su severidad. */
export function intensidadPorSeveridad(severidad: number): IntensidadEmocion {
  if (severidad >= SEVERIDAD_ALTA) return 3;
  return severidad >= 2 ? 2 : 1;
}

/**
 * La severidad ajusta la intensidad que eligió el modelo en su etiqueta: con severidad alta sube
 * un punto, con severidad baja baja un punto. Sin etiqueta, la intensidad sale de la severidad.
 */
export function ajustarIntensidad(
  etiqueta: IntensidadEmocion | null,
  severidad: number | null
): IntensidadEmocion | null {
  if (severidad === null) return etiqueta;
  if (etiqueta === null) return intensidadPorSeveridad(severidad);
  const ajuste = severidad >= SEVERIDAD_ALTA ? 1 : severidad < SEVERIDAD_BAJA ? -1 : 0;
  return Math.min(3, Math.max(1, etiqueta + ajuste)) as IntensidadEmocion;
}

export interface EstadoSeveridad {
  severidad: number;
  /** Severidad del turno anterior (o la inicial de la sesión); `null` si no se conoce. */
  severidadAnterior: number | null;
  /** Emoción del turno anterior, si la hubo. */
  emocionAnterior: EmocionNpc | null;
  /** `risk_flags` del turno (`abuse`, `repeat_abuse`, `risk`…). */
  banderas?: readonly string[];
}

/**
 * Emoción del paciente cuando el modelo no escribió la etiqueta: se deduce de la severidad y de
 * cómo cambió respecto al turno anterior.
 */
export function emocionPorSeveridad({
  severidad,
  severidadAnterior,
  emocionAnterior,
  banderas = [],
}: EstadoSeveridad): EmocionNpc {
  if (banderas.some(bandera => BANDERAS_DE_MALTRATO.includes(bandera))) return 'molesto';
  if (severidad >= SEVERIDAD_ALTA) return 'abrumado';

  const cambio = severidadAnterior === null ? 0 : severidad - severidadAnterior;
  if (cambio <= -CAMBIO_NOTABLE) return 'aliviado';
  if (cambio >= CAMBIO_NOTABLE) return 'ansioso';
  if (severidad < SEVERIDAD_BAJA) return 'tranquilo';

  // Sin cambios notables, el paciente sigue como venía; el alivio no dura más de un turno.
  if (emocionAnterior && emocionAnterior !== 'aliviado' && emocionAnterior !== 'abrumado') {
    return emocionAnterior;
  }
  return severidad >= 2.5 ? 'triste' : 'neutral';
}

/**
 * Lenguaje no verbal de una respuesta del orquestador: la emoción de la etiqueta si llegó (o la
 * deducida de la severidad) y la intensidad ajustada por la severidad.
 */
export function lenguajeNoVerbal(
  etiqueta: { emocion: EmocionNpc | null; intensidad: IntensidadEmocion | null },
  estado: EstadoSeveridad
): { emocion: EmocionNpc; intensidad: IntensidadEmocion; deducida: boolean } {
  if (etiqueta.emocion) {
    return {
      emocion: etiqueta.emocion,
      intensidad:
        ajustarIntensidad(etiqueta.intensidad, estado.severidad) ??
        intensidadPorSeveridad(estado.severidad),
      deducida: false,
    };
  }
  return {
    emocion: emocionPorSeveridad(estado),
    intensidad: intensidadPorSeveridad(estado.severidad),
    deducida: true,
  };
}
