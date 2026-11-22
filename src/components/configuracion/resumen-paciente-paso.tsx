'use client';

import { CopyPlus, MessagesSquare, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

import { IndicadorNivel } from '@/components/casos/insignias-caso';
import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { Button } from '@/components/ui/button';
import { type AjustesPractica, AJUSTES_VACIOS } from '@/lib/casos/ajustes';
import { ETIQUETA_DIFICULTAD } from '@/lib/escenarios/etiquetas';
import { type DificultadEscenario, type EscenarioCatalogo } from '@/types';

const DESCRIPCION_NIVEL: Record<DificultadEscenario, string> = {
  basico: 'Accesible para primeras prácticas; conversa con disposición.',
  intermedio: 'Pide validar emociones y generar confianza antes de abrirse.',
  avanzado: 'Mayor cautela o resistencia; pone a prueba el encuadre.',
};

interface ResumenPacientePasoProps {
  escenario: EscenarioCatalogo;
  deshabilitado: boolean;
  onAbrirAjustes: () => void;
  onAplicarAtajo: (ajustes: AjustesPractica) => void;
}

/**
 * Bloque derecho del Paso 2 cuando el paciente conserva su comportamiento original: resume el
 * nivel de exigencia del caso, ofrece atajos de un clic para hacerlo más accesible o más retador
 * hoy, permite abrir el panel completo de ajustes o crear un caso propio a partir de este.
 */
export function ResumenPacientePaso({
  escenario,
  deshabilitado,
  onAbrirAjustes,
  onAplicarAtajo,
}: ResumenPacientePasoProps) {
  const primerNombre = escenario.npc.nombre.split(' ')[0];

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl border bg-card motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-salida motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/35 px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="flex items-center gap-2 text-base font-bold tracking-[-0.01em]">
              <SlidersHorizontal className="size-4 text-salvia" aria-hidden />
              {primerNombre} se comportará como describe el caso
            </h3>
            <AyudaContextual
              etiqueta="Cómo funciona el comportamiento del paciente"
              texto="No necesitas configurar nada si el caso ya te sirve como está. Si quieres variar su exigencia para este estudiante, usa un atajo rápido o abre los ajustes."
            />
          </div>
          <p className="text-sm text-muted-foreground">
            El caso ya está listo para asignar; personalizarlo es opcional.
          </p>
        </div>
        <span className="rounded-full bg-salvia-suave px-2.5 py-0.5 text-xs font-semibold text-salvia-oscuro">
          Comportamiento original
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-xl border bg-muted/20 p-3.5">
            <dt className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Exigencia del caso</span>
              <IndicadorNivel dificultad={escenario.dificultad} soloBarras />
            </dt>
            <dd className="text-sm font-bold">
              Nivel {ETIQUETA_DIFICULTAD[escenario.dificultad].toLowerCase()}
            </dd>
            <dd className="text-xs leading-snug text-muted-foreground">
              {DESCRIPCION_NIVEL[escenario.dificultad]}
            </dd>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border bg-muted/20 p-3.5">
            <dt className="text-xs font-medium text-muted-foreground">Apertura inicial</dt>
            <dd className="flex items-center gap-1.5 text-sm font-bold">
              <MessagesSquare className="size-4 shrink-0 text-salvia" aria-hidden />
              Según el trato recibido
            </dd>
            <dd className="text-xs leading-snug text-muted-foreground">
              Responde al vínculo y cuenta su historia poco a poco, sin soltar todo de entrada.
            </dd>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border bg-muted/20 p-3.5">
            <dt className="text-xs font-medium text-muted-foreground">Alcance de los ajustes</dt>
            <dd className="flex items-center gap-1.5 text-sm font-bold">
              <ShieldCheck className="size-4 text-salvia" aria-hidden />
              Solo esta práctica
            </dd>
            <dd className="text-xs leading-snug text-muted-foreground">
              Cualquier cambio vale solo para este código, salvo que lo guardes como un caso tuyo.
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-input/70 bg-lino/45 p-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-foreground">
              ¿Quieres adaptar a {primerNombre} para esta práctica?
            </p>
            <p className="text-xs text-muted-foreground">
              Elige un ajuste rápido de dificultad o abre todos los controles para añadir una
              actitud, algo que guarde en secreto o una indicación con tus palabras.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="default"
              className="min-h-11 sm:min-h-9"
              onClick={onAbrirAjustes}
              disabled={deshabilitado}
            >
              <SlidersHorizontal aria-hidden />
              Ajustar para esta práctica
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              disabled={deshabilitado}
              onClick={() =>
                onAplicarAtajo({
                  ...AJUSTES_VACIOS,
                  apertura: 'mas-abierto',
                  intensidad: 'mas-suave',
                })
              }
            >
              Hacerlo más accesible hoy
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              disabled={deshabilitado}
              onClick={() =>
                onAplicarAtajo({
                  ...AJUSTES_VACIOS,
                  apertura: 'mas-reservado',
                  intensidad: 'mas-intenso',
                  actitudes: ['evasivo'],
                })
              }
            >
              Hacerlo más retador hoy
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/25 px-5 py-3.5">
        <p className="text-xs text-muted-foreground">
          ¿Prefieres crear un caso propio (o el mismo con otro nivel de dificultad) a partir de
          este?
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/configuracion/casos/nuevo?desde=${escenario.id}`}>
            <CopyPlus aria-hidden />
            Crear caso a partir de este
          </Link>
        </Button>
      </div>
    </div>
  );
}
