import { type EfectosAmbiente } from '@/lib/ambiente/clima';

import { type Silaba } from './voz';

/**
 * Motor de sonido de la simulación, sintetizado con la Web Audio API: no usa archivos (sin
 * descargas ni licencias). Si más adelante se prefieren grabaciones, se reemplaza cada capa sin
 * tocar el resto de la aplicación.
 *
 *   ruido marrón ─ paso bajo ─────────────────────────── murmullo de la sala (siempre)
 *   ruido marrón ─ paso banda (barrido lento) ─ ráfagas ─ viento ........... calma
 *   (pájaros: trinos esporádicos) ........................................... calma
 *   ruido blanco ─ paso alto/bajo ─────────────────────── lluvia ........... pesadumbre
 *   osciladores graves ─ paso bajo ───────────────────── zumbido ........... tensión
 *   (latido: golpes graves dobles) ...................................... tensión alta
 *   (reloj: tic cada segundo) ............................................... siempre
 *
 * El navegador solo permite sonido tras un gesto del usuario: `activar()` se llama al pulsar
 * (p. ej. "Iniciar simulación"). Sin Web Audio (tests, navegadores antiguos) todo es un no-op.
 */

export type EfectoSonido = 'inicio' | 'enviar' | 'fin';

const CLAVE_SILENCIO = 'psysim:sonido-silenciado';
const VOLUMEN_GENERAL = 0.8;
/** Constante de tiempo de las transiciones de las capas (s): ~3 s hasta el nuevo nivel. */
const TRANSICION_S = 1;
const NIVEL = {
  sala: 0.05,
  viento: 0.18,
  lluvia: 0.09,
  zumbido: 0.09,
  latido: 0.3,
  reloj: 0.035,
  pajaros: 0.045,
  voz: 0.22,
};

interface Capas {
  viento: GainNode;
  lluvia: GainNode;
  zumbido: GainNode;
  filtroZumbido: BiquadFilterNode;
}

function leerSilencio(): boolean {
  try {
    return localStorage.getItem(CLAVE_SILENCIO) === '1';
  } catch {
    return false;
  }
}

function guardarSilencio(silenciado: boolean) {
  try {
    localStorage.setItem(CLAVE_SILENCIO, silenciado ? '1' : '0');
  } catch {
    // Sin almacenamiento (modo privado): la preferencia dura solo esta visita.
  }
}

function crearRuido(ctx: AudioContext, tipo: 'blanco' | 'marron'): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < datos.length; i++) {
    const blanco = Math.random() * 2 - 1;
    // Ruido marrón: integra el blanco (más grave y cálido, como aire o viento lejano).
    ultimo = (ultimo + 0.02 * blanco) / 1.02;
    datos[i] = tipo === 'blanco' ? blanco : ultimo * 3.5;
  }
  return buffer;
}

export class MotorAudio {
  private ctx: AudioContext | null = null;
  private maestro: GainNode | null = null;
  private voz: GainNode | null = null;
  private capas: Capas | null = null;
  private ruidoBlanco: AudioBuffer | null = null;
  private temporizador: ReturnType<typeof setInterval> | undefined;
  private fuentesVoz: OscillatorNode[] = [];
  private efectos: EfectosAmbiente | null = null;
  private proximo = { reloj: 0, latido: 0, pajaros: 0 };
  private silenciado = leerSilencio();
  private readonly oyentes = new Set<() => void>();

  // ---------- Silencio (para el botón del HUD, con useSyncExternalStore) ----------
  suscribir = (oyente: () => void) => {
    this.oyentes.add(oyente);
    return () => {
      this.oyentes.delete(oyente);
    };
  };

  estaSilenciado = () => this.silenciado;

  silenciar = (silenciado: boolean) => {
    this.silenciado = silenciado;
    guardarSilencio(silenciado);
    if (this.ctx && this.maestro) {
      this.maestro.gain.setTargetAtTime(
        silenciado ? 0 : VOLUMEN_GENERAL,
        this.ctx.currentTime,
        0.05
      );
    }
    this.oyentes.forEach(oyente => oyente());
  };

  // ---------- Ciclo de vida ----------
  /** Crea (o reanuda) el contexto de audio. Llamar tras un gesto del usuario. */
  activar = async () => {
    const Contexto = typeof window === 'undefined' ? undefined : window.AudioContext;
    if (!Contexto) return;
    if (!this.ctx) this.construir(new Contexto());
    if (this.ctx?.state === 'suspended') await this.ctx.resume().catch(() => {});
  };

  /** Detiene todo y libera el contexto de audio. */
  liberar = () => {
    clearInterval(this.temporizador);
    document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.maestro = null;
    this.capas = null;
    this.voz = null;
  };

  /** En otra pestaña, el sonido se pausa (y deja de gastar batería). */
  private alCambiarVisibilidad = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend().catch(() => {});
    else void this.ctx.resume().catch(() => {});
  };

  private construir(ctx: AudioContext) {
    this.ctx = ctx;
    const compresor = ctx.createDynamicsCompressor();
    compresor.connect(ctx.destination);
    const maestro = ctx.createGain();
    maestro.gain.value = this.silenciado ? 0 : VOLUMEN_GENERAL;
    maestro.connect(compresor);
    this.maestro = maestro;

    const marron = crearRuido(ctx, 'marron');
    this.ruidoBlanco = crearRuido(ctx, 'blanco');
    const ruido = (buffer: AudioBuffer) => {
      const fuente = ctx.createBufferSource();
      fuente.buffer = buffer;
      fuente.loop = true;
      fuente.start();
      return fuente;
    };
    const filtro = (tipo: BiquadFilterType, frecuencia: number, q = 0.7) => {
      const f = ctx.createBiquadFilter();
      f.type = tipo;
      f.frequency.value = frecuencia;
      f.Q.value = q;
      return f;
    };
    const ganancia = (valor: number) => {
      const g = ctx.createGain();
      g.gain.value = valor;
      return g;
    };
    const lfo = (frecuencia: number, profundidad: number, destino: AudioParam) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = frecuencia;
      const g = ganancia(profundidad);
      osc.connect(g).connect(destino);
      osc.start();
    };

    // Murmullo de la sala: siempre presente, muy bajo.
    ruido(marron).connect(filtro('lowpass', 500)).connect(ganancia(NIVEL.sala)).connect(maestro);

    // Viento: banda que barre despacio y ráfagas.
    const bandaViento = filtro('bandpass', 420, 0.8);
    lfo(0.07, 220, bandaViento.frequency);
    const rafagas = ganancia(0.7);
    lfo(0.13, 0.3, rafagas.gain);
    const viento = ganancia(0);
    ruido(marron).connect(bandaViento).connect(rafagas).connect(viento).connect(maestro);

    // Lluvia: ruido blanco filtrado, como un aguacero tras la ventana.
    const lluvia = ganancia(0);
    ruido(this.ruidoBlanco)
      .connect(filtro('highpass', 700))
      .connect(filtro('lowpass', 5000))
      .connect(lluvia)
      .connect(maestro);

    // Zumbido de tensión: graves desafinados que "laten" entre sí.
    const filtroZumbido = filtro('lowpass', 140, 2);
    const zumbido = ganancia(0);
    filtroZumbido.connect(zumbido).connect(maestro);
    for (const [frecuencia, tipo] of [
      [55, 'sawtooth'],
      [55.4, 'sawtooth'],
      [82.4, 'sine'],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = tipo;
      osc.frequency.value = frecuencia;
      osc.connect(filtroZumbido);
      osc.start();
    }

    this.capas = { viento, lluvia, zumbido, filtroZumbido };

    const voz = ganancia(NIVEL.voz);
    voz.connect(maestro);
    this.voz = voz;

    if (this.efectos) this.fijarAmbiente(this.efectos);
    const ahora = ctx.currentTime;
    this.proximo = { reloj: ahora + 1, latido: ahora + 1, pajaros: ahora + 2 };
    this.temporizador = setInterval(this.programar, 100);
    document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
  }

  // ---------- Ambiente ----------
  /** Ajusta las capas al clima emocional (las transiciones son suaves). */
  fijarAmbiente = (efectos: EfectosAmbiente) => {
    this.efectos = efectos;
    const { ctx, capas } = this;
    if (!ctx || !capas) return;
    const t = ctx.currentTime;
    capas.viento.gain.setTargetAtTime(NIVEL.viento * efectos.calma, t, TRANSICION_S);
    capas.lluvia.gain.setTargetAtTime(NIVEL.lluvia * efectos.pesadumbre, t, TRANSICION_S);
    capas.zumbido.gain.setTargetAtTime(NIVEL.zumbido * efectos.tension, t, TRANSICION_S);
    // Con más tensión el zumbido se abre: más áspero e inquietante.
    capas.filtroZumbido.frequency.setTargetAtTime(120 + 260 * efectos.tension, t, TRANSICION_S);
  };

  /** Sonidos puntuales (reloj, latido, pájaros), programados con un poco de antelación. */
  private programar = () => {
    const { ctx } = this;
    if (!ctx || ctx.state !== 'running') return;
    const ahora = ctx.currentTime;
    const horizonte = ahora + 0.3;
    const efectos = this.efectos;
    // Tras una pausa (pestaña oculta) no se recuperan los sonidos atrasados de golpe.
    for (const clave of ['reloj', 'latido', 'pajaros'] as const) {
      if (this.proximo[clave] < ahora - 0.25) this.proximo[clave] = ahora + 0.05;
    }

    while (this.proximo.reloj < horizonte) {
      this.tic(this.proximo.reloj);
      this.proximo.reloj += 1;
    }

    const tension = efectos?.tension ?? 0;
    while (this.proximo.latido < horizonte) {
      if (tension > 0.55) {
        this.golpe(this.proximo.latido, tension);
        this.golpe(this.proximo.latido + 0.22, tension * 0.7);
      }
      // El pulso se acelera con la tensión (de 65 a ~100 latidos por minuto).
      this.proximo.latido += 60 / (65 + 35 * tension);
    }

    const calma = efectos?.calma ?? 0;
    while (this.proximo.pajaros < horizonte) {
      if (calma > 0.35) this.trino(this.proximo.pajaros, calma);
      this.proximo.pajaros += 3 + Math.random() * 5;
    }
  };

  private tic(cuando: number) {
    const { ctx, maestro, ruidoBlanco } = this;
    if (!ctx || !maestro || !ruidoBlanco) return;
    const fuente = ctx.createBufferSource();
    fuente.buffer = ruidoBlanco;
    const banda = ctx.createBiquadFilter();
    banda.type = 'bandpass';
    banda.frequency.value = 3500;
    banda.Q.value = 5;
    const envolvente = ctx.createGain();
    envolvente.gain.setValueAtTime(NIVEL.reloj, cuando);
    envolvente.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.03);
    fuente.connect(banda).connect(envolvente).connect(maestro);
    fuente.start(cuando, Math.random());
    fuente.stop(cuando + 0.04);
  }

  private golpe(cuando: number, intensidad: number) {
    const { ctx, maestro } = this;
    if (!ctx || !maestro) return;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(70, cuando);
    osc.frequency.exponentialRampToValueAtTime(38, cuando + 0.12);
    const envolvente = ctx.createGain();
    envolvente.gain.setValueAtTime(0.0001, cuando);
    envolvente.gain.exponentialRampToValueAtTime(NIVEL.latido * intensidad, cuando + 0.012);
    envolvente.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.16);
    osc.connect(envolvente).connect(maestro);
    osc.start(cuando);
    osc.stop(cuando + 0.2);
  }

  private trino(cuando: number, calma: number) {
    const { ctx, maestro } = this;
    if (!ctx || !maestro) return;
    const notas = 2 + Math.floor(Math.random() * 3);
    const base = 2800 + Math.random() * 900;
    for (let i = 0; i < notas; i++) {
      const inicio = cuando + i * (0.09 + Math.random() * 0.05);
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(base, inicio);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, inicio + 0.06);
      const envolvente = ctx.createGain();
      envolvente.gain.setValueAtTime(0.0001, inicio);
      envolvente.gain.exponentialRampToValueAtTime(NIVEL.pajaros * calma, inicio + 0.01);
      envolvente.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.07);
      osc.connect(envolvente).connect(maestro);
      osc.start(inicio);
      osc.stop(inicio + 0.08);
    }
  }

  // ---------- Efectos de la interfaz ----------
  efecto = (tipo: EfectoSonido) => {
    const { ctx, maestro } = this;
    if (!ctx || !maestro) return;
    const ahora = ctx.currentTime + 0.01;
    const nota = (frecuencia: number, inicio: number, duracion: number, volumen: number) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = frecuencia;
      const envolvente = ctx.createGain();
      envolvente.gain.setValueAtTime(0.0001, inicio);
      envolvente.gain.exponentialRampToValueAtTime(volumen, inicio + 0.015);
      envolvente.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
      osc.connect(envolvente).connect(maestro);
      osc.start(inicio);
      osc.stop(inicio + duracion + 0.05);
      return osc;
    };

    if (tipo === 'enviar') {
      // Un "pop" breve que sube: el mensaje sale.
      const osc = nota(520, ahora, 0.12, 0.07);
      osc.frequency.setValueAtTime(520, ahora);
      osc.frequency.exponentialRampToValueAtTime(780, ahora + 0.07);
    } else if (tipo === 'inicio') {
      // Acorde mayor arpegiado, suave: empieza la sesión.
      [523.25, 659.25, 783.99].forEach((f, i) => nota(f, ahora + i * 0.07, 1.4, 0.05));
    } else {
      // Arpegio descendente: se cierra la sesión.
      [783.99, 659.25, 523.25].forEach((f, i) => nota(f, ahora + i * 0.14, 1.2, 0.05));
    }
  };

  // ---------- Voz inventada ----------
  /** Reproduce un plan de sílabas (`planVoz`). Corta cualquier frase anterior. */
  hablar = (silabas: readonly Silaba[]) => {
    this.callar();
    const { ctx, voz } = this;
    if (!ctx || !voz) return;
    const inicio = ctx.currentTime + 0.05;
    for (const silaba of silabas) {
      const t = inicio + silaba.inicio;
      const fin = t + silaba.duracion;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      // Cada sílaba empieza un poco más aguda y se asienta: suena a habla, no a pitido.
      osc.frequency.setValueAtTime(silaba.tono * 1.06, t);
      osc.frequency.exponentialRampToValueAtTime(silaba.tono, t + silaba.duracion * 0.6);

      const formante = ctx.createBiquadFilter();
      formante.type = 'bandpass';
      formante.frequency.value = silaba.formante;
      formante.Q.value = 3;
      const cuerpo = ctx.createBiquadFilter();
      cuerpo.type = 'lowpass';
      cuerpo.frequency.value = 1200;

      const envolvente = ctx.createGain();
      envolvente.gain.setValueAtTime(0.0001, t);
      envolvente.gain.exponentialRampToValueAtTime(silaba.volumen, t + 0.012);
      envolvente.gain.setValueAtTime(silaba.volumen, t + silaba.duracion * 0.5);
      envolvente.gain.exponentialRampToValueAtTime(0.0001, fin);

      osc.connect(formante).connect(envolvente);
      osc.connect(cuerpo).connect(envolvente);
      envolvente.connect(voz);
      osc.start(t);
      osc.stop(fin + 0.02);
      this.fuentesVoz.push(osc);
      osc.onended = () => {
        this.fuentesVoz = this.fuentesVoz.filter(o => o !== osc);
      };
    }
  };

  /** Interrumpe la frase en curso. */
  callar = () => {
    for (const osc of this.fuentesVoz) {
      try {
        osc.stop();
      } catch {
        // Ya había terminado.
      }
    }
    this.fuentesVoz = [];
  };
}
