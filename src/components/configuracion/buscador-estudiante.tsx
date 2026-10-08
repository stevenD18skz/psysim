'use client';

import { Search, UserRound } from 'lucide-react';
import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import { contarSesiones, filtrarEstudiantes } from '@/lib/estudiantes/estudiantes';
import { cn } from '@/lib/utils';
import { type EstudianteRegistrado } from '@/types';

interface BuscadorEstudianteProps {
  estudiantes: readonly EstudianteRegistrado[];
  onSeleccionar: (estudiante: EstudianteRegistrado) => void;
  deshabilitado?: boolean;
  etiqueta?: string;
  /** Texto cuando ningún estudiante coincide con lo escrito. */
  mensajeVacio?: string;
}

/**
 * Busca entre los estudiantes registrados por código o nombre (patrón combobox de ARIA:
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
  const [termino, setTermino] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);

  const resultados = filtrarEstudiantes(estudiantes, termino);
  const visible = abierto && !deshabilitado;
  const indice = Math.min(activo, Math.max(resultados.length - 1, 0));

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
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={id}
          role="combobox"
          aria-expanded={visible}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={
            visible && resultados[indice] ? `${idLista}-${resultados[indice].id}` : undefined
          }
          autoComplete="off"
          placeholder="Busca por código o nombre"
          className="pl-9"
          value={termino}
          disabled={deshabilitado}
          onChange={evento => {
            setTermino(evento.target.value);
            setActivo(0);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setAbierto(false)}
          onKeyDown={alPulsar}
        />
      </div>

      {visible && (
        <ul
          id={idLista}
          role="listbox"
          aria-label="Estudiantes registrados"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in-0"
        >
          {resultados.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">{mensajeVacio}</li>
          ) : (
            resultados.map((estudiante, i) => (
              <li
                key={estudiante.id}
                id={`${idLista}-${estudiante.id}`}
                role="option"
                aria-selected={i === indice}
                // `mousedown` (no `click`): se elige antes de que el campo pierda el foco.
                onMouseDown={evento => {
                  evento.preventDefault();
                  elegir(estudiante);
                }}
                onMouseEnter={() => setActivo(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm',
                  i === indice && 'bg-accent text-accent-foreground'
                )}
              >
                <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{estudiante.nombre}</span>
                <span className="font-mono text-xs text-muted-foreground">{estudiante.codigo}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  · {contarSesiones(estudiante.metricas.sesiones)}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
