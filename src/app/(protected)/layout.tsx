import { requerirDocente } from '@/lib/auth/dal';
import { AppStoreProvider } from '@/store/app-store-provider';

/**
 * Layout de las rutas protegidas. Además del proxy, verifica aquí la sesión y el rol
 * contra Supabase (verificación autoritativa) y carga el perfil en el store (slice `auth`).
 *
 * No dibuja navegación: las páginas del docente la reciben de `(panel)/layout.tsx` y
 * /simulacion ocupa toda la pantalla, sin menús, para que la práctica sea inmersiva.
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const perfil = await requerirDocente();

  return (
    // `key` fuerza un store nuevo si cambia el usuario sin recargar la página.
    <AppStoreProvider key={perfil.id} estadoInicial={{ auth: { perfil } }}>
      {children}
    </AppStoreProvider>
  );
}
