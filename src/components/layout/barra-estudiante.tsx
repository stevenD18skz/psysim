'use client';

import { ChevronDown, Globe, Loader2, LogOut, MonitorPlay } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { useCerrarSesion } from '@/components/layout/use-cerrar-sesion';
import { useCerrarSesionCompartida } from '@/components/layout/use-cerrar-sesion-compartida';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEquipoCompartido } from '@/hooks/use-equipo-compartido';
import { iniciales } from '@/lib/nombres';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store-provider';

/**
 * Barra superior del estudiante. Su panel tiene un solo destino (Mis prácticas), así que no lleva
 * menú lateral: la marca, el enlace a sus prácticas, la práctica en curso si la hay y su cuenta.
 * En el computador del docente (modo presencial), cerrar sesión queda a la vista y cierra también
 * la marca de equipo compartido.
 */
export function BarraEstudiante({ sesionEnCurso }: { sesionEnCurso: string | null }) {
  const pathname = usePathname();
  const perfil = useAppStore(state => state.auth.perfil);
  const compartido = useEquipoCompartido();
  const sesionPropia = useCerrarSesion();
  const sesionCompartida = useCerrarSesionCompartida();
  const { salir, cerrando } = compartido ? sesionCompartida : sesionPropia;
  const enPracticas = pathname === '/practicas' || pathname.startsWith('/practicas/');

  return (
    <header className="sticky top-0 z-30 vetas-nogal text-sidebar-foreground print:hidden">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/practicas"
          className="flex items-center rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-laton"
        >
          <MarcaPsySim className="h-7" />
        </Link>

        <nav aria-label="Navegación principal" className="flex items-center gap-1">
          <Link
            href="/practicas"
            aria-current={enPracticas ? 'page' : undefined}
            className={cn(
              'hidden rounded-md px-3 py-2 text-sm font-medium outline-hidden hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-laton sm:block',
              enPracticas ? 'text-sidebar-accent-foreground' : 'text-sidebar-muted'
            )}
          >
            Mis prácticas
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {compartido && (
            <button
              type="button"
              onClick={salir}
              disabled={cerrando}
              className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-sidebar-muted/40 px-3 text-sm font-medium whitespace-nowrap text-sidebar-foreground outline-hidden hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-laton disabled:opacity-60"
            >
              {cerrando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <LogOut className="size-4" aria-hidden />
              )}
              <span>
                <span className="hidden sm:inline">Equipo compartido · </span>Cerrar sesión
              </span>
            </button>
          )}
          {sesionEnCurso && (
            <Link
              href={`/simulacion?sesion=${sesionEnCurso}`}
              className="flex h-9 items-center gap-2 rounded-lg bg-laton px-3 text-sm font-semibold text-[#1f1b17] outline-hidden hover:bg-laton-claro focus-visible:ring-2 focus-visible:ring-lino focus-visible:ring-offset-2 focus-visible:ring-offset-nogal"
            >
              <MonitorPlay className="size-4" aria-hidden />
              <span>
                Continuar <span className="hidden sm:inline">práctica</span>
              </span>
            </Link>
          )}

          {perfil && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Cuenta de ${perfil.nombre}`}
                className="flex h-10 items-center gap-2 rounded-lg px-1.5 outline-hidden hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-laton data-[state=open]:bg-sidebar-accent"
              >
                <span
                  aria-hidden
                  className="flex size-8 items-center justify-center rounded-full bg-salvia-suave text-xs font-semibold text-salvia-oscuro"
                >
                  {iniciales(perfil.nombre)}
                </span>
                <ChevronDown className="size-4 text-sidebar-muted" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-64">
                <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
                  <span className="truncate font-medium text-foreground">{perfil.nombre}</span>
                  <span className="truncate text-xs text-muted-foreground">{perfil.correo}</span>
                  <span className="text-xs text-muted-foreground">
                    Estudiante · Código {perfil.codigoInstitucional}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <Globe aria-hidden />
                    Ir a la página pública
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={cerrando}
                  onSelect={evento => {
                    evento.preventDefault();
                    salir();
                  }}
                >
                  {cerrando ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <LogOut aria-hidden />
                  )}
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
