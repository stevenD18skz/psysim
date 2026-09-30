'use client';

import { Armchair } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LogoutButton } from '@/components/layout/logout-button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store-provider';

const ENLACES: { href: Route; etiqueta: string }[] = [
  { href: '/configuracion', etiqueta: 'Configuración' },
  { href: '/simulacion', etiqueta: 'Simulación' },
];

export function MainNav() {
  const pathname = usePathname();
  const nombre = useAppStore(state => state.auth.perfil?.nombre);

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/configuracion"
          className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Armchair className="size-4" aria-hidden />
          </span>
          PsySim
        </Link>

        <nav aria-label="Navegación principal" className="flex items-center gap-1">
          {ENLACES.map(({ href, etiqueta }) => {
            const activo = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
                  activo && 'bg-muted font-medium text-foreground'
                )}
              >
                {etiqueta}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {nombre && (
            <span className="hidden text-sm text-muted-foreground sm:inline">{nombre}</span>
          )}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
