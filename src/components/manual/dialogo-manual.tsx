'use client';

import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const ContenidoManual = dynamic(
  () => import('@/components/manual/contenido-manual').then(modulo => modulo.ContenidoManual),
  { loading: () => <p role="status">Cargando el manual…</p> }
);

export function DialogoManual({
  children,
  alCambiar,
}: {
  children: ReactElement;
  alCambiar?: (abierto: boolean) => void;
}) {
  return (
    <Dialog onOpenChange={alCambiar}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-1rem)] max-w-[min(1400px,calc(100%-1rem))] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-3rem)] sm:max-w-[min(1400px,calc(100%-3rem))]"
      >
        <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b vetas-nogal px-4 py-3 text-sidebar-foreground sm:px-6">
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="min-h-10 gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-laton"
            >
              <ArrowLeft aria-hidden />
              Atrás
            </Button>
          </DialogClose>
          <DialogTitle className="text-base sm:text-lg">Manual de uso de PsySim</DialogTitle>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain bg-background px-4 py-6 text-base sm:px-8 sm:py-8">
          <ContenidoManual enDialogo />
        </div>
      </DialogContent>
    </Dialog>
  );
}
