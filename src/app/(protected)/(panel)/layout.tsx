import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { PiePagina } from '@/components/layout/pie-pagina';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { obtenerIdUltimaSesionEnCurso } from '@/lib/escenarios/queries';

/** Cookie donde el componente `Sidebar` recuerda si el menú está expandido o contraído. */
const COOKIE_MENU = 'sidebar_state';

/**
 * Layout del panel del docente (configuración, laboratorio…): menú lateral que se contrae a
 * una columna de íconos (Ctrl/⌘ + B) y, en pantallas pequeñas, se abre como panel deslizable.
 * El estado se lee de la cookie en el servidor para que no parpadee al cargar.
 */
export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [almacen, sesionEnCurso] = await Promise.all([
    cookies(),
    // Si la consulta falla, el menú simplemente no ofrece retomar la sesión.
    obtenerIdUltimaSesionEnCurso().catch(() => null),
  ]);
  const menuAbierto = almacen.get(COOKIE_MENU)?.value !== 'false';

  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={menuAbierto}
        style={
          {
            '--sidebar-width': '17rem',
            '--sidebar-width-icon': '4rem',
          } as React.CSSProperties
        }
      >
        <AppSidebar sesionEnCurso={sesionEnCurso !== null} />
        <SidebarInset className="min-w-0">
          {/* Solo en móvil: el menú vive en un panel deslizable y necesita un botón visible. */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur md:hidden">
            <SidebarTrigger className="size-9" />
            <LogoUnivalle className="h-8" />
            <span className="font-heading text-lg font-semibold">PsySim</span>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
          <PiePagina />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
