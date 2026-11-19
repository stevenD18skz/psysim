'use client';

import { ChevronDown, Loader2, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

import { IndicadorEnVivo } from '@/components/comun/indicador-en-vivo';
import { AvatarCuenta } from '@/components/layout/avatar-cuenta';
import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { MenuCuenta } from '@/components/layout/menu-cuenta';
import { useCerrarSesion } from '@/components/layout/use-cerrar-sesion';
import { useCerrarSesionCompartida } from '@/components/layout/use-cerrar-sesion-compartida';
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useEquipoCompartido } from '@/hooks/use-equipo-compartido';
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
  const botonCuenta = useRef<HTMLButtonElement>(null);
  const compartido = useEquipoCompartido();
  const sesionPropia = useCerrarSesion();
  const sesionCompartida = useCerrarSesionCompartida();
  const { salir, cerrando } = compartido ? sesionCompartida : sesionPropia;
  const enPracticas = pathname === '/practicas' || pathname.startsWith('/practicas/');

  return (
    <header className="sticky top-0 z-30 vetas-nogal text-sidebar-foreground print:hidden">
      <div className="mx-auto flex h-16 w-full max-w-[88rem] items-center gap-3 px-4 sm:gap-6 sm:px-6">
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
              'relative hidden rounded-md px-3 py-2 text-sm font-medium outline-hidden hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-laton sm:block',
              enPracticas ? 'text-sidebar-accent-foreground' : 'text-sidebar-muted'
            )}
          >
            Mis prácticas
            {/* Trazo de latón bajo el destino actual: se ve sin depender solo del color del texto. */}
            {enPracticas && (
              <span
                aria-hidden
                className="absolute inset-x-3 -bottom-[11px] h-0.5 rounded-full bg-laton"
              />
            )}
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
              <IndicadorEnVivo className="size-4 text-nogal" />
              <span>
                Continuar <span className="hidden sm:inline">práctica</span>
              </span>
            </Link>
          )}

          {perfil && (
            <div className="flex items-center gap-2.5">
              <DropdownMenu>
                <DropdownMenuTrigger
                  ref={botonCuenta}
                  className="group/cuenta flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 outline-hidden transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-laton data-[state=open]:bg-sidebar-accent"
                >
                  {/* Nombre por contenido (no aria-label): así coincide con lo visible (WCAG 2.5.3). */}
                  <span className="sr-only">Cuenta de {perfil.nombre}</span>
                  <AvatarCuenta
                    avatarId={perfil.avatarId}
                    nombre={perfil.nombre}
                    className="size-8 text-xs ring-1 ring-lino/20"
                  />
                  <span
                    className="hidden max-w-40 truncate text-sm font-medium md:inline"
                    aria-hidden
                  >
                    {perfil.nombre.split(' ')[0]}
                  </span>
                  <ChevronDown
                    className="size-4 text-sidebar-muted transition-transform duration-200 ease-salida group-data-[state=open]/cuenta:rotate-180"
                    aria-hidden
                  />
                </DropdownMenuTrigger>
                <MenuCuenta
                  perfil={perfil}
                  botonCuenta={botonCuenta}
                  align="end"
                  sideOffset={8}
                  cerrando={cerrando}
                  onSalir={salir}
                />
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
