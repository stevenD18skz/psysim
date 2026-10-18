import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AvisoContrasenaTemporal } from '@/components/layout/aviso-contrasena-temporal';
import { BarraEstudiante } from '@/components/layout/barra-estudiante';
import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { PiePagina } from '@/components/layout/pie-pagina';
import { SaltarContenido } from '@/components/layout/saltar-contenido';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { obtenerSesionUsuario } from '@/lib/auth/dal';
import { obtenerIdUltimaSesionEnCurso } from '@/lib/escenarios/queries';
import { estaPorRevisar } from '@/lib/sesiones/estados';
import { obtenerSesionesDelDocente } from '@/lib/sesiones/queries';

/** Cookie donde el componente `Sidebar` recuerda si el menú está expandido o contraído. */
const COOKIE_MENU = 'sidebar_state';

/**
 * Layout de los paneles. El estudiante tiene un solo destino (sus prácticas): barra superior, sin
 * menú lateral. El docente y el Administrador trabajan con el menú lateral de nogal, que se
 * contrae a una columna de íconos (Ctrl/⌘ + B) y en pantallas pequeñas se abre como panel
 * deslizable. El estado del menú se lee de la cookie en el servidor para que no parpadee al cargar.
 */
export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const usuario = await obtenerSesionUsuario();
  const perfil = usuario.estado === 'autorizado' ? usuario.perfil : null;

  if (perfil?.rol === 'estudiante') {
    // Si la consulta falla, la barra simplemente no ofrece retomar.
    const sesionEnCurso = await obtenerIdUltimaSesionEnCurso().catch(() => null);
    return (
      <div className="flex min-h-svh flex-col">
        <SaltarContenido />
        <BarraEstudiante sesionEnCurso={sesionEnCurso} />
        {perfil.contrasenaTemporal && <AvisoContrasenaTemporal />}
        <main id="contenido" tabIndex={-1} className="flex flex-1 flex-col outline-hidden">
          {children}
        </main>
        <PiePagina />
      </div>
    );
  }

  const [almacen, porRevisar] = await Promise.all([
    cookies(),
    // El contador del menú es una ayuda: si la consulta falla, no se muestra.
    obtenerSesionesDelDocente()
      .then(sesiones => sesiones.filter(estaPorRevisar).length)
      .catch(() => 0),
  ]);
  const menuAbierto = almacen.get(COOKIE_MENU)?.value !== 'false';

  return (
    <TooltipProvider>
      <SaltarContenido />
      <SidebarProvider
        defaultOpen={menuAbierto}
        style={
          {
            '--sidebar-width': '16rem',
            '--sidebar-width-icon': '4rem',
          } as React.CSSProperties
        }
      >
        <AppSidebar porRevisar={porRevisar} />
        <SidebarInset className="min-w-0">
          {/* Solo en móvil: el menú vive en un panel deslizable y necesita un botón visible. */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 vetas-nogal px-3 text-sidebar-foreground md:hidden print:hidden">
            <SidebarTrigger className="size-10 hover:bg-sidebar-accent hover:text-sidebar-foreground" />
            <MarcaPsySim className="h-7" />
          </header>
          {perfil?.contrasenaTemporal && <AvisoContrasenaTemporal />}
          <div id="contenido" tabIndex={-1} className="flex flex-1 flex-col outline-hidden">
            {children}
          </div>
          <PiePagina />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
