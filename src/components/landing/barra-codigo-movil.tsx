'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

/**
 * En móvil, «Tengo un código» aparece solo cuando el bloque del código ya no se ve: en el primer
 * vistazo no duplica la acción principal ni tapa el aviso de «se hace en un computador».
 */
export function BarraCodigoMovil({ objetivo }: { objetivo: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const bloque = document.getElementById(objetivo);
    if (!bloque || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(([entrada]) =>
      setVisible(!entrada!.isIntersecting)
    );
    observador.observe(bloque);
    return () => observador.disconnect();
  }, [objetivo]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 vetas-nogal p-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.45)] md:hidden">
      <Button asChild variant="accion" size="lg" className="w-full">
        <a href={`#${objetivo}`}>Tengo un código</a>
      </Button>
    </div>
  );
}
