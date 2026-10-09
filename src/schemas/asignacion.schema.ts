import { z } from 'zod';

import { normalizarCodigoAcceso } from '@/lib/asignaciones/codigo';

/**
 * Código que escribe (o pega) el estudiante. Acepta mayúsculas, espacios, sin guiones o el enlace
 * completo, y lo devuelve normalizado (`abc-defg-hij`).
 */
export const codigoAccesoSchema = z
  .string()
  .trim()
  .min(1, 'Escribe el código que te envió tu docente.')
  .transform((valor, contexto) => {
    const codigo = normalizarCodigoAcceso(valor);
    if (!codigo) {
      contexto.addIssue({
        code: 'custom',
        message: 'El código tiene 10 letras, con este formato: abc-defg-hij.',
      });
      return z.NEVER;
    }
    return codigo;
  });

export const canjearCodigoSchema = z.object({ codigo: codigoAccesoSchema });

export type CanjearCodigoInput = z.input<typeof canjearCodigoSchema>;
export type CanjearCodigoData = z.output<typeof canjearCodigoSchema>;

export const idAsignacionSchema = z.object({ id: z.uuid() });
