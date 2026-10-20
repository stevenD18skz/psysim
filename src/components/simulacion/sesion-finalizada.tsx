'use client';

import { Check, CheckCircle2, Copy, Hourglass, Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { useCerrarSesionCompartida } from '@/components/layout/use-cerrar-sesion-compartida';
import { type MotivoCierre } from '@/components/simulacion/use-finalizar-sesion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEquipoCompartido } from '@/hooks/use-equipo-compartido';
import { formatearDuracion, type ResumenSesion } from '@/lib/conversacion/resumen';
import { useAppStore } from '@/store/app-store-provider';
import { type SesionActiva } from '@/types';

const QUE_SIGUE = [
  'Tu docente lee la conversación.',
  'Comenta frases concretas y publica una retroalimentación con nota.',
  'La verás en Mis prácticas. No enviamos avisos: vuelve a revisar.',
];

/**
 * Cierre de la práctica: reconoce el esfuerzo con calma y dice qué sigue, sin métricas técnicas.
 * Tres variantes: terminada por el estudiante, cerrada por inactividad y cerrada antes de empezar
 * (en ese caso el código ya se usó y se ofrece un mensaje para pedir uno nuevo). La reflexión es
 * solo para el estudiante: no se guarda. En el computador del docente (modo presencial), la acción
 * principal es cerrar la sesión, para que el siguiente no vea sus prácticas.
 */
export function SesionFinalizada({
  resumen,
  sesion,
  motivo = 'finalizada',
}: {
  resumen: ResumenSesion;
  sesion: SesionActiva;
  motivo?: MotivoCierre;
}) {
  const router = useRouter();
  const limpiarSesion = useAppStore(state => state.sesion.limpiar);
  const [navegando, startTransition] = useTransition();
  const [copiado, setCopiado] = useState(false);
  const idReflexion = useId();
  const compartido = useEquipoCompartido();
  const { salir, cerrando } = useCerrarSesionCompartida();

  const sinEmpezar = motivo === 'inactividad' && resumen.intervenciones === 0;
  const porInactividad = motivo === 'inactividad';

  const ir = (ruta: '/practicas' | `/practicas/${string}`) =>
    startTransition(() => {
      limpiarSesion();
      router.push(ruta);
    });

  const titulo = sinEmpezar
    ? 'La práctica se cerró antes de empezar'
    : porInactividad
      ? 'La práctica se cerró por inactividad'
      : 'Práctica terminada';
  const texto = sinEmpezar
    ? 'Pasaron 10 minutos sin actividad. El código ya se usó: pídele uno nuevo a tu docente.'
    : porInactividad
      ? 'Pasaron 10 minutos sin actividad. Tu docente revisará lo que alcanzaste a conversar.'
      : 'Ahora le toca a tu docente.';

  const copiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(
        `Hola. Mi práctica en PsySim («${sesion.escenario.titulo}») se cerró por inactividad antes de empezar. ¿Sería posible recibir un código nuevo? Gracias.`
      );
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[55] flex animate-in items-center justify-center overflow-y-auto bg-nogal/60 p-4 backdrop-blur-sm fade-in-0 sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sesion-finalizada-titulo"
        className="my-auto flex w-full max-w-lg flex-col gap-6 rounded-2xl border bg-card p-6 shadow-[0_24px_64px_-16px_rgb(29_20_14/0.5)] sm:p-8"
      >
        <div className="flex flex-col gap-3">
          <span
            className={
              porInactividad
                ? 'flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground'
                : 'flex size-12 items-center justify-center rounded-full bg-salvia-suave text-salvia-oscuro'
            }
          >
            {porInactividad ? (
              <Hourglass className="size-6" aria-hidden />
            ) : (
              <CheckCircle2 className="size-6" aria-hidden />
            )}
          </span>
          <h2
            id="sesion-finalizada-titulo"
            className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em]"
          >
            {titulo}
          </h2>
          <p className="text-lg text-muted-foreground">{texto}</p>
          {!sinEmpezar && (
            <p className="text-sm text-muted-foreground">
              <CodigoCaso codigo={sesion.escenario.codigo} className="font-mono text-xs" />{' '}
              {sesion.escenario.titulo} · {formatearDuracion(resumen.duracionSegundos)} ·{' '}
              {resumen.intervenciones === 1
                ? '1 intervención'
                : `${resumen.intervenciones} intervenciones`}
            </p>
          )}
        </div>

        {!sinEmpezar && (
          <>
            <section aria-labelledby="que-sigue" className="flex flex-col gap-3">
              <h3 id="que-sigue" className="text-sm font-bold">
                Qué pasa ahora
              </h3>
              <ol className="flex flex-col gap-2.5">
                {QUE_SIGUE.map((paso, i) => (
                  <li key={paso} className="flex gap-3 text-sm leading-relaxed">
                    <span
                      aria-hidden
                      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-nogal text-xs font-bold text-lino"
                    >
                      {i + 1}
                    </span>
                    {paso}
                  </li>
                ))}
              </ol>
            </section>

            <section
              aria-labelledby={`${idReflexion}-titulo`}
              className="flex flex-col gap-2 rounded-xl bg-salvia-suave p-4"
            >
              <h3 id={`${idReflexion}-titulo`} className="text-sm font-bold text-salvia-oscuro">
                Para ti, mientras esperas
              </h3>
              <ul className="flex flex-col gap-1 text-sm">
                <li>¿Qué momento de la conversación sentiste que funcionó?</li>
                <li>¿Qué harías distinto la próxima vez?</li>
              </ul>
              <label htmlFor={idReflexion} className="sr-only">
                Tus notas (opcional)
              </label>
              <Textarea
                id={idReflexion}
                placeholder="Tus notas (opcional)"
                className="min-h-20 bg-card"
                aria-describedby={`${idReflexion}-aviso`}
              />
              <p id={`${idReflexion}-aviso`} className="text-xs text-salvia-oscuro">
                Esto no se guarda ni lo ve tu docente. Es solo para ti.
              </p>
            </section>
          </>
        )}

        {compartido && (
          <p className="rounded-xl border border-laton/50 bg-laton/10 px-4 py-3 text-sm leading-relaxed">
            Estás en el computador de tu docente. Cierra tu sesión antes de entregarlo: así nadie
            más ve tus prácticas.
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {sinEmpezar ? (
            <Button variant="outline" size="lg" onClick={copiarMensaje}>
              {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copiado ? 'Mensaje copiado' : 'Copiar mensaje para mi docente'}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={() => ir(`/practicas/${sesion.id}`)}
              disabled={navegando}
            >
              Releer la conversación
            </Button>
          )}
          {compartido ? (
            <Button
              variant="accion"
              size="lg"
              onClick={salir}
              disabled={navegando || cerrando}
              autoFocus
            >
              {cerrando ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
              Cerrar sesión en este equipo
            </Button>
          ) : (
            <Button
              variant="accion"
              size="lg"
              onClick={() => ir('/practicas')}
              disabled={navegando}
              autoFocus
            >
              Ir a Mis prácticas
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
