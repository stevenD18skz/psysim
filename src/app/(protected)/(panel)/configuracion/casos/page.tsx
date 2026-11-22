import { ArrowRight, Plus, SearchX } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PistaFaro } from '@/components/ayuda/pista-contextual';
import { type UsoCaso } from '@/components/casos/biblioteca-casos';
import { EstadoVacioMisCasos } from '@/components/casos/estado-vacio-mis-casos';
import { SeccionesCasos } from '@/components/casos/secciones-casos';
import { BusquedaLista, QuitarFiltros, SelectorLista } from '@/components/comun/controles-lista';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { Button } from '@/components/ui/button';
import { requerirDocente } from '@/lib/auth/dal';
import { ETIQUETA_CATEGORIA, ETIQUETA_DIFICULTAD } from '@/lib/escenarios/etiquetas';
import { obtenerCatalogoEscenarios } from '@/lib/escenarios/queries';
import { coincideBusqueda, leerOpcion, leerTexto } from '@/lib/listas';
import { estaPorRevisar } from '@/lib/sesiones/estados';
import { obtenerAsignacionesPorCaso, obtenerSesionesDelDocente } from '@/lib/sesiones/queries';

export const metadata: Metadata = {
  title: 'Casos',
};

const CATEGORIAS = ['', 'clinico', 'cotidiano'] as const;
const NIVELES = ['', 'basico', 'intermedio', 'avanzado'] as const;

/**
 * Biblioteca de casos: los seis de PsySim y los que el docente creó con el constructor guiado.
 * Desde aquí se asigna un caso, se edita uno propio o se crea uno nuevo. Con muchos casos propios
 * se buscan y se filtran por categoría y nivel; cada ficha dice cuánto se ha usado.
 */
export default async function CasosPage({ searchParams }: PageProps<'/configuracion/casos'>) {
  await requerirDocente();
  const [parametros, casos, asignaciones, sesiones] = await Promise.all([
    searchParams,
    obtenerCatalogoEscenarios(),
    obtenerAsignacionesPorCaso(),
    obtenerSesionesDelDocente(),
  ]);

  const consulta = leerTexto(parametros.q);
  const categoria = leerOpcion(parametros.categoria, CATEGORIAS, '');
  const nivel = leerOpcion(parametros.nivel, NIVELES, '');
  const visibles = casos.filter(
    c =>
      (!categoria || c.categoria === categoria) &&
      (!nivel || c.dificultad === nivel) &&
      coincideBusqueda(consulta, c.titulo, c.codigo, c.npc.nombre, c.competenciaCentral)
  );
  const propios = visibles.filter(c => c.propio);
  const dePsySim = visibles.filter(c => !c.propio);
  const hayFiltros = Boolean(consulta || categoria || nivel);

  const porRevisar = new Map<string, number>();
  for (const s of sesiones.filter(estaPorRevisar)) {
    porRevisar.set(s.escenario.codigo, (porRevisar.get(s.escenario.codigo) ?? 0) + 1);
  }
  const uso: Record<string, UsoCaso> = Object.fromEntries(
    casos.map(c => [
      c.id,
      { asignaciones: asignaciones.get(c.id) ?? 0, porRevisar: porRevisar.get(c.codigo) ?? 0 },
    ])
  );
  const totalPropios = casos.filter(c => c.propio).length;
  const totalPredefinidos = casos.length - totalPropios;

  return (
    <div className="flex flex-1 flex-col">
      <EncabezadoPagina
        titulo="Casos"
        descripcion="Cada caso es un paciente con su historia y la competencia que entrena. Usa los de PsySim o crea los tuyos."
        acciones={
          <Button asChild variant="accion" size="lg">
            <Link href="/configuracion/casos/nuevo">
              <Plus aria-hidden />
              Crear caso
            </Link>
          </Button>
        }
        subbarra={
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-sidebar-muted">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span>
                <strong className="font-semibold text-sidebar-foreground tabular-nums">
                  {totalPredefinidos}
                </strong>{' '}
                predefinidos
              </span>
              <span aria-hidden className="text-sidebar-border">
                ·
              </span>
              <span>
                <strong className="font-semibold text-sidebar-foreground tabular-nums">
                  {totalPropios}
                </strong>{' '}
                {totalPropios === 1 ? 'caso propio' : 'casos propios'}
              </span>
              <PistaFaro
                id="biblioteca-casos-plantilla"
                etiqueta="Adaptar casos"
                enMadera
                titulo="Crea versiones propias sin empezar de cero"
                descripcion="Puedes partir de cualquier caso predefinido para ajustar su dificultad, perfil clínico o motivo de consulta y guardarlo en «Mis casos». Cada tarjeta muestra además cuántas veces lo has asignado."
              />
            </div>
            <Link
              href="/configuracion"
              className="inline-flex items-center gap-1.5 font-medium text-laton-texto transition-colors hover:text-lino focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-texto focus-visible:outline-solid"
            >
              Ir a Asignar práctica
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        }
      />

      <ContenedorHero className="gap-8">
        <div
          className={`grid gap-3 rounded-2xl border bg-card p-3.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end ${SOMBRA_SOBRE_NOGAL}`}
        >
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-medium text-muted-foreground">Buscar</span>
            <BusquedaLista etiqueta="Buscar caso" placeholder="Título, paciente o competencia" />
          </div>
          <SelectorLista
            etiqueta="Categoría"
            parametro="categoria"
            defecto=""
            opciones={[
              { valor: '', etiqueta: 'Todas' },
              { valor: 'clinico', etiqueta: ETIQUETA_CATEGORIA.clinico },
              { valor: 'cotidiano', etiqueta: ETIQUETA_CATEGORIA.cotidiano },
            ]}
          />
          <SelectorLista
            etiqueta="Nivel"
            parametro="nivel"
            defecto=""
            opciones={[
              { valor: '', etiqueta: 'Todos' },
              { valor: 'basico', etiqueta: ETIQUETA_DIFICULTAD.basico },
              { valor: 'intermedio', etiqueta: ETIQUETA_DIFICULTAD.intermedio },
              { valor: 'avanzado', etiqueta: ETIQUETA_DIFICULTAD.avanzado },
            ]}
          />
          <QuitarFiltros claves={['q', 'categoria', 'nivel']} />
        </div>

        {hayFiltros && visibles.length === 0 ? (
          <EstadoVacio
            icono={SearchX}
            titulo="Ningún caso coincide con los filtros"
            descripcion="Prueba con otras palabras, cambia la categoría o el nivel, o quita los filtros para volver a ver todo el catálogo."
            accion={
              <Button asChild size="sm" variant="outline">
                <Link href="/configuracion/casos">Quitar filtros</Link>
              </Button>
            }
          />
        ) : (
          <SeccionesCasos
            propios={propios}
            predefinidos={dePsySim}
            uso={uso}
            // Con «Mis casos» vacío (sin filtros) abre en los predefinidos, que es lo que hay que ver.
            inicial={totalPropios > 0 || hayFiltros ? 'propios' : 'predefinidos'}
            vacioPropios={
              totalPropios > 0 ? (
                <EstadoVacio
                  icono={SearchX}
                  titulo="Ninguno de tus casos coincide con estos filtros"
                  descripcion="Cambia el término de búsqueda o quita los filtros para ver todos tus casos propios."
                  accion={
                    <Button asChild size="sm" variant="outline">
                      <Link href="/configuracion/casos">Quitar filtros</Link>
                    </Button>
                  }
                />
              ) : (
                <EstadoVacioMisCasos contexto="biblioteca" />
              )
            }
          />
        )}
      </ContenedorHero>
    </div>
  );
}
