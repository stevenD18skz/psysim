'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface OpcionSelector {
  valor: string;
  etiqueta: string;
  descripcion?: string;
}

export interface GrupoSelector {
  etiqueta: string;
  opciones: readonly OpcionSelector[];
}

export interface SelectorProps {
  id?: string;
  valor: string;
  onChange: (valor: string) => void;
  opciones?: readonly OpcionSelector[];
  grupos?: readonly GrupoSelector[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  tamano?: 'sm' | 'md';
  variante?: 'claro' | 'oscuro';
  className?: string;
  claseMenu?: string;
}

/**
 * Desplegable personalizado del sistema «Nogal y salvia»: reemplaza los `<select>` nativos por un
 * menú en portal con flecha animada (300 ms `ease-salida`), soporte de grupos, navegación completa
 * por teclado (flechas, Inicio/Fin, Escape y búsqueda rápida al escribir) y foco sólido WCAG AA.
 */
export function Selector({
  id,
  valor,
  onChange,
  opciones,
  grupos,
  placeholder = 'Seleccionar…',
  ariaLabel,
  disabled = false,
  tamano = 'md',
  variante = 'claro',
  className,
  claseMenu,
}: SelectorProps) {
  const idLista = useId();
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const botonRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const bufferTeclas = useRef<{ texto: string; marca: number }>({ texto: '', marca: 0 });

  const todasLasOpciones = useMemo(() => {
    const planas: OpcionSelector[] = [];
    if (opciones) planas.push(...opciones);
    if (grupos) {
      for (const grupo of grupos) {
        planas.push(...grupo.opciones);
      }
    }
    return planas;
  }, [opciones, grupos]);

  const indiceSeleccionado = todasLasOpciones.findIndex(o => o.valor === valor);
  const opcionActual = indiceSeleccionado >= 0 ? todasLasOpciones[indiceSeleccionado] : null;

  const abrirMenu = (indiceInicial?: number) => {
    if (disabled) return;
    const destino =
      indiceInicial !== undefined
        ? indiceInicial
        : indiceSeleccionado >= 0
          ? indiceSeleccionado
          : 0;
    setIndiceActivo(todasLasOpciones.length > 0 ? destino : -1);
    setAbierto(true);
  };

  const elegir = (opcion: OpcionSelector) => {
    if (opcion.valor !== valor) {
      onChange(opcion.valor);
    }
    setAbierto(false);
    botonRef.current?.focus();
  };

  useEffect(() => {
    if (!abierto || indiceActivo < 0) return;
    const nodo = listaRef.current?.querySelector<HTMLElement>(
      `[data-indice-opcion="${indiceActivo}"]`
    );
    nodo?.scrollIntoView({ block: 'nearest' });
  }, [abierto, indiceActivo]);

  const manejarTecladoLista = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    const total = todasLasOpciones.length;
    if (total === 0) return;

    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndiceActivo(prev => (prev + 1) % total);
      return;
    }
    if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndiceActivo(prev => (prev <= 0 ? total - 1 : prev - 1));
      return;
    }
    if (evento.key === 'Home') {
      evento.preventDefault();
      setIndiceActivo(0);
      return;
    }
    if (evento.key === 'End') {
      evento.preventDefault();
      setIndiceActivo(total - 1);
      return;
    }
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      const elegida = todasLasOpciones[indiceActivo];
      if (elegida) elegir(elegida);
      return;
    }
    if (evento.key === 'Tab') {
      setAbierto(false);
      return;
    }

    if (evento.key.length === 1 && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
      const ahora = evento.timeStamp;
      const previo = ahora - bufferTeclas.current.marca < 600 ? bufferTeclas.current.texto : '';
      const buscado = (previo + evento.key).toLocaleLowerCase('es');
      bufferTeclas.current = { texto: buscado, marca: ahora };
      const coincidencia = todasLasOpciones.findIndex(o =>
        o.etiqueta.toLocaleLowerCase('es').startsWith(buscado)
      );
      if (coincidencia >= 0) {
        setIndiceActivo(coincidencia);
      }
    }
  };

  const indicePorValor = new Map<string, number>();
  todasLasOpciones.forEach((op, idx) => indicePorValor.set(`${op.valor}::${idx}`, idx));

  let cursorRender = 0;
  const renderOpcion = (opcion: OpcionSelector) => {
    const indice = cursorRender++;
    const seleccionada = opcion.valor === valor;
    const activa = indice === indiceActivo;

    return (
      <button
        key={`${opcion.valor}-${indice}`}
        type="button"
        role="option"
        aria-selected={seleccionada}
        data-indice-opcion={indice}
        onMouseEnter={() => setIndiceActivo(indice)}
        onClick={() => elegir(opcion)}
        className={cn(
          'flex min-h-9 w-full cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm outline-hidden transition-colors',
          seleccionada
            ? 'bg-salvia-suave/70 font-semibold text-salvia-oscuro'
            : activa
              ? 'bg-muted/80 text-foreground'
              : 'text-foreground hover:bg-muted/70'
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{opcion.etiqueta}</span>
          {opcion.descripcion && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {opcion.descripcion}
            </span>
          )}
        </span>
        {seleccionada && <Check className="size-4 shrink-0 text-salvia-oscuro" aria-hidden />}
      </button>
    );
  };

  return (
    <Popover
      open={abierto}
      onOpenChange={siguiente => {
        if (siguiente) {
          abrirMenu();
        } else {
          setAbierto(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={botonRef}
          id={id}
          type="button"
          role="combobox"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-expanded={abierto}
          aria-haspopup="listbox"
          aria-controls={idLista}
          onKeyDown={evento => {
            if (evento.key === 'ArrowDown') {
              evento.preventDefault();
              abrirMenu(
                indiceSeleccionado >= 0
                  ? Math.min(todasLasOpciones.length - 1, indiceSeleccionado + 1)
                  : 0
              );
            } else if (evento.key === 'ArrowUp') {
              evento.preventDefault();
              abrirMenu(
                indiceSeleccionado >= 0
                  ? Math.max(0, indiceSeleccionado - 1)
                  : todasLasOpciones.length - 1
              );
            }
          }}
          className={cn(
            'group inline-flex w-full cursor-pointer items-center justify-between gap-2 text-left outline-hidden transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-50',
            tamano === 'sm' ? 'h-9 px-3 text-sm' : 'h-10 px-3.5 text-sm',
            variante === 'oscuro'
              ? 'rounded-lg border border-white/20 bg-black/65 font-mono text-xs text-white hover:border-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-claro focus-visible:outline-solid'
              : 'rounded-[10px] border border-input bg-card font-medium text-foreground shadow-[0_1px_2px_rgb(58_36_24/0.06)] hover:border-nogal/45 focus-visible:border-ring focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid data-[state=open]:border-ring',
            className
          )}
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              !opcionActual && variante === 'claro' && 'font-normal text-muted-foreground'
            )}
          >
            {opcionActual ? opcionActual.etiqueta : placeholder}
          </span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 transition-transform duration-300 ease-salida group-data-[state=open]:rotate-180 motion-reduce:transition-none',
              variante === 'oscuro' ? 'text-white/75' : 'text-muted-foreground'
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onOpenAutoFocus={evento => {
          evento.preventDefault();
          listaRef.current?.focus();
        }}
        className={cn(
          'w-auto max-w-[min(24rem,calc(100vw-1.5rem))] min-w-(--radix-popover-trigger-width) rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_16px_36px_-14px_rgb(58_36_24/0.28)] ring-0',
          claseMenu
        )}
      >
        <div
          ref={listaRef}
          id={idLista}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          onKeyDown={manejarTecladoLista}
          className="flex max-h-72 flex-col gap-0.5 overflow-y-auto outline-hidden"
        >
          {opciones?.map(renderOpcion)}
          {grupos?.map((grupo, idxGrupo) => (
            <div
              key={grupo.etiqueta}
              role="group"
              aria-label={grupo.etiqueta}
              className={cn(
                'flex flex-col gap-0.5',
                (idxGrupo > 0 || (opciones && opciones.length > 0)) && 'mt-1 border-t pt-1.5'
              )}
            >
              <span className="px-2.5 py-1 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase ancho-condensado">
                {grupo.etiqueta}
              </span>
              {grupo.opciones.map(renderOpcion)}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
