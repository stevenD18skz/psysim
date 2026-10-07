import { type EmocionNpc } from '@/lib/conversacion/emociones';
import { type MensajeConversacion } from '@/types';

/**
 * Clima emocional de la sesión: el ambiente (luz, niebla, partículas, sonido) refleja cómo se
 * siente el paciente. No salta con cada respuesta: sigue un promedio móvil de sus emociones, así
 * varias respuestas difíciles seguidas cargan la sala y la reparación la aclara poco a poco.
 *
 * Cada emoción se ubica en dos ejes (modelo circunflejo de Russell):
 * - valencia: de desagradable (-1) a agradable (1);
 * - activación: de calmada (0) a agitada (1).
 */
export interface Clima {
  valencia: number;
  activacion: number;
}

export const CLIMA_NEUTRO: Readonly<Clima> = { valencia: 0, activacion: 0.3 };

const EJES: Readonly<Record<EmocionNpc, Clima>> = {
  neutral: CLIMA_NEUTRO,
  tranquilo: { valencia: 0.6, activacion: 0.15 },
  aliviado: { valencia: 0.8, activacion: 0.3 },
  triste: { valencia: -0.6, activacion: 0.2 },
  ansioso: { valencia: -0.5, activacion: 0.8 },
  molesto: { valencia: -0.6, activacion: 0.7 },
  abrumado: { valencia: -0.9, activacion: 0.9 },
};

/** Peso de cada respuesta nueva en el promedio móvil: dos respuestas iguales ya marcan el clima. */
export const PESO_RESPUESTA = 0.55;

/**
 * Clima a partir del historial: promedio móvil exponencial de las emociones de las respuestas
 * del paciente. Las respuestas sin emoción (sesión retomada) no aportan información y se omiten.
 */
export function climaDeConversacion(mensajes: readonly MensajeConversacion[]): Clima {
  let clima: Clima = CLIMA_NEUTRO;
  for (const mensaje of mensajes) {
    if (mensaje.remitente !== 'npc' || !mensaje.emocion) continue;
    const objetivo = EJES[mensaje.emocion];
    clima = {
      valencia: clima.valencia + (objetivo.valencia - clima.valencia) * PESO_RESPUESTA,
      activacion: clima.activacion + (objetivo.activacion - clima.activacion) * PESO_RESPUESTA,
    };
  }
  return clima;
}

/** Cómo se ve y se oye el ambiente para un clima (todos los valores de 0 a 1, salvo `brillo`). */
export interface EfectosAmbiente {
  /** Calma: sol cálido, polvo flotando en la luz, viento suave y pájaros. */
  calma: number;
  /** Tensión (desagradable y agitado): niebla, partículas oscuras, viñeta que late, zumbido. */
  tension: number;
  /** Pesadumbre (desagradable y apagado): luz fría y tenue, bruma, lluvia. */
  pesadumbre: number;
  /** Multiplicador de la intensidad de las luces de la escena (1 = como la diseñó la escena). */
  brillo: number;
  /** Temperatura de la luz: -1 fría, 0 la de la escena, 1 cálida. */
  calidez: number;
  /** Densidad de la niebla. */
  niebla: number;
  /** Oscurecimiento de los bordes de la pantalla. */
  vineta: number;
  /** La viñeta late como un pulso acelerado. */
  pulso: boolean;
}

const limitar = (valor: number, min = 0, max = 1) => Math.min(max, Math.max(min, valor));

/**
 * Traduce el clima a efectos. El clima neutro deja la escena exactamente como está diseñada
 * (brillo 1, sin niebla ni viñeta): el ambiente solo cambia cuando el paciente siente algo.
 */
export function efectosDeClima({ valencia, activacion }: Clima): EfectosAmbiente {
  const positiva = limitar(valencia);
  const negativa = limitar(-valencia);

  const calma = limitar(positiva * (1 - activacion * 0.5));
  const tension = limitar(negativa * (0.25 + 0.75 * activacion));
  const pesadumbre = limitar(negativa * (1 - activacion));

  return {
    calma,
    tension,
    pesadumbre,
    brillo: 1 + 0.25 * calma - 0.45 * tension - 0.35 * pesadumbre,
    calidez: limitar(calma - 0.5 * tension - 0.8 * pesadumbre, -1, 1),
    niebla: limitar(0.85 * tension + 0.6 * pesadumbre),
    vineta: limitar(0.85 * tension + 0.35 * pesadumbre),
    pulso: tension > 0.55,
  };
}
