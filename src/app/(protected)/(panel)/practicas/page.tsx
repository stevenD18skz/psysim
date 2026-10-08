import { ArrowRight, MonitorPlay, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { FormularioCodigo } from '@/components/practicas/formulario-codigo';
import { ListaSesiones } from '@/components/sesiones/lista-sesiones';
import { Button } from '@/components/ui/button';
import { requerirEstudiante } from '@/lib/auth/dal';
import { formatearNota } from '@/lib/estudiantes/estudiantes';
import { obtenerPracticas } from '@/lib/sesiones/queries';

export const metadata: Metadata = {
  title: 'Mis prácticas',
};

/**
 * Panel del estudiante: entra a la simulación con el código que le envió su docente, retoma la
 * que tenga en curso y revisa sus prácticas anteriores con la retroalimentación publicada.
 */
export default async function PracticasPage() {
  const perfil = await requerirEstudiante();
  const practicas = await obtenerPracticas();

  const enCurso = practicas.find(p => p.estado === 'en_curso');
  const notas = practicas.flatMap(p =>
    p.retroalimentacion?.publicada && p.retroalimentacion.nota !== null
      ? [p.retroalimentacion.nota]
      : []
  );
  const promedio = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  const primerNombre = perfil.nombre.split(' ')[0];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Práctica</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Mis prácticas</h1>
        <p className="max-w-2xl text-muted-foreground">
          Hola, {primerNombre}. Escribe el código que te envió tu docente para entrar a la
          simulación. Al terminar, aquí verás tu conversación y su retroalimentación.
        </p>
      </header>

      {enCurso && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center">
          <MonitorPlay className="size-6 shrink-0 text-primary" aria-hidden />
          <div className="flex-1">
            <p className="font-medium">Tienes una simulación en curso</p>
            <p className="text-sm text-muted-foreground">
              {enCurso.escenario.titulo}: continúa donde la dejaste.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href={`/simulacion?sesion=${enCurso.id}`}>
              Continuar
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      )}

      <section
        aria-labelledby="unirse-titulo"
        className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:p-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id="unirse-titulo" className="text-xl font-semibold tracking-tight">
            Unirse a una simulación
          </h2>
          <p className="text-sm text-muted-foreground">
            El código tiene 10 letras (p. ej. abc-defg-hij) y solo funciona con tu cuenta.
          </p>
        </div>
        <FormularioCodigo />
      </section>

      <section aria-labelledby="historial-titulo" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <h2 id="historial-titulo" className="text-xl font-semibold tracking-tight">
            Historial
          </h2>
          {promedio !== null && (
            <p className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="size-4 text-primary" aria-hidden />
              Nota promedio:{' '}
              <span className="font-heading text-lg font-semibold text-foreground tabular-nums">
                {formatearNota(Math.round(promedio * 10) / 10)}
              </span>
            </p>
          )}
        </div>
        <ListaSesiones
          sesiones={practicas}
          para="estudiante"
          enlace={sesion =>
            sesion.estado === 'en_curso'
              ? `/simulacion?sesion=${sesion.id}`
              : `/practicas/${sesion.id}`
          }
          vacio="Aún no has hecho ninguna simulación. Cuando uses un código, aparecerá aquí."
        />
      </section>
    </div>
  );
}
