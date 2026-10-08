import type { Metadata } from 'next';

import { requerirUsuario } from '@/lib/auth/dal';
import { AppStoreProvider } from '@/store/app-store-provider';

/** Los paneles del docente y del estudiante son privados: ningún buscador debe indexarlos. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Layout de las rutas protegidas. Además del proxy, verifica aquí la sesión contra Supabase
 * (verificación autoritativa) y carga el perfil en el store (slice `auth`). Cada página exige
 * además su rol (`requerirDocente` o `requerirEstudiante`).
 *
 * No dibuja navegación: los paneles la reciben de `(panel)/layout.tsx` y /simulacion ocupa
 * toda la pantalla, sin menús, para que la práctica sea inmersiva.
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const perfil = await requerirUsuario();

  return (
    // `key` fuerza un store nuevo si cambia el usuario sin recargar la página.
    <AppStoreProvider key={perfil.id} estadoInicial={{ auth: { perfil } }}>
      {children}
    </AppStoreProvider>
  );
}
