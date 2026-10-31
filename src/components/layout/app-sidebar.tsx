'use client';

import {
  ChevronsUpDown,
  ClipboardList,
  FlaskConical,
  Globe,
  House,
  KeyRound,
  Library,
  Loader2,
  LogOut,
  type LucideIcon,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { DialogoCambiarContrasena } from '@/components/layout/dialogo-cambiar-contrasena';
import { MarcaPsySim } from '@/components/layout/marca-psysim';
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
import { ETIQUETA_ROL, RUTA_INICIO } from '@/lib/auth/routes';
import { iniciales } from '@/lib/nombres';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store-provider';

interface Enlace {
  href: Route;
  etiqueta: string;
  icono: LucideIcon;
  /** Prefijos de ruta que también marcan el enlace como activo. */
  incluye?: string[];
  /** `true` si solo coincide con su propia ruta (no con sus subrutas). */
  exacto?: boolean;
}

const ENLACES_TRABAJO: Enlace[] = [
  { href: '/inicio', etiqueta: 'Inicio', icono: House, exacto: true },
  { href: '/configuracion', etiqueta: 'Asignar práctica', icono: ClipboardList, exacto: true },
  { href: '/sesiones', etiqueta: 'Revisiones', icono: MessageSquareText },
  { href: '/estudiantes', etiqueta: 'Estudiantes', icono: UsersRound },
  { href: '/configuracion/casos', etiqueta: 'Casos', icono: Library },
];

const ENLACES_ADMIN: Enlace[] = [{ href: '/admin', etiqueta: 'Docentes', icono: ShieldCheck }];

function estaActivo(pathname: string, enlace: Enlace) {
  if (pathname === enlace.href) return true;
  if (enlace.exacto) return false;
  return [enlace.href, ...(enlace.incluye ?? [])].some(p => pathname.startsWith(`${p}/`));
}

/**
 * Menú lateral del docente y del Administrador: el armazón de nogal del consultorio.
 *
 * - Cabecera con la marca de PsySim y el botón para contraer el menú (Ctrl/⌘ + B).
 * - «Trabajo»: la bandeja de inicio, asignar, revisar (con lo pendiente contado), estudiantes y
 *   casos. El Administrador ve además «Administración».
 * - Al pie, la cuenta: agrupa el cambio de contraseña, las herramientas de desarrollo (solo el
 *   Administrador) y el cierre de sesión, así no se sale por accidente con un clic.
 * - Contraído queda una columna de íconos con tooltips; en móvil es un panel deslizable.
 */
export function AppSidebar({ porRevisar }: { porRevisar: number }) {
  const pathname = usePathname();
  const perfil = useAppStore(state => state.auth.perfil);
  const { salir, cerrando } = useCerrarSesion();
  const { toggleSidebar, state, isMobile, setOpenMobile } = useSidebar();
  const contraido = state === 'collapsed' && !isMobile;
  const [cambiandoContrasena, setCambiandoContrasena] = useState(false);

  const rol = perfil?.rol ?? 'docente';
  const esAdmin = rol === 'superadmin';
  const etiquetaRol = ETIQUETA_ROL[rol];

  // En móvil el menú es un panel superpuesto: se cierra al navegar.
  const alNavegar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 pt-5 pb-4 group-data-[collapsible=icon]:px-2">
        {contraido ? (
          // Contraído, la marca es el botón de expandir: al pasar el ratón (o con el foco) se
          // convierte en el ícono del panel.
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expandir menú"
            title="Expandir menú (Ctrl + B)"
            className="group/expandir relative mx-auto flex size-11 items-center justify-center rounded-lg text-sidebar-foreground outline-hidden transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <MarcaPsySim
              soloSimbolo
              className="size-7 transition-opacity duration-150 group-hover/expandir:opacity-0 group-focus-visible/expandir:opacity-0"
            />
            <PanelLeftOpen
              className="absolute size-5 opacity-0 transition-opacity duration-150 group-hover/expandir:opacity-100 group-focus-visible/expandir:opacity-100"
              aria-hidden
            />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={RUTA_INICIO[rol]}
              onClick={alNavegar}
              className="flex min-w-0 flex-1 items-center rounded-lg px-1 py-0.5 outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <MarcaPsySim className="h-8 text-sidebar-foreground" />
            </Link>
            {!isMobile && (
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Contraer menú"
                title="Contraer menú (Ctrl + B)"
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-sidebar-muted outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <PanelLeftClose className="size-4" aria-hidden />
              </button>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="gap-2 px-1">
        <nav aria-label="Navegación principal" className="contents">
          <SeccionMenu titulo="Trabajo">
            {ENLACES_TRABAJO.map(enlace => (
              <ElementoMenu
                key={enlace.href}
                enlace={enlace}
                activo={estaActivo(pathname, enlace)}
                contador={enlace.href === '/sesiones' ? porRevisar : 0}
                onNavegar={alNavegar}
              />
            ))}
          </SeccionMenu>
          {esAdmin && (
            <SeccionMenu titulo="Administración" separada>
              {ENLACES_ADMIN.map(enlace => (
                <ElementoMenu
                  key={enlace.href}
                  enlace={enlace}
                  activo={estaActivo(pathname, enlace)}
                  contador={0}
                  onNavegar={alNavegar}
                />
              ))}
            </SeccionMenu>
          )}
        </nav>
      </SidebarContent>

      {perfil && (
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={perfil.nombre}
                    className="h-14 text-sidebar-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
                  >
                    {/* Nombre por contenido (no aria-label): coincide con lo visible (WCAG 2.5.3). */}
                    <span className="sr-only">Cuenta de {perfil.nombre}</span>
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-salvia-suave text-sm font-semibold text-salvia-oscuro"
                    >
                      {iniciales(perfil.nombre)}
                    </span>
                    <span
                      aria-hidden
                      className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden"
                    >
                      <span className="truncate font-medium">{perfil.nombre}</span>
                      <span className="truncate text-xs text-sidebar-muted">{etiquetaRol}</span>
                    </span>
                    <ChevronsUpDown
                      className="ml-auto text-sidebar-muted group-data-[collapsible=icon]:hidden"
                      aria-hidden
                    />
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
                      {etiquetaRol} · Código {perfil.codigoInstitucional}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/" onClick={alNavegar}>
                      <Globe aria-hidden />
                      Ir a la página pública
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setCambiandoContrasena(true)}>
                    <KeyRound aria-hidden />
                    Cambiar contraseña
                  </DropdownMenuItem>
                  {esAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/laboratorio" onClick={alNavegar}>
                        <FlaskConical aria-hidden />
                        Herramientas de desarrollo
                      </Link>
                    </DropdownMenuItem>
                  )}
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
      <DialogoCambiarContrasena
        abierto={cambiandoContrasena}
        onAbiertoCambia={setCambiandoContrasena}
      />
    </Sidebar>
  );
}

function SeccionMenu({
  titulo,
  separada = false,
  children,
}: {
  titulo: string;
  separada?: boolean;
  children: React.ReactNode;
}) {
  return (
    <SidebarGroup>
      {/* Contraído no hay etiquetas: una línea fina separa las secciones. */}
      {separada && (
        <div
          aria-hidden
          className="mx-auto mb-1 hidden h-px w-8 bg-sidebar-border group-data-[collapsible=icon]:block"
        />
      )}
      <SidebarGroupLabel className="text-xs font-semibold tracking-[0.12em] text-sidebar-muted uppercase ancho-condensado">
        {titulo}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function ElementoMenu({
  enlace,
  activo,
  contador,
  onNavegar,
}: {
  enlace: Enlace;
  activo: boolean;
  contador: number;
  onNavegar: () => void;
}) {
  const { href, etiqueta, icono: Icono } = enlace;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        size="lg"
        isActive={activo}
        tooltip={contador > 0 ? `${etiqueta} · ${contador} por revisar` : etiqueta}
        className={cn(
          'relative h-11 gap-3 px-2.5 text-[0.95rem] text-sidebar-foreground/90 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          'data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-accent-foreground'
        )}
      >
        <Link href={href} aria-current={activo ? 'page' : undefined} onClick={onNavegar}>
          <span className="relative flex size-6 shrink-0 items-center justify-center">
            <Icono
              className={cn('size-[18px]!', activo ? 'text-laton' : 'text-sidebar-muted')}
              aria-hidden
            />
            {/* Contraído, lo pendiente se ve como un punto de latón sobre el ícono. */}
            {contador > 0 && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-1 hidden size-2.5 rounded-full bg-salvia-suave ring-2 ring-sidebar group-data-[collapsible=icon]:block"
              />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:sr-only">
            {etiqueta}
          </span>
          {contador > 0 && (
            <span className="ml-auto rounded-full bg-salvia-suave px-2 py-0.5 text-xs font-semibold text-salvia-oscuro tabular-nums group-data-[collapsible=icon]:sr-only">
              {contador}
              <span className="sr-only"> por revisar</span>
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
