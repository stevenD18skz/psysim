'use client';

import { useProgress } from '@react-three/drei';
import {
  AlertTriangle,
  ArrowLeft,
  Compass,
  MessageCircle,
  MousePointer2,
  RotateCw,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ID_BOTON_EXPLORAR } from '@/components/3d/controles-primera-persona';
import {
  iniciarConversacion,
  interaccionStore,
  useInteraccion,
} from '@/components/3d/interaccion-paciente';
import { LoadingScreen } from '@/components/3d/loading-screen';
import { IndicadorFps } from '@/components/3d/monitor-rendimiento';
import { useEscena } from '@/components/3d/use-escena';
import { esCampoEditable } from '@/components/3d/use-teclado';
import { BotonFinalizar } from '@/components/simulacion/boton-finalizar';
import { ConversationPanel } from '@/components/simulacion/conversation-panel';
import { HudSesion } from '@/components/simulacion/hud-sesion';
import { InstruccionesCaso } from '@/components/simulacion/instrucciones-caso';
import { SesionFinalizada } from '@/components/simulacion/sesion-finalizada';
import { BotonSonido, useSonidoSimulacion } from '@/components/simulacion/sonido-simulacion';
import { useFinalizarSesion } from '@/components/simulacion/use-finalizar-sesion';
import { VeloEmocional } from '@/components/simulacion/velo-emocional';
import { Button } from '@/components/ui/button';
import { VOZ_POR_DEFECTO } from '@/lib/audio/voz';
import { estaConversando } from '@/lib/conversacion/estados-npc';
import { buscarModeloNpc } from '@/lib/npc/catalogo';
import { cn } from '@/lib/utils';
import { useAppStore, useAppStoreApi } from '@/store/app-store-provider';
import { type MensajeConversacion, type SesionActiva } from '@/types';

// HU-08 · T01: Three.js necesita el DOM, así que la escena no se renderiza en el servidor.
const EscenaSimulacion = dynamic(() => import('@/components/simulacion/escena-simulacion'), {
  ssr: false,
});

interface SimulacionClienteProps {
  sesion: SesionActiva;
  /** Conversación ya guardada de la sesión (al recargar la página se retoma). */
  historial: MensajeConversacion[];
}

/**
 * HU-09 · T05 — Pantalla de simulación. Sincroniza la sesión cargada por el servidor con el
 * store de Zustand y monta la escena a partir del escenario guardado en el store. Ocupa toda la
 * pantalla, sin la navegación del panel, para que la práctica sea inmersiva.
 */
export function SimulacionCliente({ sesion, historial }: SimulacionClienteProps) {
  const activa = useAppStore(state => state.sesion.activa);
  const iniciarSesion = useAppStore(state => state.sesion.iniciar);

  // Tras una recarga o al abrir la URL directamente, el store está vacío. En todos los casos se
  // sincroniza con la sesión que verificó el servidor (RLS garantiza que es del estudiante), con la
  // hora de inicio de la base de datos y la conversación guardada.
  useEffect(() => {
    iniciarSesion(sesion, historial);
  }, [sesion, historial, iniciarSesion]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background">
      {activa?.id === sesion.id ? (
        <Escenario sesion={activa} />
      ) : (
        <LoadingScreen
          visible
          titulo={sesion.escenario.titulo}
          competencia={sesion.escenario.competenciaCentral}
        />
      )}
    </main>
  );
}

/**
 * HU-13 · T01 — Atajos para iniciar la conversación: tecla E (si el estudiante está cerca) o
 * clic mientras el ratón está capturado y la mira apunta al paciente.
 */
function useAtajosConversacion() {
  const store = useAppStoreApi();

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.code !== 'KeyE' || evento.repeat || esCampoEditable(evento.target)) return;
      if (iniciarConversacion(store)) evento.preventDefault();
    };
    const alHacerClic = () => {
      if (document.pointerLockElement && interaccionStore.getState().apuntando) {
        iniciarConversacion(store);
      }
    };
    window.addEventListener('keydown', alPulsar);
    window.addEventListener('mousedown', alHacerClic);
    return () => {
      window.removeEventListener('keydown', alPulsar);
      window.removeEventListener('mousedown', alHacerClic);
    };
  }, [store]);
}

function Escenario({ sesion }: { sesion: SesionActiva }) {
  const { estado, reintentar } = useEscena(sesion.escenario.configuracion3d);
  const { active: cargandoModelos } = useProgress();
  const [canvasListo, setCanvasListo] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const depuracion = useSearchParams().get('debug') === '1';
  const estadoNpc = useAppStore(state => state.npc.estado);
  const cerca = useInteraccion(interaccion => interaccion.cerca);
  const apuntando = useInteraccion(interaccion => interaccion.apuntando);
  const { finalizar, finalizando, resumen } = useFinalizarSesion();

  useAtajosConversacion();

  const lista = estado.estado === 'lista' && canvasListo && !cargandoModelos;
  // HU-23: hasta que el estudiante confirme las instrucciones, la escena se ve pero no se usa.
  const comenzada = sesion.comenzada;
  const conversando = estaConversando(estadoNpc);
  const explorando = estadoNpc === 'inactivo';
  const nombrePaciente = sesion.npc.nombre;
  const personaje = estado.estado === 'lista' ? estado.escena.npc.personaje : undefined;
  const motorAudio = useSonidoSimulacion({
    comenzada,
    voz: personaje ? buscarModeloNpc(personaje).voz : VOZ_POR_DEFECTO,
  });

  return (
    <>
      {estado.estado === 'lista' && (
        <EscenaSimulacion
          escena={estado.escena}
          onListo={() => setCanvasListo(true)}
          onBloqueoCambia={setBloqueado}
        />
      )}

      {/* Ambiente dinámico: el velo de la pantalla sigue el clima emocional del paciente. */}
      {lista && <VeloEmocional />}

      {/* Capa de interfaz: no bloquea los eventos del canvas salvo en sus propios elementos. */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <HudSesion sesion={sesion} duracionFinalSegundos={resumen?.duracionSegundos} />
          <div className="flex items-start gap-2">
            {depuracion && <IndicadorFps />}
            <BotonSonido motor={motorAudio} />
            {lista && comenzada && !resumen && (
              <BotonFinalizar
                onFinalizar={finalizar}
                finalizando={finalizando}
                // Nunca con una respuesta de la IA en camino (evita cierres a medias).
                deshabilitado={estadoNpc === 'procesando'}
              />
            )}
            {/* Sin menú en la simulación: salida discreta al panel. La sesión sigue en curso y
                se retoma desde "Mis prácticas". */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="pointer-events-auto bg-card/90 backdrop-blur"
            >
              <Link href="/practicas">
                <ArrowLeft aria-hidden />
                Salir al panel
              </Link>
            </Button>
          </div>
        </div>

        {lista && comenzada && explorando && !bloqueado && (
          <InvitacionExplorar nombrePaciente={nombrePaciente} cerca={cerca} />
        )}
        {lista && comenzada && explorando && bloqueado && (
          <>
            <Mira resaltada={cerca && apuntando} />
            {cerca && <PistaConversar nombrePaciente={nombrePaciente} apuntando={apuntando} />}
          </>
        )}
      </div>

      {lista && conversando && (
        <ConversationPanel onFinalizar={finalizar} finalizando={finalizando} />
      )}
      {lista && !comenzada && <InstruccionesCaso sesion={sesion} />}
      {resumen && <SesionFinalizada resumen={resumen} sesion={sesion} />}

      {estado.estado === 'error' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background p-6">
          <div role="alert" className="flex max-w-sm flex-col items-center gap-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" aria-hidden />
            </span>
            <h2 className="text-xl font-semibold">{estado.mensaje}</h2>
            <p className="text-sm text-muted-foreground">
              Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, vuelve a tus
              prácticas y avísale a tu docente.
            </p>
            <div className="flex gap-2">
              <Button onClick={reintentar}>
                <RotateCw aria-hidden />
                Reintentar
              </Button>
              <Button variant="outline" asChild>
                <Link href="/practicas">Volver a mis prácticas</Link>
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

/**
 * Tarjeta que invita a capturar el ratón para explorar (Pointer Lock requiere un clic). Si el
 * estudiante ya está cerca del paciente, ofrece además conversar con él (camino accesible sin
 * ratón: también funciona con la tecla E).
 */
function InvitacionExplorar({ nombrePaciente, cerca }: { nombrePaciente: string; cerca: boolean }) {
  const store = useAppStoreApi();
  const nombreCorto = nombrePaciente.split(' ')[0];

  return (
    <div className="mt-auto flex justify-center pb-6">
      <div className="pointer-events-auto flex max-w-md animate-in flex-col items-center gap-4 rounded-2xl border bg-card/95 p-6 text-center shadow-xl backdrop-blur fade-in-0 slide-in-from-bottom-4">
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Compass className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Explora el consultorio</h2>
          <p className="text-sm text-muted-foreground">
            {cerca
              ? `Estás frente a ${nombreCorto}. Cuando quieras, inicia la conversación.`
              : `Acércate a ${nombreCorto} y ubícate frente a su silla para iniciar la conversación.`}
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
            <Tecla>E</Tecla>
            <span>para conversar</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Tecla>Esc</Tecla>
            <span>para liberar el ratón</span>
          </li>
        </ul>
        <div className="flex flex-wrap justify-center gap-2">
          <Button id={ID_BOTON_EXPLORAR} size="lg" variant={cerca ? 'outline' : 'default'}>
            Comenzar a explorar
          </Button>
          {cerca && (
            <Button size="lg" onClick={() => iniciarConversacion(store)}>
              <MessageCircle aria-hidden />
              Conversar con {nombreCorto}
            </Button>
          )}
        </div>
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

/** Punto central mientras el ratón está capturado; crece cuando apunta al paciente. */
function Mira({ resaltada }: { resaltada: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'absolute top-1/2 left-1/2 -translate-1/2 rounded-full transition-all duration-200',
        resaltada
          ? 'size-4 border-2 border-white bg-primary/60 shadow-[0_0_0_1.5px_rgba(0,0,0,0.35)]'
          : 'size-1.5 bg-white/90 shadow-[0_0_0_1.5px_rgba(0,0,0,0.35)]'
      )}
    />
  );
}

/** Indicación bajo la mira cuando el estudiante puede iniciar la conversación. */
function PistaConversar({
  nombrePaciente,
  apuntando,
}: {
  nombrePaciente: string;
  apuntando: boolean;
}) {
  const nombreCorto = nombrePaciente.split(' ')[0];
  return (
    <p
      role="status"
      className="absolute top-[calc(50%+1.75rem)] left-1/2 -translate-x-1/2 animate-in rounded-full bg-black/60 px-3 py-1.5 text-sm whitespace-nowrap text-white fade-in-0"
    >
      {apuntando ? 'Haz clic o presiona ' : 'Presiona '}
      <kbd className="rounded bg-white/20 px-1.5 font-mono text-xs">E</kbd> para hablar con{' '}
      {nombreCorto}
    </p>
  );
}
