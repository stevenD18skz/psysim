'use client';

import { Bookmark, ChevronDown, FolderOpen, Loader2, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { eliminarConfiguracion } from '@/lib/escenarios/actions';
import { formatearFecha } from '@/lib/escenarios/etiquetas';
import { cn } from '@/lib/utils';
import { type ConfiguracionGuardada, type EscenarioCatalogo } from '@/types';

interface ConfiguracionesGuardadasProps {
  configuraciones: ConfiguracionGuardada[];
  escenarios: EscenarioCatalogo[];
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  /** Id de la configuración cargada actualmente en el formulario, si hay alguna. */
  cargadaId: string | null;
  onCargar: (configuracion: ConfiguracionGuardada) => void;
  onEliminada: (id: string) => void;
}

/** HU-07 · T03/T04 — Sección colapsable "Mis configuraciones guardadas". */
export function ConfiguracionesGuardadas({
  configuraciones,
  escenarios,
  abierto,
  onAbiertoChange,
  cargadaId,
  onCargar,
  onEliminada,
}: ConfiguracionesGuardadasProps) {
  const tituloEscenario = (id: string) => {
    const escenario = escenarios.find(e => e.id === id);
    return escenario ? `${escenario.codigo} · ${escenario.titulo}` : 'Escenario no disponible';
  };

  return (
    <Collapsible
      open={abierto}
      onOpenChange={onAbiertoChange}
      className="rounded-2xl border bg-card shadow-xs"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Bookmark className="size-4" aria-hidden />
          </span>
          <span className="flex flex-col">
            <span className="font-medium">Mis configuraciones guardadas</span>
            <span className="text-sm text-muted-foreground">
              {configuraciones.length === 0
                ? 'Aún no tienes configuraciones'
                : `${configuraciones.length} ${configuraciones.length === 1 ? 'configuración' : 'configuraciones'}`}
            </span>
          </span>
          <ChevronDown
            className={cn(
              'ml-auto size-4 text-muted-foreground transition-transform',
              abierto && 'rotate-180'
            )}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t px-5 py-4">
          {configuraciones.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderOpen className="size-4 shrink-0" aria-hidden />
              Cuando prepares un escenario, usa «Guardar configuración» para reutilizarlo en futuras
              sesiones.
            </p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Configuraciones guardadas">
              {configuraciones.map(configuracion => (
                <ItemConfiguracion
                  key={configuracion.id}
                  configuracion={configuracion}
                  tituloEscenario={tituloEscenario(configuracion.escenarioId)}
                  disponible={escenarios.some(e => e.id === configuracion.escenarioId)}
                  cargada={configuracion.id === cargadaId}
                  onCargar={onCargar}
                  onEliminada={onEliminada}
                />
              ))}
            </ul>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ItemConfiguracionProps {
  configuracion: ConfiguracionGuardada;
  tituloEscenario: string;
  disponible: boolean;
  cargada: boolean;
  onCargar: (configuracion: ConfiguracionGuardada) => void;
  onEliminada: (id: string) => void;
}

function ItemConfiguracion({
  configuracion,
  tituloEscenario,
  disponible,
  cargada,
  onCargar,
  onEliminada,
}: ItemConfiguracionProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, startTransition] = useTransition();

  const eliminar = () => {
    startTransition(async () => {
      const resultado = await eliminarConfiguracion({ id: configuracion.id });
      if (resultado.ok) {
        onEliminada(configuracion.id);
        toast.success(`Se eliminó «${configuracion.nombre}».`);
      } else {
        setConfirmando(false);
        toast.error(resultado.error);
      }
    });
  };

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
        cargada ? 'border-primary/50 bg-accent/40' : 'bg-background'
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{configuracion.nombre}</span>
        <span className="truncate text-sm text-muted-foreground">
          {tituloEscenario} ·{' '}
          <time dateTime={configuracion.creadoEn}>{formatearFecha(configuracion.creadoEn)}</time>
        </span>
      </div>

      {confirmando ? (
        <div className="flex items-center gap-2" role="group" aria-label="Confirmar eliminación">
          <span className="text-sm text-muted-foreground">¿Eliminar?</span>
          <Button size="sm" variant="destructive" onClick={eliminar} disabled={eliminando}>
            {eliminando && <Loader2 className="animate-spin" aria-hidden />}
            Sí, eliminar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmando(false)}
            disabled={eliminando}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={cargada ? 'secondary' : 'outline'}
            onClick={() => onCargar(configuracion)}
            disabled={!disponible}
            aria-label={`Cargar la configuración ${configuracion.nombre}`}
          >
            {cargada ? 'Cargada' : 'Cargar'}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setConfirmando(true)}
            aria-label={`Eliminar la configuración ${configuracion.nombre}`}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      )}
    </li>
  );
}
