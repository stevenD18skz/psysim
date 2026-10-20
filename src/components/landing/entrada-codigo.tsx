'use client';

import { ArrowRight, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizarCodigoAcceso, rutaUnirse } from '@/lib/asignaciones/codigo';

/**
 * «Tengo un código» en la landing. No usa el código: lleva al enlace de la práctica, que pide
 * entrar con Google y comprueba el dispositivo antes de usarlo.
 */
export function EntradaCodigo() {
  const id = useId();
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const entrar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const normalizado = normalizarCodigoAcceso(codigo);
    if (!normalizado) {
      setError('El código tiene 10 letras con guiones, por ejemplo abc-defg-hij.');
      return;
    }
    setError(null);
    router.push(rutaUnirse(normalizado));
  };

  return (
    <form onSubmit={entrar} noValidate className="flex flex-col gap-2" aria-label="Tengo un código">
      <label htmlFor={id} className="text-sm font-semibold">
        Tengo un código
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <KeyRound
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={id}
            value={codigo}
            onChange={evento => setCodigo(evento.target.value)}
            placeholder="abc-defg-hij"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-12 pl-10 font-mono text-lg tracking-[0.06em]"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>
        <Button type="submit" variant="accion" size="lg" className="h-12 px-5">
          Entrar
          <ArrowRight aria-hidden />
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
