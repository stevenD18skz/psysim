'use client';

import { Loader2 } from 'lucide-react';
import { unstable_rethrow, useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fijarTopePracticas } from '@/lib/admin/actions';
import { LIMITES_TOPE_PRACTICAS } from '@/schemas/admin.schema';

/**
 * Tope de prácticas simultáneas por cuenta del orquestador. Viene desactivado: sin tope, todos
 * empiezan y, si la cuenta se llena, las respuestas del paciente tardan más. Con tope, quien no
 * cabe ve que el consultorio está ocupado y espera a que termine otra práctica.
 */
export function TopePracticas({
  tope,
  sugerido,
  cuentas,
}: {
  /** Tope vigente (`null`: desactivado). */
  tope: number | null;
  /** Prácticas que una cuenta atiende sin esperas. */
  sugerido: number;
  /** Cuentas del orquestador entre las que se reparten las prácticas. */
  cuentas: number;
}) {
  const router = useRouter();
  const idCampo = useId();
  const [valor, setValor] = useState(String(tope ?? sugerido));
  const [guardando, startTransition] = useTransition();

  const numero = Number(valor);
  const valido =
    Number.isInteger(numero) &&
    numero >= LIMITES_TOPE_PRACTICAS.min &&
    numero <= LIMITES_TOPE_PRACTICAS.max;

  const guardar = (nuevo: number | null) =>
    startTransition(async () => {
      let resultado;
      try {
        resultado = await fijarTopePracticas({ tope: nuevo });
      } catch (error) {
        unstable_rethrow(error);
        toast.error('No pudimos guardar el tope. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      toast.success(
        nuevo === null
          ? 'Tope desactivado: todas las prácticas pueden empezar.'
          : `Tope guardado: ${nuevo} por cuenta.`
      );
      router.refresh();
    });

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs"
      onSubmit={evento => {
        evento.preventDefault();
        if (valido) guardar(numero);
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm">
          <span className="font-semibold">
            {tope === null ? 'Desactivado.' : `Activo: ${tope} por cuenta.`}
          </span>{' '}
          <span className="text-muted-foreground">
            {tope === null
              ? 'Todas las prácticas pueden empezar; con muchas a la vez, el paciente tarda más en responder.'
              : `Hasta ${tope * cuentas} ${tope * cuentas === 1 ? 'práctica' : 'prácticas'} a la vez en toda la plataforma. Quien no cabe ve «El consultorio está ocupado».`}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          Una práctica deja de ocupar cupo al terminar o tras 15 minutos sin actividad.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idCampo} className="text-sm font-medium">
            Prácticas simultáneas por cuenta
          </label>
          <Input
            id={idCampo}
            type="number"
            inputMode="numeric"
            min={LIMITES_TOPE_PRACTICAS.min}
            max={LIMITES_TOPE_PRACTICAS.max}
            step={1}
            value={valor}
            onChange={evento => setValor(evento.target.value)}
            aria-invalid={!valido || undefined}
            aria-describedby={`${idCampo}-ayuda`}
            className="w-28"
          />
        </div>
        <Button type="submit" disabled={guardando || !valido || numero === tope}>
          {guardando && <Loader2 className="animate-spin" aria-hidden />}
          {tope === null ? 'Activar tope' : 'Guardar tope'}
        </Button>
        {tope !== null && (
          <Button
            type="button"
            variant="outline"
            disabled={guardando}
            onClick={() => guardar(null)}
          >
            Desactivar
          </Button>
        )}
      </div>
      <p id={`${idCampo}-ayuda`} className="text-sm text-muted-foreground">
        Sugerido: {sugerido} o {sugerido + 1}. Cada cuenta admite 10 mensajes por minuto y un
        estudiante envía unos 3.
      </p>
    </form>
  );
}
