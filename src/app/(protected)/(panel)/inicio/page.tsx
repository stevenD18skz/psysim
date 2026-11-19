import { GraduationCap, KeyRound, MessageSquareText, MonitorPlay, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { IndicadorEnVivo } from '@/components/comun/indicador-en-vivo';
import { type Indicador, Indicadores } from '@/components/comun/indicadores';
import { BandejaDocente } from '@/components/inicio/bandeja-docente';
import {
  BarraSubHero,
  EncabezadoHeroTrabajo,
  type EnlaceHero,
  MarcoHeroInicio,
} from '@/components/inicio/marco-hero';
import { HeroPlataforma, PanelPlataforma } from '@/components/inicio/panel-plataforma';
import { ResumenOrquestador } from '@/components/inicio/resumen-orquestador';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { leerConfiguracionIa, obtenerMetricasIa } from '@/lib/admin/ia';
import { obtenerDocentes, obtenerTodosLosEstudiantes } from '@/lib/admin/queries';
import { requerirUsuario } from '@/lib/auth/dal';
import { RUTA_INICIO } from '@/lib/auth/routes';
import { obtenerEstudiantes } from '@/lib/estudiantes/queries';
import { estaPorRevisar } from '@/lib/sesiones/estados';
import { obtenerCodigosPendientes, obtenerSesionesDelDocente } from '@/lib/sesiones/queries';

export const metadata: Metadata = {
  title: 'Inicio',
};

const formatoNota = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

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
  const [sesiones, codigos, docentes, estudiantesPlataforma, metricasIa, estudiantesDocente] =
    await Promise.all([
      obtenerSesionesDelDocente(),
      obtenerCodigosPendientes(),
      esAdmin ? obtenerDocentes() : null,
      esAdmin ? obtenerTodosLosEstudiantes() : null,
      esAdmin ? obtenerMetricasIa(7).catch(() => null) : null,
      esAdmin ? null : obtenerEstudiantes(),
    ]);

  const ahora = new Date();
  const porRevisar = sesiones
    .filter(estaPorRevisar)
    .sort((a, b) => (a.fin ?? a.inicio).localeCompare(b.fin ?? b.inicio));
  const practicando = sesiones.filter(s => s.estado === 'en_curso');
  const primerNombre = perfil.nombre.trim().split(' ')[0] ?? perfil.nombre;
  const grupoDocente = estudiantesDocente ?? [];
  const conCuentaDocente = grupoDocente.filter(e => e.cuentaVinculada).length;
  const conBorrador = porRevisar.filter(s => s.retroalimentacion !== null).length;
  const codigosUrgentes = codigos.filter(
    c => (new Date(c.expiraEn).getTime() - ahora.getTime()) / 3_600_000 < 24
  ).length;
  const notasDocente = sesiones
    .map(s => (s.retroalimentacion?.publicada ? s.retroalimentacion.nota : null))
    .filter((n): n is number => n !== null);
  const notaMediaDocente =
    notasDocente.length > 0 ? notasDocente.reduce((a, b) => a + b, 0) / notasDocente.length : null;
  const finalizadasDocente = sesiones.filter(s => s.estado === 'finalizada').length;

  const resumen =
    porRevisar.length === 0 && practicando.length === 0
      ? esAdmin
        ? 'Así va la plataforma. Tus estudiantes no tienen nada pendiente.'
        : grupoDocente.length === 0
          ? 'Empieza registrando a tus estudiantes para asignarles prácticas.'
          : sesiones.length === 0
            ? codigos.length > 0
              ? `Tienes ${plural(codigos.length, 'código vigente', 'códigos vigentes')} esperando a tus estudiantes.`
              : `Tienes ${plural(grupoDocente.length, 'estudiante registrado', 'estudiantes registrados')}. Ya puedes asignar una práctica.`
            : `Todo al día. Tus estudiantes llevan ${plural(sesiones.length, 'práctica registrada', 'prácticas registradas')}.`
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
      icono: MessageSquareText,
      etiqueta: 'Por revisar',
      valor: porRevisar.length,
      detalle:
        conBorrador > 0
          ? `${conBorrador} en borrador`
          : porRevisar.length === 0
            ? 'Al día'
            : 'Esperan tu retroalimentación',
      tono: porRevisar.length > 0 ? 'atencion' : undefined,
      ayuda:
        'Prácticas terminadas, o con al menos 3 intervenciones del estudiante, que aún no tienen tu retroalimentación publicada.',
    },
    {
      icono: IndicadorEnVivo,
      etiqueta: 'Practicando ahora',
      valor: practicando.length,
      detalle: practicando.length === 0 ? 'Nadie en el consultorio' : 'En el consultorio',
      tono: practicando.length > 0 ? 'activo' : undefined,
      ayuda:
        'Estudiantes conversando con el paciente en este momento. La página se actualiza sola cada 30 segundos.',
    },
    {
      icono: KeyRound,
      etiqueta: 'Códigos sin usar',
      valor: codigos.length,
      detalle:
        codigosUrgentes > 0
          ? `${codigosUrgentes} ${codigosUrgentes === 1 ? 'vence' : 'vencen'} hoy`
          : codigos.length === 0
            ? 'Ninguno esperando'
            : 'Aún vigentes',
      ayuda:
        'Códigos de un solo uso que generaste y que el estudiante todavía no ha usado para empezar su práctica.',
    },
    {
      icono: UsersRound,
      etiqueta: 'Estudiantes',
      valor: grupoDocente.length,
      detalle: grupoDocente.length === 0 ? 'Sin registros aún' : `${conCuentaDocente} con cuenta`,
      ayuda:
        'Estudiantes registrados en tu grupo. Quienes ya entraron con su correo institucional pueden recibir códigos.',
    },
    {
      icono: MonitorPlay,
      etiqueta: 'Prácticas',
      valor: sesiones.length,
      detalle:
        notaMediaDocente !== null
          ? `Nota media ${formatoNota.format(notaMediaDocente)}`
          : `${finalizadasDocente} terminadas`,
      ayuda:
        'Prácticas que tus estudiantes empezaron con tus códigos y su promedio de notas publicadas.',
    },
  ];

  const bandeja = (
    <BandejaDocente
      porRevisar={porRevisar}
      practicando={practicando}
      codigos={codigos}
      sesiones={esAdmin ? undefined : sesiones}
      estudiantes={esAdmin ? undefined : grupoDocente}
      ahora={ahora}
      disposicion={esAdmin ? 'riel' : 'columnas'}
    />
  );

  if (docentes && estudiantesPlataforma) {
    const estudiantesPropios = estudiantesPlataforma.filter(e => e.docente?.id === perfil.id);
    const totalEnCursoPlataforma = docentes.reduce((s, d) => s + d.metricas.enCurso, 0);
    const configuracionIa = leerConfiguracionIa();

    return (
      <div className="@container/inicio flex flex-1 flex-col">
        <RefrescoAutomatico
          activo={practicando.length > 0 || totalEnCursoPlataforma > 0}
          segundos={30}
        />
        <HeroPlataforma textoSaludo={saludo(ahora)} primerNombre={primerNombre} resumen={resumen} />
        {/* Las tarjetas clave invaden la franja superior de nogal para anclar los dos niveles. */}
        <div className="relative z-10 mx-auto -mt-10 w-full max-w-[1400px] px-4 pb-10 sm:-mt-16 sm:px-6 sm:pb-12">
          <div className="grid items-start gap-6 @5xl/inicio:grid-cols-[minmax(0,1.55fr)_minmax(21.5rem,25.5rem)] @5xl/inicio:gap-8">
            <PanelPlataforma
              docentes={docentes}
              estudiantes={estudiantesPlataforma}
              adminId={perfil.id}
              tuGrupo={{
                estudiantesCount: estudiantesPropios.length,
                conCuenta: estudiantesPropios.filter(e => e.cuentaVinculada).length,
                porRevisar: porRevisar.length,
                conBorrador,
                practicandoAhora: practicando.length,
                totalPracticas: sesiones.length,
                finalizadas: finalizadasDocente,
                codigosSinUsar: codigos.length,
                notaMedia: notaMediaDocente,
              }}
              ahora={ahora}
            />
            <aside
              aria-label="Tu bandeja y comportamiento de la IA"
              className="flex min-w-0 flex-col gap-6"
            >
              {bandeja}
              <ResumenOrquestador configuracion={configuracionIa} metricas={metricasIa} />
            </aside>
          </div>
        </div>
      </div>
    );
  }

  const enlacesDocente: readonly EnlaceHero[] = [
    {
      href: '/sesiones',
      texto: 'Revisiones',
      contador: porRevisar.length > 0 ? porRevisar.length : undefined,
    },
    { href: '/estudiantes', texto: 'Estudiantes' },
    { href: '/configuracion/casos', texto: 'Casos' },
  ];

  const estadoGrupo =
    practicando.length > 0 ? (
      <a
        href="#practicando"
        className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-salvia/60 bg-sidebar-accent px-3 py-1 text-xs font-medium whitespace-nowrap text-sidebar-foreground transition-colors hover:border-laton/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        <IndicadorEnVivo className="size-3.5 shrink-0 text-salvia" />
        {plural(practicando.length, 'practicando ahora', 'practicando ahora')}
      </a>
    ) : porRevisar.length > 0 ? (
      <Link
        href="/sesiones"
        className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1 text-xs font-medium whitespace-nowrap text-laton-texto transition-colors hover:border-laton/60 hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        <MessageSquareText className="size-3.5 shrink-0" aria-hidden />
        {plural(porRevisar.length, 'práctica por revisar', 'prácticas por revisar')}
      </Link>
    ) : (
      <Link
        href="/estudiantes"
        className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1 text-xs font-medium whitespace-nowrap text-laton-texto transition-colors hover:border-laton/60 hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        <UsersRound className="size-3.5 shrink-0" aria-hidden />
        {plural(grupoDocente.length, 'estudiante en tu grupo', 'estudiantes en tu grupo')}
      </Link>
    );

  return (
    <div className="@container/inicio flex flex-1 flex-col">
      <RefrescoAutomatico activo={practicando.length > 0} segundos={30} />
      <MarcoHeroInicio>
        <EncabezadoHeroTrabajo
          textoSaludo={saludo(ahora)}
          primerNombre={primerNombre}
          resumen={resumen}
          etiquetaEstudiantes={
            grupoDocente.length > 0 ? 'Ver estudiantes' : 'Registrar estudiantes'
          }
        />
        <BarraSubHero
          tituloId="resumen-docente"
          titulo="Tu grupo"
          icono={GraduationCap}
          ariaNavegacion="Secciones de trabajo"
          enlaces={enlacesDocente}
          estadoDerecha={estadoGrupo}
        />
      </MarcoHeroInicio>
      {/* La franja de métricas sube sobre la madera para destacar el estado del grupo hoy. */}
      <div className="relative z-10 mx-auto -mt-10 flex w-full max-w-[1400px] flex-col gap-8 px-4 pb-10 sm:-mt-16 sm:px-6 sm:pb-12">
        <Indicadores
          indicadores={indicadoresDocente}
          className="shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)]"
        />
        {bandeja}
      </div>
    </div>
  );
}
