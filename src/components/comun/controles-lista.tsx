'use client';

import { Loader2, Search, X } from 'lucide-react';
import { type Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { Input } from '@/components/ui/input';
import { conParametros } from '@/lib/listas';
import { cn } from '@/lib/utils';

/*
 * Controles de las listas largas: búsqueda y selectores que guardan su estado en la URL. Cambiar
 * cualquiera vuelve a la primera página. La navegación usa `replace` (no llena el historial con
 * cada tecla) y no desplaza la página.
 */

function useNavegarConParametros() {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const [pendiente, startTransition] = useTransition();

  const navegar = (cambios: Record<string, string | null>, defectos: Record<string, string>) => {
    const actuales = Object.fromEntries(parametros.entries());
    startTransition(() => {
      router.replace(conParametros(ruta, actuales, cambios, defectos) as Route, { scroll: false });
    });
  };

  return { navegar, pendiente, parametros };
}

interface BusquedaListaProps {
  etiqueta: string;
  placeholder: string;
  parametro?: string;
  className?: string;
}

/** Campo de búsqueda: filtra mientras se escribe (con una pequeña espera entre teclas). */
export function BusquedaLista({
  etiqueta,
  placeholder,
  parametro = 'q',
  className,
}: BusquedaListaProps) {
  const id = useId();
  const { navegar, pendiente, parametros } = useNavegarConParametros();
  const enUrl = parametros.get(parametro) ?? '';
  const [valor, setValor] = useState(enUrl);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ultimoEnviado = useRef(enUrl);

  // Si la URL cambia por otro medio (atrás, un enlace), el campo la sigue.
  useEffect(() => {
    if (enUrl !== ultimoEnviado.current) {
      ultimoEnviado.current = enUrl;
      setValor(enUrl);
    }
  }, [enUrl]);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const cambiar = (nuevo: string) => {
    setValor(nuevo);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      ultimoEnviado.current = nuevo.trim();
      navegar({ [parametro]: nuevo.trim() || null }, {});
    }, 300);
  };

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      {pendiente ? (
        <Loader2
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : (
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      )}
      <Input
        id={id}
        type="search"
        autoComplete="off"
        placeholder={placeholder}
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        value={valor}
        onChange={evento => cambiar(evento.target.value)}
        onKeyDown={evento => {
          if (evento.key === 'Escape' && valor) {
            evento.preventDefault();
            cambiar('');
          }
        }}
      />
      {valor && (
        <button
          type="button"
          onClick={() => cambiar('')}
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          aria-label="Borrar la búsqueda"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

interface SelectorListaProps {
  etiqueta: string;
  parametro: string;
  opciones: readonly { valor: string; etiqueta: string }[];
  defecto: string;
  className?: string;
}

/** Selector nativo con su etiqueta visible (accesible y familiar en cualquier dispositivo). */
export function SelectorLista({
  etiqueta,
  parametro,
  opciones,
  defecto,
  className,
}: SelectorListaProps) {
  const id = useId();
  const { navegar, parametros } = useNavegarConParametros();
  const valor = parametros.get(parametro) ?? defecto;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {etiqueta}
      </label>
      <select
        id={id}
        value={opciones.some(o => o.valor === valor) ? valor : defecto}
        onChange={evento => navegar({ [parametro]: evento.target.value }, { [parametro]: defecto })}
        className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-hidden transition-colors hover:border-ring/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {opciones.map(opcion => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Enlace «Quitar filtros» cuando hay alguno activo. */
export function QuitarFiltros({ claves }: { claves: readonly string[] }) {
  const { navegar, parametros } = useNavegarConParametros();
  const activos = claves.some(clave => parametros.get(clave));
  if (!activos) return null;
  return (
    <button
      type="button"
      onClick={() => navegar(Object.fromEntries(claves.map(clave => [clave, null])), {})}
      className="h-10 rounded-md px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
    >
      Quitar filtros
    </button>
  );
}
