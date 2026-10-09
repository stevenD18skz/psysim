'use client';

import { AlertCircle, ArrowRight, KeyRound, Loader2 } from 'lucide-react';
import { useId, useState, useTransition } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { canjearCodigo } from '@/lib/asignaciones/actions';

/**
 * El estudiante escribe (o pega) el código que le envió su docente y entra a la simulación. Si el
 * código es válido, la acción crea la sesión y redirige; si no, explica por qué.
 */
export function FormularioCodigo({ codigoInicial = '' }: { codigoInicial?: string }) {
  const id = useId();
  const [codigo, setCodigo] = useState(codigoInicial);
  const [error, setError] = useState<string | null>(null);
  const [entrando, startTransition] = useTransition();

  const entrar = (evento: React.FormEvent) => {
    evento.preventDefault();
    setError(null);
    startTransition(async () => {
      const resultado = await canjearCodigo({ codigo });
      if (resultado?.error) setError(resultado.error);
    });
  };

  return (
    <form
      onSubmit={entrar}
      noValidate
      className="flex flex-col gap-3"
      aria-label="Unirse con código"
    >
      <label htmlFor={id} className="text-sm font-medium">
        Código de acceso
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <KeyRound
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
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
            className="h-11 pl-9 font-mono text-base tracking-wider"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            disabled={entrando}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-11"
          disabled={entrando || !codigo.trim()}
          aria-busy={entrando}
        >
          {entrando ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {entrando ? 'Entrando…' : 'Entrar a la simulación'}
          {!entrando && <ArrowRight aria-hidden />}
        </Button>
      </div>
      {error && (
        <Alert id={`${id}-error`} variant="destructive" role="alert">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
