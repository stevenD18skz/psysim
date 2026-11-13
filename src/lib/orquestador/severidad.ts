import { type EmocionNpc, type IntensidadEmocion } from '@/lib/conversacion/emociones';

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

/** Banderas del orquestador que indican trato inapropiado hacia el paciente. */
const BANDERAS_DE_MALTRATO = new Set(['abuse', 'repeat_abuse']);

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
  if (banderas.some(bandera => BANDERAS_DE_MALTRATO.has(bandera))) return 'molesto';
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
