'use client';

import { ChevronDown, CopyPlus, Lightbulb, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';

import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { Button } from '@/components/ui/button';
import { EJEMPLOS_CASO, type EjemploCaso } from '@/lib/casos/ejemplos';
import { ETIQUETA_DIFICULTAD } from '@/lib/escenarios/etiquetas';
import { cn } from '@/lib/utils';
import { type DificultadEscenario, type EscenarioCatalogo } from '@/types';

const NIVELES: readonly DificultadEscenario[] = ['basico', 'intermedio', 'avanzado'];

interface SelectorPlantillaCasoProps {
  /** Catálogo completo (oficiales y propios del docente) para partir de un caso previo. */
  catalogo?: EscenarioCatalogo[];
  /** Caso del que se partió inicialmente (p. ej. desde `?desde=<id>`). */
  casoOrigenInicial?: EscenarioCatalogo | null;
  /** Nivel actual seleccionado en el formulario. */
  dificultadActual?: DificultadEscenario;
  /** Si el formulario aún está en blanco, muestra también los ejemplos rápidos. */
  mostrarEjemplos: boolean;
  deshabilitado?: boolean;
  onElegirEjemplo: (ejemplo: EjemploCaso) => void;
  onCargarCasoBase: (caso: EscenarioCatalogo, nivel?: DificultadEscenario) => void;
  onAdaptarNivel: (nivel: DificultadEscenario, tituloBase?: string) => void;
}

/**
 * Permite al docente crear un caso nuevo a partir de un caso previo (predefinido de PsySim o uno
 * de sus propios casos) y variar su nivel de dificultad con un clic, o empezar desde un ejemplo.
 */
export function SelectorPlantillaCaso({
  catalogo = [],
  casoOrigenInicial = null,
  dificultadActual = 'basico',
  mostrarEjemplos,
  deshabilitado = false,
  onElegirEjemplo,
  onCargarCasoBase,
  onAdaptarNivel,
}: SelectorPlantillaCasoProps) {
  const idSelectCaso = useId();
  const [casoActivo, setCasoActivo] = useState<EscenarioCatalogo | null>(casoOrigenInicial);
  const [idElegido, setIdElegido] = useState<string>(casoOrigenInicial?.id ?? '');

  const propios = catalogo.filter(c => c.propio);
  const oficiales = catalogo.filter(c => !c.propio);
  const hayCatalogo = catalogo.length > 0;

  if (!mostrarEjemplos && !hayCatalogo && !casoActivo) return null;

  const seleccionarCasoDelCatalogo = (id: string) => {
    setIdElegido(id);
    const encontrado = catalogo.find(c => c.id === id) ?? null;
    if (!encontrado) return;
    setCasoActivo(encontrado);
    onCargarCasoBase(encontrado);
  };

  return (
    <section
      aria-labelledby="plantilla-caso-titulo"
      className="flex flex-col gap-4 rounded-2xl border border-salvia/45 bg-salvia-suave/30 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-salvia-suave text-salvia-oscuro">
            {hayCatalogo || casoActivo ? (
              <CopyPlus className="size-5" aria-hidden />
            ) : (
              <Lightbulb className="size-5" aria-hidden />
            )}
          </span>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <h2 id="plantilla-caso-titulo" className="text-base font-semibold">
                {casoActivo
                  ? `Basado en «${casoActivo.titulo}»`
                  : hayCatalogo
                    ? 'Crear caso a partir de otro o desde un ejemplo'
                    : '¿Primera vez? Empieza desde un ejemplo'}
              </h2>
              <AyudaContextual
                etiqueta="Cómo funciona Crear caso a partir de otro"
                texto="Elige cualquier caso predefinido de PsySim o uno que ya hayas creado. Cargaremos a su paciente en el constructor y podrás cambiarle el nivel de dificultad o la actitud sin empezar de cero."
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {casoActivo
                ? 'Puedes mantener la historia del paciente y cambiar su nivel de exigencia con un clic, o ajustar cada campo abajo.'
                : 'Llenamos todos los campos con un caso completo; luego cambias lo que quieras. No necesitas saber escribir instrucciones para una IA.'}
            </p>
          </div>
        </div>
      </div>

      {hayCatalogo && (
        <div className="grid gap-3 rounded-xl border bg-card p-3.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor={idSelectCaso} className="text-xs font-medium text-muted-foreground">
              Crear caso a partir de
            </label>
            <div className="relative">
              <select
                id={idSelectCaso}
                value={idElegido}
                disabled={deshabilitado}
                onChange={e => seleccionarCasoDelCatalogo(e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-[10px] border border-input bg-card pr-9 pl-3.5 text-sm font-medium shadow-[0_1px_2px_rgb(58_36_24/0.06)] outline-hidden transition-[border-color,box-shadow] hover:border-nogal/45 focus-visible:border-ring focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-50"
              >
                <option value="">Elige un caso predefinido o uno de tus casos…</option>
                {propios.length > 0 && (
                  <optgroup label="Mis casos">
                    {propios.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.titulo} — {c.npc.nombre} ({ETIQUETA_DIFICULTAD[c.dificultad]})
                      </option>
                    ))}
                  </optgroup>
                )}
                {oficiales.length > 0 && (
                  <optgroup label="Casos predefinidos de PsySim">
                    {oficiales.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.codigo} · {c.titulo} — {c.npc.nombre} (
                        {ETIQUETA_DIFICULTAD[c.dificultad]})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-salvia" aria-hidden />
              Adaptar actitud al nivel
            </span>
            <div
              role="group"
              aria-label="Adaptar nivel del caso"
              className="grid grid-cols-3 gap-1.5"
            >
              {NIVELES.map(nivel => {
                const activo = dificultadActual === nivel;
                return (
                  <button
                    key={nivel}
                    type="button"
                    disabled={deshabilitado}
                    onClick={() => onAdaptarNivel(nivel, casoActivo?.titulo)}
                    className={cn(
                      'flex h-10 items-center justify-center rounded-[10px] border px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-50',
                      activo
                        ? 'border-nogal bg-nogal text-lino'
                        : 'bg-card text-foreground hover:border-nogal/45 hover:bg-muted/70'
                    )}
                  >
                    {ETIQUETA_DIFICULTAD[nivel]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!hayCatalogo && casoActivo && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
          <span className="text-sm font-medium">Variar dificultad de «{casoActivo.titulo}»:</span>
          <div role="group" aria-label="Adaptar nivel del caso" className="flex flex-wrap gap-1.5">
            {NIVELES.map(nivel => {
              const activo = dificultadActual === nivel;
              return (
                <button
                  key={nivel}
                  type="button"
                  disabled={deshabilitado}
                  onClick={() => onAdaptarNivel(nivel, casoActivo.titulo)}
                  className={cn(
                    'flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-50',
                    activo
                      ? 'border-nogal bg-nogal text-lino'
                      : 'bg-card text-foreground hover:border-nogal/45 hover:bg-muted/70'
                  )}
                >
                  Nivel {ETIQUETA_DIFICULTAD[nivel].toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mostrarEjemplos && (
        <div className="flex flex-col gap-2">
          {hayCatalogo && (
            <span className="text-xs font-medium text-muted-foreground">
              O prueba con una plantilla rápida:
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            {EJEMPLOS_CASO.map(ejemplo => (
              <Button
                key={ejemplo.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto flex-col items-start gap-0 bg-card py-1.5"
                onClick={() => onElegirEjemplo(ejemplo)}
                disabled={deshabilitado}
              >
                <span>{ejemplo.etiqueta}</span>
                <span className="text-xs font-normal text-muted-foreground">{ejemplo.detalle}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
