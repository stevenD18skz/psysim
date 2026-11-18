'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { LogoGoogle } from '@/components/comun/logo-google';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { iniciarSesionConGoogle } from '@/lib/auth/actions';

/** Acceso con Google: estudiantes con su correo institucional y docentes registrados. */
export function BotonGoogle({ siguiente }: { siguiente: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [conectando, startTransition] = useTransition();

  const continuar = () => {
    setError(null);
    startTransition(async () => {
      // Si todo va bien, la acción redirige a Google y no devuelve resultado.
      const resultado = await iniciarSesionConGoogle(siguiente);
      if (resultado?.error) setError(resultado.error);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 border-2 border-nogal/70 bg-card text-base font-semibold shadow-[0_1px_2px_rgb(58_36_24/0.12)] hover:border-nogal hover:bg-card"
        onClick={continuar}
        disabled={conectando}
        aria-busy={conectando}
      >
        {conectando ? <Loader2 className="animate-spin" aria-hidden /> : <LogoGoogle />}
        {conectando ? 'Abriendo Google…' : 'Continuar con Google'}
      </Button>
    </div>
  );
}
