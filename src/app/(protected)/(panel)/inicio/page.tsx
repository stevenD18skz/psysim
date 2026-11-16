import { ClipboardList, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { type Indicador, Indicadores } from '@/components/comun/indicadores';
import { BandejaDocente } from '@/components/inicio/bandeja-docente';
import { PanelPlataforma } from '@/components/inicio/panel-plataforma';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { Button } from '@/components/ui/button';
import { obtenerDocentes, obtenerTodosLosEstudiantes } from '@/lib/admin/queries';
import { requerirUsuario } from '@/lib/auth/dal';
import { RUTA_INICIO } from '@/lib/auth/routes';
import { estaPorRevisar } from '@/lib/sesiones/estados';
import { obtenerCodigosPendientes, obtenerSesionesDelDocente } from '@/lib/sesiones/queries';

export const metadata: Metadata = {
  title: 'Inicio',
};

const formatoHoraDelDia = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: 'America/Bogota',
});

function saludo(ahora: Date): string {
  const hora = Number(formatoHoraDelDia.format(ahora));
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

/**
 * Lo primero que se ve al entrar responde «¿qué tengo que hacer hoy?». El docente ve su bandeja:
 * prácticas por revisar, quién practica ahora y los códigos sin usar. El Administrador ve primero
 * la plataforma completa y, al lado, la misma bandeja de sus propios estudiantes.
 */
export default async function InicioPage() {
  const perfil = await requerirUsuario();
  if (perfil.rol === 'estudiante') redirect(RUTA_INICIO.estudiante);

  const esAdmin = perfil.rol === 'superadmin';
  const [sesiones, codigos, docentes, estudiantesPlataforma] = await Promise.all([
    obtenerSesionesDelDocente(),
    obtenerCodigosPendientes(),
    esAdmin ? obtenerDocentes() : null,
    esAdmin ? obtenerTodosLosEstudiantes() : null,
  ]);

  const ahora = new Date();
  const porRevisar = sesiones
    .filter(estaPorRevisar)
    .sort((a, b) => (a.fin ?? a.inicio).localeCompare(b.fin ?? b.inicio));
  const practicando = sesiones.filter(s => s.estado === 'en_curso');
  const primerNombre = perfil.nombre.split(' ')[0];

  const resumen =
    porRevisar.length === 0 && practicando.length === 0
      ? esAdmin
        ? 'Así va la plataforma. Tus estudiantes no tienen nada pendiente.'
        : 'No tienes nada pendiente por ahora.'
      : [
          porRevisar.length > 0 &&
            `Tienes ${plural(porRevisar.length, 'práctica', 'prácticas')} por revisar`,
          practicando.length > 0 &&
            `${plural(practicando.length, 'estudiante practica', 'estudiantes practican')} ahora`,
        ]
          .filter(Boolean)
          .join(' y ') + '.';

  const indicadoresDocente: Indicador[] = [
    {
      etiqueta: 'Por revisar',
      valor: porRevisar.length,
      detalle: porRevisar.length === 0 ? 'Al día' : 'Esperan tu retroalimentación',
      tono: porRevisar.length > 0 ? 'atencion' : undefined,
      ayuda:
        'Prácticas terminadas, o con al menos 3 intervenciones del estudiante, que aún no tienen tu retroalimentación publicada.',
    },
    {
      etiqueta: 'Practicando ahora',
      valor: practicando.length,
      detalle: practicando.length === 0 ? 'Nadie en el consultorio' : 'En el consultorio',
      tono: practicando.length > 0 ? 'activo' : undefined,
      ayuda:
        'Estudiantes conversando con el paciente en este momento. La página se actualiza sola cada 30 segundos.',
    },
    {
      etiqueta: 'Códigos sin usar',
      valor: codigos.length,
      detalle: codigos.length === 0 ? 'Ninguno esperando' : 'Aún vigentes',
      ayuda:
        'Códigos de un solo uso que generaste y que el estudiante todavía no ha usado para empezar su práctica.',
    },
    {
      etiqueta: 'Prácticas',
      valor: sesiones.length,
      detalle: `${sesiones.filter(s => s.estado === 'finalizada').length} terminadas`,
      ayuda: 'Prácticas que tus estudiantes empezaron con tus códigos.',
    },
  ];

  const bandeja = (
    <BandejaDocente
      porRevisar={porRevisar}
      practicando={practicando}
      codigos={codigos}
      ahora={ahora}
      disposicion={esAdmin ? 'riel' : 'columnas'}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <RefrescoAutomatico activo={practicando.length > 0} segundos={30} />

      <header className="@container">
        <div className="flex flex-col gap-5 @2xl:flex-row @2xl:items-end @2xl:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-3xl leading-[1.05] font-bold tracking-[-0.025em] sm:text-[2.6rem]">
              {saludo(ahora)}, {primerNombre}
            </h1>
            <p className="text-lg text-muted-foreground">{resumen}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {esAdmin && (
              <Button asChild variant="outline" size="lg">
                <Link href="/estudiantes">
                  <Users aria-hidden />
                  Ver estudiantes
                </Link>
              </Button>
            )}
            <Button asChild variant="accion" size="lg">
              <Link href="/configuracion">
                <ClipboardList aria-hidden />
                Asignar práctica
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {docentes && estudiantesPlataforma ? (
        // La plataforma es el contenido principal; la bandeja propia la acompaña a la derecha.
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,23rem)]">
          <PanelPlataforma docentes={docentes} estudiantes={estudiantesPlataforma} ahora={ahora} />
          {bandeja}
        </div>
      ) : (
        <>
          <Indicadores indicadores={indicadoresDocente} />
          {bandeja}
        </>
      )}
    </div>
  );
}
