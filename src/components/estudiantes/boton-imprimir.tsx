'use client';

import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Abre el diálogo de impresión del navegador (imprimir o «Guardar como PDF»). */
export function BotonImprimir() {
  return (
    <Button size="lg" onClick={() => window.print()}>
      <Printer aria-hidden />
      Imprimir o guardar PDF
    </Button>
  );
}
