import { type SesionHistorial } from '@/types';

/** Tono visual del estado (se traduce a colores en la interfaz). */
export type TonoEstado = 'en-curso' | 'pendiente' | 'listo' | 'neutro';

export interface EstadoVisible {
  texto: string;
  tono: TonoEstado;
}

type DatosEstado = Pick<SesionHistorial, 'estado' | 'comenzada' | 'retroalimentacion'>;

/**
 * Qué está pasando con la sesión, en palabras del docente o del estudiante:
 * en progreso, pendiente de retroalimentación, borrador o retroalimentación publicada.
 */
export function estadoVisibleSesion(
  sesion: DatosEstado,
  para: 'docente' | 'estudiante'
): EstadoVisible {
  if (sesion.estado === 'en_curso') {
    if (!sesion.comenzada) {
      return {
        texto: para === 'docente' ? 'Leyendo las instrucciones' : 'Sin comenzar',
        tono: 'en-curso',
      };
    }
    return { texto: 'Simulación en progreso', tono: 'en-curso' };
  }

  const publicada = sesion.retroalimentacion?.publicada ?? false;
  if (publicada) {
    return {
      texto: para === 'docente' ? 'Retroalimentación publicada' : 'Retroalimentación disponible',
      tono: 'listo',
    };
  }
  if (para === 'docente') {
    return sesion.retroalimentacion
      ? { texto: 'Borrador de retroalimentación', tono: 'pendiente' }
      : { texto: 'Pendiente de retroalimentación', tono: 'pendiente' };
  }
  return {
    texto:
      sesion.estado === 'interrumpida'
        ? 'Interrumpida · en revisión'
        : 'Pendiente de retroalimentación',
    tono: 'pendiente',
  };
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
