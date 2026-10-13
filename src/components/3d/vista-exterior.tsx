'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type Mesh, type Object3D, ShaderMaterial, Vector3 } from 'three';

import { RAPIDEZ_AMBIENTE } from '@/components/3d/iluminacion';
import { useEfectosAmbiente } from '@/hooks/use-efectos-ambiente';
import { type EfectosAmbiente } from '@/lib/ambiente/clima';

/*
 * Vista por la ventana sin geometría ni texturas: un shader de "falso exterior" (la misma idea del
 * interior mapping, al revés). Por cada píxel del cristal se lanza un rayo desde la cámara y se
 * intersecta con planos imaginarios detrás de la pared —la calle, una hilera de árboles, la
 * ciudad, unas colinas y las nubes—, así la vista tiene profundidad y paralaje real al caminar por
 * la sala, con el coste de un solo rectángulo.
 *
 * El tiempo acompaña el clima emocional de la sesión (`useEfectosAmbiente`): despejado y dorado
 * con la calma, nublado y con lluvia con la pesadumbre, tormenta con relámpagos con la tensión.
 */

/** El consultorio está en un segundo piso: el suelo de la calle queda esta altura más abajo (m). */
const ALTURA_PISO = 3;

const VERTICE = /* glsl */ `
  varying vec3 vLocal;
  varying vec2 vUv;
  void main() {
    vLocal = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENTO = /* glsl */ `
  uniform vec3 uCamara;
  uniform float uTiempo;
  uniform float uSemilla;
  uniform float uSuelo;
  uniform float uCalma;
  uniform float uTension;
  uniform float uPesadumbre;
  uniform float uRelampago;
  varying vec3 vLocal;
  varying vec2 vUv;

  vec3 lineal(vec3 c) { return pow(c, vec3(2.2)); }
  float azar(float n) { return fract(sin(n * 12.9898 + uSemilla) * 43758.5453); }
  float azar2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSemilla) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = azar2(i);
    float b = azar2(i + vec2(1.0, 0.0));
    float c = azar2(i + vec2(0.0, 1.0));
    float d = azar2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * ruido(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
  /** Distancia del rayo al plano vertical z = -profundidad (o un valor enorme si no lo cruza). */
  float alPlano(vec3 o, vec3 d, float profundidad) {
    return d.z < -1e-4 ? (-profundidad - o.z) / d.z : 1e9;
  }

  void main() {
    vec3 o = uCamara;
    vec3 d = normalize(vLocal - uCamara);
    float nublado = clamp(uPesadumbre + uTension * 0.85, 0.0, 1.0);
    float viento = 1.0 + 3.0 * uTension;

    // ---- Cielo ----
    vec3 horizonte = mix(lineal(vec3(0.80, 0.89, 0.94)), lineal(vec3(0.98, 0.88, 0.72)), uCalma * 0.7);
    vec3 cenit = lineal(vec3(0.36, 0.62, 0.85));
    horizonte = mix(horizonte, lineal(vec3(0.72, 0.75, 0.78)), uPesadumbre);
    cenit = mix(cenit, lineal(vec3(0.52, 0.57, 0.62)), uPesadumbre);
    horizonte = mix(horizonte, lineal(vec3(0.36, 0.34, 0.40)), uTension);
    cenit = mix(cenit, lineal(vec3(0.17, 0.18, 0.24)), uTension);
    float alto = max(d.y, 0.0);
    vec3 cielo = mix(cenit, horizonte, pow(1.0 - alto, 3.0));

    vec3 sol = normalize(vec3(0.45, 0.3, -1.0));
    float s = max(dot(d, sol), 0.0);
    vec3 colorSol = mix(vec3(1.0, 0.93, 0.8), vec3(1.0, 0.8, 0.55), uCalma);
    cielo += colorSol * (pow(s, 1200.0) * 6.0 + pow(s, 14.0) * 0.3) * (1.0 - nublado);

    if (d.y > 0.0) {
      float t = (80.0 - o.y) / d.y;
      vec2 p = (o.xz + d.xz * t) * 0.01 + vec2(uTiempo * 0.006 * viento, uSemilla * 3.1);
      float n = fbm(p);
      float cobertura = mix(0.56, 0.2, nublado);
      float densidad = smoothstep(cobertura, cobertura + 0.3, n) * smoothstep(0.0, 0.1, d.y);
      vec3 colorNube = mix(vec3(1.0, 0.98, 0.95), lineal(vec3(0.58, 0.6, 0.64)), nublado);
      colorNube = mix(colorNube, lineal(vec3(0.24, 0.24, 0.29)), uTension);
      colorNube *= 0.78 + 0.22 * smoothstep(0.3, 0.9, fbm(p * 1.7 + 4.0));
      cielo = mix(cielo, colorNube, densidad * 0.9);
    }

    // ---- Lo más cercano que toca el rayo ----
    float tMin = 1e9;
    vec3 color = cielo;

    // Calle vista desde un segundo piso: andén, calzada, andén y un parque.
    if (d.y < 0.0) {
      float t = (uSuelo - o.y) / d.y;
      vec3 p = o + d * t;
      float lejos = -p.z;
      vec3 suelo;
      if (lejos < 3.0) {
        suelo = lineal(vec3(0.72, 0.70, 0.66));
        suelo *= 0.9 + 0.1 * step(0.06, fract(p.x / 1.2)) * step(0.06, fract(lejos / 1.2));
      } else if (lejos < 11.0) {
        suelo = lineal(vec3(0.30, 0.31, 0.34)) * (0.92 + 0.12 * ruido(p.xz * 3.0));
        float linea = step(abs(lejos - 7.0), 0.1) * step(0.5, fract(p.x / 4.0 + uSemilla));
        suelo = mix(suelo, lineal(vec3(0.92, 0.88, 0.7)), linea);
        float borde = step(abs(lejos - 3.15), 0.15) + step(abs(lejos - 10.85), 0.15);
        suelo = mix(suelo, lineal(vec3(0.8, 0.78, 0.74)), min(borde, 1.0));
      } else if (lejos < 13.0) {
        suelo = lineal(vec3(0.72, 0.70, 0.66));
      } else {
        suelo = lineal(vec3(0.45, 0.6, 0.32)) * (0.8 + 0.3 * fbm(p.xz * 0.35));
      }
      // Mojado y oscuro con la lluvia.
      suelo *= 1.0 - 0.35 * nublado;
      tMin = t;
      color = suelo;
    }

    // Hilera de árboles del parque (z = -18), que el viento mece.
    float tArbol = alPlano(o, d, 18.0);
    if (tArbol < tMin) {
      vec3 p = o + d * tArbol;
      float y = p.y - uSuelo;
      float ancho = 8.0;
      float celda = floor(p.x / ancho);
      float centro = (0.5 + (azar(celda) - 0.5) * 0.5) * ancho;
      float altura = 6.0 + 3.0 * azar(celda + 3.0);
      float radio = 2.6 + 1.3 * azar(celda + 7.0);
      float vaiven = sin(uTiempo * (0.8 + 1.6 * uTension) + celda * 1.7) * (0.04 + 0.12 * uTension);
      float x = mod(p.x, ancho) + vaiven * max(y, 0.0);
      float borde = radio * (0.82 + 0.3 * ruido(vec2(p.x, y) * 0.9));
      float copa = length(vec2(x - centro, (y - altura) * 1.15)) - borde;
      if (copa < 0.0 && azar(celda + 11.0) > 0.12) {
        float luz = clamp((y - altura + radio) / (2.0 * radio), 0.0, 1.0);
        vec3 verde = mix(lineal(vec3(0.2, 0.33, 0.16)), lineal(vec3(0.46, 0.62, 0.3)), luz);
        tMin = tArbol;
        color = verde * (0.82 + 0.3 * ruido(vec2(p.x, y) * 2.5));
      } else if (abs(x - centro) < 0.22 && y > 0.0 && y < altura - radio * 0.4) {
        tMin = tArbol;
        color = lineal(vec3(0.33, 0.24, 0.18));
      }
    }

    // Edificios de la ciudad (z = -150), con ventanas que se encienden con la tormenta.
    float tCiudad = alPlano(o, d, 150.0);
    if (tCiudad < tMin) {
      vec3 p = o + d * tCiudad;
      float y = p.y - uSuelo;
      float ancho = 14.0;
      float celda = floor(p.x / ancho);
      float x = mod(p.x, ancho);
      float anchoEdificio = 8.0 + 5.0 * azar(celda + 1.0);
      float altura = 10.0 + 42.0 * pow(azar(celda + 2.0), 2.0);
      if (x < anchoEdificio && y < altura) {
        vec3 fachada = mix(lineal(vec3(0.62, 0.65, 0.7)), lineal(vec3(0.8, 0.73, 0.64)), azar(celda + 5.0));
        fachada *= x < anchoEdificio * 0.15 ? 0.82 : 1.0;
        vec2 v = vec2(fract(x / 2.0), fract(y / 3.0));
        float ventana = step(0.25, v.x) * step(v.x, 0.75) * step(0.3, v.y) * step(v.y, 0.78);
        float encendida = step(0.55, azar2(floor(vec2(x / 2.0, y / 3.0)) + celda * 7.0));
        vec3 vidrio = mix(lineal(vec3(0.45, 0.55, 0.65)), lineal(vec3(1.0, 0.82, 0.5)) * 1.4,
          encendida * clamp(uTension + uPesadumbre * 0.6, 0.0, 1.0));
        tMin = tCiudad;
        color = mix(fachada, vidrio, ventana);
      }
    }

    // Colinas al fondo (z = -420).
    float tColina = alPlano(o, d, 420.0);
    if (tColina < tMin) {
      vec3 p = o + d * tColina;
      float y = p.y - uSuelo;
      if (y < 35.0 + 40.0 * fbm(vec2(p.x * 0.004, uSemilla))) {
        tMin = tColina;
        color = lineal(vec3(0.42, 0.52, 0.46));
      }
    }

    // Perspectiva aérea: lo lejano se funde con el horizonte (más con lluvia).
    if (tMin < 1e8) {
      float bruma = 1.0 - exp(-tMin * (0.0035 + 0.02 * nublado));
      color = mix(color, horizonte, bruma);
      // Luz del día: más tenue con nubes y tormenta, más cálida con la calma.
      color *= mix(1.0, 0.62, nublado) * mix(vec3(1.0), vec3(1.06, 1.0, 0.9), uCalma);
    }

    // Lluvia: trazos que caen en diagonal (más con la tormenta).
    float lluvia = clamp(uPesadumbre * 1.1 + uTension * 0.8, 0.0, 1.0);
    if (lluvia > 0.01) {
      vec2 q = vUv * vec2(60.0, 1.6);
      q.x += q.y * (0.4 + 0.6 * uTension);
      float columna = floor(q.x);
      float caida = fract(q.y * 0.8 + uTiempo * (1.6 + azar(columna) * 1.2) * (1.0 + uTension) + azar(columna + 9.0) * 7.0);
      float trazo = (1.0 - smoothstep(0.0, 0.13, abs(fract(q.x) - 0.5))) * smoothstep(0.55, 1.0, caida) * step(caida, 0.995);
      color = mix(color, lineal(vec3(0.85, 0.88, 0.92)), trazo * lluvia * 0.45);
    }

    color += uRelampago * mix(vec3(0.35), vec3(1.6, 1.65, 1.9), step(1e8, tMin));

    // Cristal: un poco más oscuro en los bordes, como el reflejo del marco.
    float bordeCristal = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    color *= 0.9 + 0.1 * smoothstep(0.0, 0.12, bordeCristal);

    gl_FragColor = vec4(color * 1.15, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function prefiereMenosMovimiento(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Semilla numérica a partir de un texto (misma ventana, misma vista). */
function semillaDe(texto: string): number {
  return ([...texto].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 9973, 7) / 9973) * 100;
}

/** Material de la vista y su estado: el clima suavizado y los relámpagos. */
class Vista {
  readonly material: ShaderMaterial;
  private readonly actual = { calma: 0, tension: 0, pesadumbre: 0, relampago: 0 };
  private readonly posicion = new Vector3();
  private readonly quieto = prefiereMenosMovimiento();

  constructor(semilla: string) {
    this.material = new ShaderMaterial({
      vertexShader: VERTICE,
      fragmentShader: FRAGMENTO,
      uniforms: {
        uCamara: { value: new Vector3() },
        uTiempo: { value: 0 },
        uSemilla: { value: semillaDe(semilla) },
        uSuelo: { value: -4.5 },
        uCalma: { value: 0 },
        uTension: { value: 0 },
        uPesadumbre: { value: 0 },
        uRelampago: { value: 0 },
      },
    });
  }

  avanzar(
    cristal: Object3D,
    camara: Object3D,
    tiempo: number,
    dt: number,
    efectos: EfectosAmbiente
  ) {
    const u = this.material.uniforms;
    cristal.updateWorldMatrix(true, false);
    u.uCamara!.value.copy(cristal.worldToLocal(camara.getWorldPosition(this.posicion)));
    // El suelo de la sala está en y = 0 del mundo; la calle, un piso más abajo.
    u.uSuelo!.value = cristal.worldToLocal(this.posicion.set(0, -ALTURA_PISO, 0)).y;
    if (!this.quieto) u.uTiempo!.value = tiempo;

    const t = 1 - Math.exp(-RAPIDEZ_AMBIENTE * dt);
    const a = this.actual;
    a.calma += (efectos.calma - a.calma) * t;
    a.tension += (efectos.tension - a.tension) * t;
    a.pesadumbre += (efectos.pesadumbre - a.pesadumbre) * t;
    // Relámpagos de vez en cuando con la tormenta (no con "reducir movimiento").
    a.relampago *= Math.exp(-dt * 7);
    if (!this.quieto && a.tension > 0.45 && Math.random() < dt * 0.12 * a.tension) {
      a.relampago = 0.7 + Math.random() * 0.3;
    }
    u.uCalma!.value = a.calma;
    u.uTension!.value = a.tension;
    u.uPesadumbre!.value = a.pesadumbre;
    u.uRelampago!.value = a.relampago;
  }
}

/** Cristal de una ventana con la vista exterior. Plano de `ancho` × `alto` mirando hacia +Z. */
export function VistaExterior({
  ancho,
  alto,
  semilla,
}: {
  ancho: number;
  alto: number;
  semilla: string;
}) {
  const efectos = useEfectosAmbiente();
  const malla = useRef<Mesh>(null);
  const vista = useMemo(() => new Vista(semilla), [semilla]);
  useEffect(() => () => vista.material.dispose(), [vista]);

  useFrame(({ camera, clock }, delta) => {
    if (malla.current) {
      vista.avanzar(malla.current, camera, clock.elapsedTime, Math.min(delta, 0.1), efectos);
    }
  });

  return (
    <mesh ref={malla} material={vista.material}>
      <planeGeometry args={[ancho, alto]} />
    </mesh>
  );
}
