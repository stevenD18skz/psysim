'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function BotonVolverManual() {
  return (
    <Link
      href="/"
      className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-sidebar-foreground transition-colors hover:bg-lino/10 focus-visible:ring-2 focus-visible:ring-laton focus-visible:outline-hidden"
      onClick={evento => {
        if (
          window.history.length > 1 &&
          !evento.ctrlKey &&
          !evento.metaKey &&
          !evento.shiftKey &&
          !evento.altKey
        ) {
          evento.preventDefault();
          window.history.back();
        }
      }}
    >
      <ArrowLeft className="size-4" aria-hidden />
      Atrás
    </Link>
  );
}
