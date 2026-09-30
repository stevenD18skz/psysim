'use client';

import { useProgress } from '@react-three/drei';
import { AlertTriangle, Compass, MousePointer2, RotateCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ID_BOTON_EXPLORAR } from '@/components/3d/controles-primera-persona';
import { LoadingScreen } from '@/components/3d/loading-screen';
import { IndicadorFps } from '@/components/3d/monitor-rendimiento';
import { useEscena } from '@/components/3d/use-escena';
import { HudSesion } from '@/components/simulacion/hud-sesion';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store-provider';
import { type SesionActiva } from '@/types';

// HU-08 · T01: Three.js necesita el DOM, así que la escena no se renderiza en el servidor.
const EscenaSimulacion = dynamic(() => import('@/components/simulacion/escena-simulacion'), {
  ssr: false,
});

/**
 * HU-09 · T05 — Pantalla de simulación. Sincroniza la sesión cargada por el servidor con el
 * store de Zustand y monta la escena a partir del escenario guardado en el store.
 */
export function SimulacionCliente({ sesion }: { sesion: SesionActiva }) {
  const activa = useAppStore(state => state.sesion.activa);
  const iniciarSesion = useAppStore(state => state.sesion.iniciar);

  // Tras una recarga o al abrir la URL directamente, el store está vacío. En todos los casos se
  // sincroniza con la sesión que verificó el servidor (RLS garantiza que es del docente), que
  // además trae la hora de inicio autoritativa de la base de datos.
  useEffect(() => {
    iniciarSesion(sesion);
  }, [sesion, iniciarSesion]);

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-background">
      {activa?.id === sesion.id ? (
        <Escenario sesion={activa} />
      ) : (
        <LoadingScreen
          visible
          titulo={sesion.escenario.titulo}
          competencia={sesion.escenario.competenciaCentral}
        />
      )}
    </div>
  );
}

function Escenario({ sesion }: { sesion: SesionActiva }) {
  const { estado, reintentar } = useEscena(sesion.escenario.configuracion3d);
  const { active: cargandoModelos } = useProgress();
  const [canvasListo, setCanvasListo] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const depuracion = useSearchParams().get('debug') === '1';

  const lista = estado.estado === 'lista' && canvasListo && !cargandoModelos;

  return (
    <>
      {estado.estado === 'lista' && (
        <EscenaSimulacion
          escena={estado.escena}
          onListo={() => setCanvasListo(true)}
          onBloqueoCambia={setBloqueado}
        />
      )}

      {/* Capa de interfaz: no bloquea los eventos del canvas salvo en sus propios elementos. */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <HudSesion sesion={sesion} />
          {depuracion && <IndicadorFps />}
        </div>

        {lista && !bloqueado && <InvitacionExplorar />}
        {lista && bloqueado && <Mira />}
      </div>

      {estado.estado === 'error' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background p-6">
          <div role="alert" className="flex max-w-sm flex-col items-center gap-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" aria-hidden />
            </span>
            <h2 className="text-xl font-semibold">{estado.mensaje}</h2>
            <p className="text-sm text-muted-foreground">
              Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, vuelve a la
              configuración y selecciona otro escenario.
            </p>
            <div className="flex gap-2">
              <Button onClick={reintentar}>
                <RotateCw aria-hidden />
                Reintentar
              </Button>
              <Button variant="outline" asChild>
                <Link href="/configuracion">Volver a configuración</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <LoadingScreen
        visible={!lista && estado.estado !== 'error'}
        titulo={sesion.escenario.titulo}
        competencia={sesion.escenario.competenciaCentral}
      />
    </>
  );
}

/** Tarjeta que invita a capturar el ratón para explorar (Pointer Lock requiere un clic). */
function InvitacionExplorar() {
  return (
    <div className="mt-auto flex justify-center pb-6">
      <div className="pointer-events-auto flex max-w-md animate-in flex-col items-center gap-4 rounded-2xl border bg-card/95 p-6 text-center shadow-xl backdrop-blur fade-in-0 slide-in-from-bottom-4">
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Compass className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Explora el consultorio</h2>
          <p className="text-sm text-muted-foreground">
            Acércate al paciente y ubícate frente a él antes de iniciar la conversación.
          </p>
        </div>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Tecla>W</Tecla>
            <Tecla>A</Tecla>
            <Tecla>S</Tecla>
            <Tecla>D</Tecla>
            <span>o flechas para caminar</span>
          </li>
          <li className="flex items-center gap-1.5">
            <MousePointer2 className="size-4" aria-hidden />
            <span>ratón para mirar</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Tecla>Esc</Tecla>
            <span>para liberar el ratón</span>
          </li>
        </ul>
        <Button id={ID_BOTON_EXPLORAR} size="lg">
          Comenzar a explorar
        </Button>
      </div>
    </div>
  );
}

function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-b-2 bg-background px-1.5 font-mono text-xs text-foreground">
      {children}
    </kbd>
  );
}

/** Punto central mientras el ratón está capturado. */
function Mira() {
  return (
    <div
      aria-hidden
      className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full bg-white/90 shadow-[0_0_0_1.5px_rgba(0,0,0,0.35)]"
    />
  );
}
