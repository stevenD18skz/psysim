import { MainNav } from '@/components/layout/main-nav';
import { requerirDocente } from '@/lib/auth/dal';
import { AppStoreProvider } from '@/store/app-store-provider';

/**
 * Layout de las rutas protegidas. Además del proxy, verifica aquí la sesión y el rol
 * contra Supabase (verificación autoritativa) y carga el perfil en el store (slice `auth`).
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const perfil = await requerirDocente();

  return (
    // `key` fuerza un store nuevo si cambia el usuario sin recargar la página.
    <AppStoreProvider key={perfil.id} estadoInicial={{ auth: { perfil } }}>
      <MainNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">
        {children}
      </main>
    </AppStoreProvider>
  );
}
