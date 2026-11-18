'use client';

import { ChevronsUpDown, CornerDownLeft, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { contarPracticas, filtrarEstudiantes } from '@/lib/estudiantes/estudiantes';
import { iniciales } from '@/lib/nombres';
import { cn } from '@/lib/utils';
import { type EstudianteRegistrado } from '@/types';

const LIMITE_RESULTADOS = 40;

interface BuscadorEstudianteProps {
  estudiantes: readonly EstudianteRegistrado[];
  onSeleccionar: (estudiante: EstudianteRegistrado) => void;
  deshabilitado?: boolean;
  etiqueta?: string;
  /** Texto cuando ningún estudiante coincide con lo escrito. */
  mensajeVacio?: string;
}

/**
 * Selector buscable de estudiantes registrados por código o nombre (patrón combobox de ARIA:
 * flechas para recorrer, Enter para elegir, Escape para cerrar).
 */
export function BuscadorEstudiante({
  estudiantes,
  onSeleccionar,
  deshabilitado = false,
  etiqueta = 'Busca al estudiante',
  mensajeVacio = 'Ningún estudiante registrado coincide.',
}: BuscadorEstudianteProps) {
  const id = useId();
  const idLista = `${id}-lista`;
  const inputRef = useRef<HTMLInputElement>(null);
  const refsOpciones = useRef<Map<string, HTMLLIElement>>(new Map());
  const [termino, setTermino] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);

  const resultados = filtrarEstudiantes(estudiantes, termino, LIMITE_RESULTADOS);
  const visible = abierto && deshabilitado === false;
  const indice = Math.min(activo, Math.max(resultados.length - 1, 0));
  const opcionActivaId = resultados[indice]?.id;

  useEffect(() => {
    if (!visible || !opcionActivaId) return;
    refsOpciones.current.get(opcionActivaId)?.scrollIntoView?.({ block: 'nearest' });
  }, [opcionActivaId, visible]);

  const elegir = (estudiante: EstudianteRegistrado) => {
    onSeleccionar(estudiante);
    setTermino('');
    setAbierto(false);
  };

  const alPulsar = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      setAbierto(true);
      if (!resultados.length) return;
      const paso = evento.key === 'ArrowDown' ? 1 : -1;
      setActivo((indice + paso + resultados.length) % resultados.length);
    } else if (evento.key === 'Enter' && visible && resultados[indice]) {
      // Elige en lugar de enviar el formulario.
      evento.preventDefault();
      elegir(resultados[indice]);
    } else if (evento.key === 'Escape' && visible) {
      evento.preventDefault();
      setAbierto(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          {etiqueta}
        </label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {estudiantes.length} {estudiantes.length === 1 ? 'disponible' : 'disponibles'}
        </span>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={visible}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={
            visible && opcionActivaId ? `${idLista}-${opcionActivaId}` : undefined
          }
          autoComplete="off"
          placeholder="Busca por código o nombre…"
          className={cn('h-11 pl-9', termino.length > 0 ? 'pr-16' : 'pr-9')}
          value={termino}
          disabled={deshabilitado}
          onChange={evento => {
            setTermino(evento.target.value);
            setActivo(0);
            setAbierto(true);
          }}
          onClick={() => setAbierto(true)}
          onFocus={() => setAbierto(true)}
          onBlur={() => setAbierto(false)}
          onKeyDown={alPulsar}
        />
        <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1">
          {termino.length > 0 && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onMouseDown={evento => {
                evento.preventDefault();
                setTermino('');
                setActivo(0);
                setAbierto(true);
                inputRef.current?.focus();
              }}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
          <ChevronsUpDown
            className="pointer-events-none size-4 text-muted-foreground"
            aria-hidden
          />
        </div>
      </div>

      {visible && (
        <div className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-[0_18px_40px_-16px_rgb(58_36_24/0.35)] motion-safe:animate-in motion-safe:duration-200 motion-safe:ease-salida motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:zoom-in-98">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/35 px-3.5 py-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {termino.trim()
                ? `${resultados.length} ${resultados.length === 1 ? 'coincidencia' : 'coincidencias'}`
                : resultados.length < estudiantes.length
                  ? `Mostrando ${resultados.length} de ${estudiantes.length} · escribe para buscar`
                  : `${estudiantes.length} ${estudiantes.length === 1 ? 'estudiante con cuenta' : 'estudiantes con cuenta'}`}
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              <CornerDownLeft className="size-3" aria-hidden />
              Enter o clic para elegir
            </span>
          </div>
          <ul
            id={idLista}
            role="listbox"
            aria-label="Estudiantes registrados"
            className="max-h-72 divide-y divide-border/40 overflow-y-auto p-1.5"
          >
            {resultados.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                {mensajeVacio}
              </li>
            ) : (
              resultados.map((estudiante, i) => {
                const seleccionado = i === indice;
                return (
                  <li
                    key={estudiante.id}
                    ref={el => {
                      if (el) refsOpciones.current.set(estudiante.id, el);
                      else refsOpciones.current.delete(estudiante.id);
                    }}
                    id={`${idLista}-${estudiante.id}`}
                    role="option"
                    aria-selected={seleccionado}
                    // `mousedown` (no `click`): se elige antes de que el campo pierda el foco.
                    onMouseDown={evento => {
                      evento.preventDefault();
                      elegir(estudiante);
                    }}
                    onMouseEnter={() => setActivo(i)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                      seleccionado ? 'bg-salvia-suave/65 text-foreground' : 'hover:bg-muted/50'
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                        seleccionado
                          ? 'bg-salvia-oscuro text-lino'
                          : 'bg-salvia-suave text-salvia-oscuro'
                      )}
                    >
                      {iniciales(estudiante.nombre)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{estudiante.nombre}</span>
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.75rem] text-muted-foreground tabular-nums">
                          {estudiante.codigo}
                        </span>
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {estudiante.correo} · {contarPracticas(estudiante.metricas.sesiones)}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'hidden shrink-0 rounded-md bg-card px-2 py-0.5 text-xs font-semibold text-salvia-oscuro shadow-2xs transition-opacity sm:inline-flex',
                        seleccionado ? 'opacity-100' : 'opacity-0'
                      )}
                    >
                      Elegir
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
