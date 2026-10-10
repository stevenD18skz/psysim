'use client';

import {
  ChevronsUpDown,
  ClipboardPlus,
  FilePlus2,
  GraduationCap,
  FlaskConical,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  type LucideIcon,
  MonitorPlay,
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
import { ETIQUETA_ROL, RUTA_INICIO } from '@/lib/auth/routes';
import { iniciales } from '@/lib/nombres';
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
  descripcion: 'Caso, paciente y código de acceso',
  icono: ClipboardPlus,
};

const ENLACE_SESION_EN_CURSO: Enlace = {
  href: '/simulacion',
  etiqueta: 'Sesión en curso',
  descripcion: 'En curso · retomar',
  icono: MonitorPlay,
};

const ENLACE_NUEVO_CASO: Enlace = {
  href: '/configuracion/casos/nuevo',
  etiqueta: 'Nuevo caso',
  descripcion: 'Constructor guiado de pacientes',
  icono: FilePlus2,
};

const ENLACE_ESTUDIANTES: Enlace = {
  href: '/estudiantes',
  etiqueta: 'Estudiantes',
  descripcion: 'Sesiones y retroalimentación',
  icono: UsersRound,
};

const ENLACE_PRACTICAS: Enlace = {
  href: '/practicas',
  etiqueta: 'Mis prácticas',
  descripcion: 'Código de acceso e historial',
  icono: GraduationCap,
};

const ENLACE_DOCENTES: Enlace = {
  href: '/admin',
  etiqueta: 'Docentes',
  descripcion: 'Cuentas y actividad',
  icono: ShieldCheck,
};

const ENLACE_LABORATORIO: Enlace = {
  href: '/laboratorio',
  etiqueta: 'Laboratorio',
  descripcion: 'Prototipos en prueba',
  icono: FlaskConical,
};

interface Seccion {
  titulo: string;
  enlaces: Enlace[];
}

const SECCIONES_DOCENTE: Seccion[] = [
  { titulo: 'Simulación', enlaces: [ENLACE_NUEVA_SESION, ENLACE_NUEVO_CASO] },
  { titulo: 'Seguimiento', enlaces: [ENLACE_ESTUDIANTES] },
];

/** El Administrador trabaja como docente y, además, gestiona la plataforma. */
const SECCIONES_ADMIN: Seccion[] = [
  ...SECCIONES_DOCENTE,
  { titulo: 'Administración', enlaces: [ENLACE_DOCENTES, ENLACE_LABORATORIO] },
];

/**
 * ¿La ruta actual pertenece al enlace? `/configuracion` solo coincide con su propia página, no
 * con `/configuracion/casos/…`, que tiene su enlace aparte.
 */
function estaActivo(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === '/configuracion') return false;
  return pathname.startsWith(`${href}/`);
}

/**
 * Menú lateral de los paneles del docente y del estudiante (HU-22 · T02/T03).
 *
 * - Cabecera con el logo de la Universidad del Valle y el botón para contraer el menú.
 * - Enlaces según el rol, con estado activo claro. El estudiante ve "Sesión en curso" solo si
 *   tiene una que retomar; el Administrador ve además la sección "Administración".
 * - Al pie, el usuario: su menú agrupa la cuenta, el cambio de contraseña y el cierre de sesión,
 *   así no se sale por accidente con un clic.
 * - Contraído queda una columna de íconos con tooltips; en móvil es un panel deslizable.
 */
export function AppSidebar({ sesionEnCurso }: { sesionEnCurso: string | null }) {
  const pathname = usePathname();
  const perfil = useAppStore(state => state.auth.perfil);
  // La sesión activa del store cubre el caso de venir de /simulacion sin recargar.
  const hayActiva = useAppStore(state => state.sesion.activa !== null);
  const { salir, cerrando } = useCerrarSesion();
  const { toggleSidebar, state, isMobile, setOpenMobile } = useSidebar();
  const contraido = state === 'collapsed' && !isMobile;
  const [cambiandoContrasena, setCambiandoContrasena] = useState(false);

  const rol = perfil?.rol ?? 'docente';
  const secciones: Seccion[] =
    rol === 'estudiante'
      ? [
          {
            titulo: 'Práctica',
            enlaces:
              sesionEnCurso || hayActiva
                ? [ENLACE_PRACTICAS, ENLACE_SESION_EN_CURSO]
                : [ENLACE_PRACTICAS],
          },
        ]
      : rol === 'superadmin'
        ? SECCIONES_ADMIN
        : SECCIONES_DOCENTE;
  const etiquetaRol = ETIQUETA_ROL[rol];

  // En móvil el menú es un panel superpuesto: se cierra al navegar.
  const alNavegar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      {/* Filete con el rojo institucional de la Universidad del Valle. */}
      <div aria-hidden className="h-1 shrink-0 bg-marca" />

      <SidebarHeader className="px-3 pt-4 pb-3 group-data-[collapsible=icon]:px-2">
        {contraido ? (
          // Contraído, el logo es el botón de expandir: al pasar el ratón (o con el foco) se
          // convierte en el ícono del panel.
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expandir menú"
            title="Expandir menú (Ctrl + B)"
            className="group/expandir relative mx-auto flex size-11 items-center justify-center rounded-lg text-sidebar-foreground/75 transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <LogoUnivalle className="h-11 transition-opacity duration-150 group-hover/expandir:opacity-0 group-focus-visible/expandir:opacity-0" />
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
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <LogoUnivalle className="h-11" />
              <span className="grid min-w-0 leading-tight">
                <span className="font-heading text-xl font-semibold tracking-tight">PsySim</span>
                <span className="truncate text-xs text-sidebar-foreground/65">
                  Simulador clínico · Psicología
                </span>
              </span>
            </Link>
            {!isMobile && (
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Contraer menú"
                title="Contraer menú (Ctrl + B)"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/65 transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <PanelLeftClose className="size-4" aria-hidden />
              </button>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1">
        <nav aria-label="Navegación principal" className="contents">
          {secciones.map((seccion, indice) => (
            <SidebarGroup key={seccion.titulo}>
              {/* Contraído no hay etiquetas: una línea fina separa las secciones. */}
              {indice > 0 && (
                <div
                  aria-hidden
                  className="mx-auto mb-1 hidden h-px w-8 bg-sidebar-border group-data-[collapsible=icon]:block"
                />
              )}
              <SidebarGroupLabel className="text-[11px] font-semibold tracking-[0.08em] text-sidebar-foreground/55 uppercase">
                {seccion.titulo}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {seccion.enlaces.map(enlace => (
                    <ElementoMenu
                      key={enlace.href}
                      enlace={enlace}
                      activo={estaActivo(pathname, enlace.href)}
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
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={perfil.nombre}
                    aria-label={`Cuenta de ${perfil.nombre}`}
                    className="h-14 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 data-[state=open]:bg-sidebar-accent"
                  >
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-2 ring-sidebar"
                    >
                      {iniciales(perfil.nombre)}
                    </span>
                    <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-medium">{perfil.nombre}</span>
                      <span className="truncate text-xs text-sidebar-foreground/65">
                        {etiquetaRol}
                      </span>
                    </span>
                    <ChevronsUpDown
                      className="ml-auto text-sidebar-foreground/65 group-data-[collapsible=icon]:hidden"
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
                      Ir a la página de inicio
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setCambiandoContrasena(true)}>
                    <KeyRound aria-hidden />
                    Cambiar contraseña
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
          'relative h-12 gap-3 px-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
          'data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground',
          // Barra roja a la izquierda del elemento activo.
          'before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-sidebar-primary before:opacity-0 data-active:before:opacity-100'
        )}
      >
        <Link href={href} aria-current={activo ? 'page' : undefined} onClick={onNavegar}>
          <span
            className={cn(
              'relative flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
              activo
                ? 'bg-sidebar-primary text-white'
                : 'bg-foreground/6 text-sidebar-foreground/80'
            )}
          >
            <Icono className="size-[17px]!" aria-hidden />
            {enCurso && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-success ring-2 ring-sidebar"
              />
            )}
          </span>
          <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate">{etiqueta}</span>
            <span
              className={cn(
                'truncate text-xs font-normal',
                activo ? 'text-sidebar-foreground/75' : 'text-sidebar-foreground/55'
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
