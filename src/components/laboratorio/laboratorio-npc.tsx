'use client';

import { AlertTriangle, ArrowLeft, Loader2, RotateCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Component, type ReactNode, Suspense, useId, useRef, useState } from 'react';

import { type NpcApi } from '@/components/npc/npc-visor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ACCIONES_NPC, type AccionNpc, metaAccion } from '@/lib/npc/acciones';
import { cargarGlb } from '@/lib/npc/cargar-glb';
import { buscarModeloNpc, CATALOGO_NPC, type ModeloNpc, urlModeloNpc } from '@/lib/npc/catalogo';
import { cn } from '@/lib/utils';

// Three.js necesita el DOM: el visor no se renderiza en el servidor y va en un chunk aparte.
const NpcVisor = dynamic(() => import('@/components/npc/npc-visor'), { ssr: false });

function Cargando({ nombre }: { nombre: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Cargando a {nombre}…
    </div>
  );
}

interface LimiteErrorProps {
  nombre: string;
  children: ReactNode;
}

/** Si el GLB no carga, muestra un aviso con la opción de reintentar en lugar de romper la página. */
class LimiteErrorNpc extends Component<LimiteErrorProps, { fallo: boolean }> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[laboratorio] No se pudo cargar el NPC "${this.props.nombre}":`, error);
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <div
        role="alert"
        className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <AlertTriangle className="size-6 text-destructive" aria-hidden />
        <p className="font-medium">No fue posible cargar a {this.props.nombre}.</p>
        <Button variant="outline" onClick={() => this.setState({ fallo: false })}>
          <RotateCw aria-hidden />
          Reintentar
        </Button>
      </div>
    );
  }
}

/** Selector de NPC: una tarjeta por personaje del catálogo (grupo de opciones único). */
function SelectorNpc({
  seleccionado,
  onSeleccionar,
}: {
  seleccionado: ModeloNpc;
  onSeleccionar: (modelo: ModeloNpc) => void;
}) {
  return (
    <div role="radiogroup" aria-label="NPC" className="flex flex-wrap gap-2">
      {CATALOGO_NPC.map(modelo => {
        const activo = modelo.id === seleccionado.id;
        return (
          <button
            key={modelo.id}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onSeleccionar(modelo)}
            // Empieza a descargar el GLB al pasar el cursor: el cambio se siente inmediato.
            onPointerEnter={() => void cargarGlb(urlModeloNpc(modelo)).catch(() => {})}
            onFocus={() => void cargarGlb(urlModeloNpc(modelo)).catch(() => {})}
            className={cn(
              'flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              activo
                ? 'border-primary bg-accent font-medium text-accent-foreground'
                : 'bg-background hover:bg-muted'
            )}
          >
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full font-heading text-xs font-semibold text-white"
              style={{ backgroundColor: modelo.color }}
            >
              {modelo.nombre[0]}
            </span>
            {modelo.nombre}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Laboratorio de NPC: elige un personaje del catálogo (GLB con esqueleto y 13 animaciones) y
 * pruébalo con su panel o con la API pública (`play`, `say`, `setSpeed`, `onActionEnd`), tal como
 * lo haría la simulación.
 */
export function LaboratorioNpc() {
  const router = useRouter();
  const pathname = usePathname();
  const modelo = buscarModeloNpc(useSearchParams().get('npc'));

  const api = useRef<NpcApi>(null);
  const [accion, setAccion] = useState<AccionNpc>('wave');
  const [frase, setFrase] = useState('Buenas tardes, ¿cómo te puedo ayudar?');
  const [registro, setRegistro] = useState<string[]>([]);
  const idAccion = useId();
  const idFrase = useId();

  const seleccionar = (siguiente: ModeloNpc) => {
    if (siguiente.id === modelo.id) return;
    setRegistro([]);
    router.replace(`${pathname}?npc=${siguiente.id}`, { scroll: false });
  };

  const alTerminar = (terminada: AccionNpc) =>
    setRegistro(r => [`${metaAccion(terminada).etiqueta} terminó`, ...r].slice(0, 3));

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-dvh">
      <div className="flex flex-col gap-2 border-b bg-card px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/laboratorio">
              <ArrowLeft aria-hidden />
              Laboratorio
            </Link>
          </Button>
          <SelectorNpc seleccionado={modelo} onSeleccionar={seleccionar} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-medium text-muted-foreground">API:</span>
          <div className="flex items-center gap-1.5">
            <label htmlFor={idAccion} className="sr-only">
              Acción
            </label>
            <select
              id={idAccion}
              value={accion}
              onChange={e => setAccion(e.target.value as AccionNpc)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {ACCIONES_NPC.map(id => (
                <option key={id} value={id}>
                  {metaAccion(id).etiqueta}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => api.current?.play(accion)}>
              play()
            </Button>
          </div>

          <form
            className="flex items-center gap-1.5"
            onSubmit={e => {
              e.preventDefault();
              api.current?.say(frase);
            }}
          >
            <label htmlFor={idFrase} className="sr-only">
              Frase
            </label>
            <Input
              id={idFrase}
              value={frase}
              onChange={e => setFrase(e.target.value)}
              className="h-8 w-64"
              maxLength={80}
            />
            <Button size="sm" variant="outline" type="submit">
              say()
            </Button>
          </form>

          <div className="flex items-center gap-1.5">
            {[0.5, 1, 1.5].map(v => (
              <Button key={v} size="sm" variant="outline" onClick={() => api.current?.setSpeed(v)}>
                setSpeed({v})
              </Button>
            ))}
          </div>

          <p className="ml-auto text-xs text-muted-foreground" aria-live="polite">
            onActionEnd: {registro.length ? registro.join(' · ') : '—'}
          </p>
        </div>
      </div>

      {/* `key`: cada NPC monta su propio visor y controlador (el anterior se libera). */}
      <LimiteErrorNpc key={modelo.id} nombre={modelo.nombre}>
        <Suspense fallback={<Cargando nombre={modelo.nombre} />}>
          <NpcVisor
            modelo={modelo}
            apiRef={api}
            onActionEnd={alTerminar}
            className="min-h-0 flex-1"
          />
        </Suspense>
      </LimiteErrorNpc>
    </div>
  );
}
