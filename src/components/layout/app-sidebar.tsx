'use client';

import {
  ChevronsUpDown,
  ClipboardPlus,
  FlaskConical,
  Loader2,
  LogOut,
  type LucideIcon,
  MonitorPlay,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { useCerrarSesion } from '@/components/layout/use-cerrar-sesion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store-provider';

interface Enlace {
  href: Route;
  etiqueta: string;
  descripcion: string;
  icono: LucideIcon;
}

const ENLACE_NUEVA_SESION: Enlace = {
  href: '/configuracion',
  etiqueta: 'Nueva sesión',
  descripcion: 'Escenario y datos del estudiante',
  icono: ClipboardPlus,
};

const ENLACE_SESION_EN_CURSO: Enlace = {
  href: '/simulacion',
  etiqueta: 'Sesión en curso',
  descripcion: 'En curso · retomar',
  icono: MonitorPlay,
};

const ENLACE_LABORATORIO: Enlace = {
  href: '/laboratorio',
  etiqueta: 'Laboratorio',
  descripcion: 'Prototipos en prueba',
  icono: FlaskConical,
};

/** Iniciales para el avatar del docente ("Ana María Gómez" → "AG"). */
function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  const primera = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : '';
  return (primera + ultima).toUpperCase();
}

/**
 * Menú lateral del panel del docente (HU-22 · T02/T03).
 *
 * - Cabecera con el logo de la Universidad del Valle y el botón para contraer el menú.
 * - Enlaces con estado activo claro; "Sesión en curso" solo aparece si hay una que retomar.
 * - Al pie, el docente: su menú agrupa la cuenta y el cierre de sesión, así no se sale por
 *   accidente con un clic.
 * - Contraído queda una columna de íconos con tooltips; en móvil es un panel deslizable.
 */
export function AppSidebar({ sesionEnCurso }: { sesionEnCurso: boolean }) {
  const pathname = usePathname();
  const perfil = useAppStore(state => state.auth.perfil);
  // La sesión activa del store cubre el caso de venir de /simulacion sin recargar.
  const hayActiva = useAppStore(state => state.sesion.activa !== null);
  const { salir, cerrando } = useCerrarSesion();
  const { toggleSidebar, state, isMobile, setOpenMobile } = useSidebar();
  const contraido = state === 'collapsed' && !isMobile;

  const secciones: { titulo: string; enlaces: Enlace[] }[] = [
    {
      titulo: 'Simulación',
      enlaces:
        sesionEnCurso || hayActiva
          ? [ENLACE_NUEVA_SESION, ENLACE_SESION_EN_CURSO]
          : [ENLACE_NUEVA_SESION],
    },
    { titulo: 'Herramientas', enlaces: [ENLACE_LABORATORIO] },
  ];

  // En móvil el menú es un panel superpuesto: se cierra al navegar.
  const alNavegar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      {/* Filete con el rojo institucional de la Universidad del Valle. */}
      <div aria-hidden className="h-1 shrink-0 bg-marca" />

      <SidebarHeader className="px-3 pt-4 pb-3 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-3">
          <Link
            href="/configuracion"
            onClick={alNavegar}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <LogoUnivalle className="h-11 group-data-[collapsible=icon]:h-9" />
            <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="font-heading text-xl font-semibold tracking-tight">PsySim</span>
              <span className="truncate text-xs text-muted-foreground">
                Simulador clínico · Psicología
              </span>
            </span>
          </Link>
          {!isMobile && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={contraido ? 'Expandir menú' : 'Contraer menú'}
              title={contraido ? 'Expandir menú (Ctrl + B)' : 'Contraer menú (Ctrl + B)'}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              {contraido ? (
                <PanelLeftOpen className="size-4" aria-hidden />
              ) : (
                <PanelLeftClose className="size-4" aria-hidden />
              )}
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1">
        <nav aria-label="Navegación principal" className="contents">
          {secciones.map(seccion => (
            <SidebarGroup key={seccion.titulo}>
              <SidebarGroupLabel className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                {seccion.titulo}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {seccion.enlaces.map(enlace => (
                    <ElementoMenu
                      key={enlace.href}
                      enlace={enlace}
                      activo={pathname === enlace.href || pathname.startsWith(`${enlace.href}/`)}
                      enCurso={enlace === ENLACE_SESION_EN_CURSO}
                      onNavegar={alNavegar}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>

      {perfil && (
        <SidebarFooter className="border-t p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={perfil.nombre}
                    aria-label={`Cuenta de ${perfil.nombre}`}
                    className="data-[state=open]:bg-sidebar-accent"
                  >
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                    >
                      {iniciales(perfil.nombre)}
                    </span>
                    <span className="grid min-w-0 flex-1 text-left leading-tight">
                      <span className="truncate font-medium">{perfil.nombre}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {perfil.correo}
                      </span>
                    </span>
                    <ChevronsUpDown className="ml-auto text-muted-foreground" aria-hidden />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side={isMobile ? 'top' : 'right'}
                  align="end"
                  sideOffset={8}
                  className="w-64"
                >
                  <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
                    <span className="truncate font-medium text-foreground">{perfil.nombre}</span>
                    <span className="truncate text-xs text-muted-foreground">{perfil.correo}</span>
                    <span className="text-xs text-muted-foreground">
                      Docente · Código {perfil.codigoInstitucional}
                    </span>
                  </DropdownMenuLabel>
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
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}

function ElementoMenu({
  enlace,
  activo,
  enCurso,
  onNavegar,
}: {
  enlace: Enlace;
  activo: boolean;
  enCurso: boolean;
  onNavegar: () => void;
}) {
  const { href, etiqueta, descripcion, icono: Icono } = enlace;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        size="lg"
        isActive={activo}
        tooltip={etiqueta}
        className={cn(
          'relative h-11 gap-3 px-2.5 group-data-[collapsible=icon]:justify-center',
          'data-active:bg-accent data-active:text-accent-foreground',
          // Barra roja a la izquierda del elemento activo.
          'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-primary before:opacity-0 data-active:before:opacity-100'
        )}
      >
        <Link href={href} aria-current={activo ? 'page' : undefined} onClick={onNavegar}>
          <span className="relative flex size-5 shrink-0 items-center justify-center">
            <Icono className="size-[18px]!" aria-hidden />
            {enCurso && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-success ring-2 ring-sidebar"
              />
            )}
          </span>
          <span className="grid min-w-0 leading-tight">
            <span className="truncate">{etiqueta}</span>
            <span
              className={cn(
                'truncate text-xs font-normal',
                activo ? 'text-accent-foreground/80' : 'text-muted-foreground'
              )}
            >
              {descripcion}
            </span>
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
