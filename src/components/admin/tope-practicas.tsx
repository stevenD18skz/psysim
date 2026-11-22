'use client';

import { Gauge, Loader2 } from 'lucide-react';
import { unstable_rethrow, useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fijarTopePracticas } from '@/lib/admin/actions';
import { cn } from '@/lib/utils';
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

  const atajos = [
    { valor: Math.max(LIMITES_TOPE_PRACTICAS.min, sugerido - 1), etiqueta: 'Conservador' },
    { valor: sugerido, etiqueta: 'Sugerido' },
    { valor: Math.min(LIMITES_TOPE_PRACTICAS.max, sugerido + 1), etiqueta: 'Holgado' },
  ].filter((item, indice, lista) => lista.findIndex(x => x.valor === item.valor) === indice);

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
      className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-xs"
      onSubmit={evento => {
        evento.preventDefault();
        if (valido) guardar(numero);
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
              tope !== null
                ? 'bg-salvia-suave text-salvia-oscuro'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Gauge className="size-4.5" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm leading-relaxed text-foreground">
              {tope === null ? (
                <>
                  <strong className="font-semibold">Sin tope activo.</strong>{' '}
                  <span className="text-muted-foreground">
                    Todas las prácticas pueden empezar; si muchas coinciden al mismo tiempo, el
                    paciente tarda más en responder.
                  </span>
                </>
              ) : (
                <>
                  <strong className="font-semibold">
                    Hasta {tope * cuentas} {tope * cuentas === 1 ? 'práctica' : 'prácticas'} a la
                    vez
                  </strong>{' '}
                  <span className="text-muted-foreground">
                    ({tope} por cuenta en {cuentas} {cuentas === 1 ? 'cuenta' : 'cuentas'}). Quien
                    llegue sin cupo verá que el consultorio está ocupado y podrá intentarlo en unos
                    minutos.
                  </span>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Cada práctica libera su cupo al terminar o tras 15 minutos sin actividad.
            </p>
          </div>
        </div>

        <InsigniaEstado
          className="shrink-0"
          estado={
            tope === null
              ? { texto: 'Desactivado', tono: 'neutro' }
              : { texto: `Activo · ${tope} por cuenta`, tono: 'listo' }
          }
        />
      </div>

      <div className="flex flex-col gap-4 border-t pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Valores rápidos:</span>
          {atajos.map(atajo => {
            const seleccionado = valido && numero === atajo.valor;
            return (
              <button
                key={atajo.valor}
                type="button"
                disabled={guardando}
                onClick={() => setValor(String(atajo.valor))}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-50',
                  seleccionado
                    ? 'border-nogal bg-nogal text-lino'
                    : 'bg-background text-muted-foreground hover:border-nogal/45 hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="tabular-nums">{atajo.valor}</span>
                <span>· {atajo.etiqueta}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idCampo} className="text-sm font-medium">
              Prácticas simultáneas por cuenta
            </label>
            <div className="flex items-center gap-3">
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
                className="w-28 tabular-nums"
              />
              {valido && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  = hasta{' '}
                  <strong className="font-semibold text-foreground">{numero * cuentas}</strong>{' '}
                  {numero * cuentas === 1 ? 'práctica' : 'prácticas'} simultáneas en total
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
        </div>

        <p id={`${idCampo}-ayuda`} className="text-xs text-muted-foreground">
          Sugerido: {sugerido} o {sugerido + 1}. Cada cuenta admite 10 mensajes por minuto y un
          estudiante envía unos 3.
        </p>
      </div>
    </form>
  );
}
