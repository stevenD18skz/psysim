import { cierrePorInactividad } from '@/lib/fechas';
import { type SesionHistorial } from '@/types';

/** Tono visual del estado (se traduce a colores en la interfaz). */
export type TonoEstado = 'en-curso' | 'pendiente' | 'listo' | 'neutro';

export interface EstadoVisible {
  texto: string;
  tono: TonoEstado;
}

type DatosEstado = Pick<SesionHistorial, 'estado' | 'comenzada' | 'retroalimentacion'>;

interface ContextoEstado {
  /** Última actividad de una práctica en curso: permite saber si ya se está cerrando. */
  ultimaActividad?: string;
  ahora?: Date;
}

/**
 * Qué está pasando con la práctica, con la misma regla para los dos roles y la voz de cada uno
 * (tabla de estados de docs/rediseno/fase-2-flujos-y-copy.md, §2.1). Una práctica en curso cuyo
 * plazo de inactividad ya venció se muestra «cerrándose» hasta que el servidor la cierre.
 */
export function estadoVisibleSesion(
  sesion: DatosEstado,
  para: 'docente' | 'estudiante',
  { ultimaActividad, ahora = new Date() }: ContextoEstado = {}
): EstadoVisible {
  const docente = para === 'docente';

  if (sesion.estado === 'en_curso') {
    if (ultimaActividad && cierrePorInactividad(ultimaActividad) < ahora) {
      return { texto: 'Cerrándose por inactividad', tono: 'neutro' };
    }
    if (!sesion.comenzada) {
      return { texto: docente ? 'Abrió la práctica' : 'Abierta, sin empezar', tono: 'en-curso' };
    }
    return { texto: docente ? 'Practicando ahora' : 'En curso', tono: 'en-curso' };
  }

  if (sesion.estado === 'interrumpida' && !sesion.comenzada) {
    return { texto: 'Sin conversación', tono: 'neutro' };
  }

  if (sesion.retroalimentacion?.publicada) {
    return { texto: docente ? 'Publicada' : 'Retroalimentación lista', tono: 'listo' };
  }

  if (!docente) return { texto: 'Esperando retroalimentación', tono: 'pendiente' };
  if (sesion.retroalimentacion) return { texto: 'Borrador guardado', tono: 'pendiente' };
  return {
    texto: sesion.estado === 'interrumpida' ? 'Por revisar · sin terminar' : 'Por revisar',
    tono: 'pendiente',
  };
}

/**
 * ¿Le toca al docente revisarla? Terminó (finalizada o interrumpida), llegó a comenzar (hay una
 * conversación que leer) y su retroalimentación aún no está publicada.
 */
export function estaPorRevisar(
  sesion: Pick<SesionHistorial, 'estado' | 'comenzada' | 'retroalimentacion'>
): boolean {
  return (
    sesion.estado !== 'en_curso' &&
    sesion.comenzada &&
    !(sesion.retroalimentacion?.publicada ?? false)
  );
}

/** Estado de la sesión en una palabra, para tablas e informes. */
export function estadoCortoSesion(sesion: Pick<SesionHistorial, 'estado' | 'comenzada'>): string {
  if (sesion.estado === 'finalizada') return 'Finalizada';
  if (sesion.estado === 'interrumpida') return sesion.comenzada ? 'Interrumpida' : 'No comenzada';
  return sesion.comenzada ? 'En curso' : 'Sin comenzar';
}

/** Duración en segundos de una sesión terminada que llegó a comenzar (o `null`). */
export function duracionSesion(sesion: {
  comenzada: boolean;
  inicio: string;
  fin: string | null;
}): number | null {
  if (!sesion.comenzada || !sesion.fin) return null;
  return Math.max(0, (new Date(sesion.fin).getTime() - new Date(sesion.inicio).getTime()) / 1000);
}
