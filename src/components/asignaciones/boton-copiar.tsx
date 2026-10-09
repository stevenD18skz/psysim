'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

/** Copia un texto al portapapeles y confirma con un ✓ durante unos segundos. */
export function BotonCopiar({
  texto,
  etiqueta,
  variant = 'outline',
  className,
}: {
  /** Texto a copiar; una función se evalúa al hacer clic (p. ej. para usar `window`). */
  texto: string | (() => string);
  etiqueta: string;
  variant?: 'outline' | 'default' | 'secondary' | 'ghost';
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const temporizador = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(temporizador);
  }, [copiado]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(typeof texto === 'function' ? texto() : texto);
      setCopiado(true);
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto y cópialo a mano.');
    }
  };

  return (
    <Button type="button" variant={variant} onClick={copiar} className={className}>
      {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copiado ? 'Copiado' : etiqueta}
    </Button>
  );
}
