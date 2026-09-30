import { type AjusteModelo } from '@/schemas/escena.schema';

export interface CajaModelo {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

export interface ResultadoAjuste {
  escala: number;
  /** Traslación (ya escalada) que apoya el modelo en el suelo y lo centra en X/Z. */
  desplazamiento: [number, number, number];
}

/**
 * Calcula la escala uniforme y la traslación que normalizan un modelo a la medida objetivo
 * (`alto` o `ancho` en metros). Sin medida objetivo conserva el tamaño original y solo lo
 * apoya en el suelo y lo centra.
 */
export function calcularAjuste(caja: CajaModelo, ajuste: AjusteModelo): ResultadoAjuste {
  const alto = caja.max[1] - caja.min[1];
  const ancho = caja.max[0] - caja.min[0];

  let escala = 1;
  if (ajuste.alto !== undefined && alto > 0) escala = ajuste.alto / alto;
  else if (ajuste.ancho !== undefined && ancho > 0) escala = ajuste.ancho / ancho;

  const centroX = (caja.min[0] + caja.max[0]) / 2;
  const centroZ = (caja.min[2] + caja.max[2]) / 2;

  return {
    escala,
    desplazamiento: [-centroX * escala, -caja.min[1] * escala, -centroZ * escala],
  };
}
