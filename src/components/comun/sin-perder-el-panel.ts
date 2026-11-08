import { unstable_rethrow } from 'next/navigation';
import { toast } from 'sonner';

export const MENSAJE_SIN_CONEXION =
  'No pudimos completar la acción: revisa tu conexión e inténtalo de nuevo.';

/**
 * Envuelve el cuerpo de una transición que llama a una Server Action. Si la acción lanza (corte de
 * red, despliegue nuevo que invalida la acción), React manda el error al `error.tsx` más cercano y
 * el docente pierde lo que estaba haciendo; con esto ve un aviso y la pantalla sigue igual. Las
 * redirecciones de Next (`redirect`, `notFound`) se dejan pasar.
 */
export function sinPerderElPanel(
  cuerpo: () => Promise<void>,
  mensaje: string = MENSAJE_SIN_CONEXION
): () => Promise<void> {
  return async () => {
    try {
      await cuerpo();
    } catch (error) {
      unstable_rethrow(error);
      toast.error(mensaje);
    }
  };
}
