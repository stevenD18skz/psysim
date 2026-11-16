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
  const [sesiones, codigos, docentes, estudiantesPlataforma, estudiantesDocente] =
    await Promise.all([
      obtenerSesionesDelDocente(),
      obtenerCodigosPendientes(),
      esAdmin ? obtenerDocentes() : null,
      esAdmin ? obtenerTodosLosEstudiantes() : null,
      esAdmin ? null : obtenerEstudiantes(),
    ]);

  const ahora = new Date();
  const porRevisar = sesiones
    .filter(estaPorRevisar)
    .sort((a, b) => (a.fin ?? a.inicio).localeCompare(b.fin ?? b.inicio));
  const practicando = sesiones.filter(s => s.estado === 'en_curso');
  const primerNombre = perfil.nombre.split(' ')[0];
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
      etiqueta: 'Estudiantes',
      valor: grupoDocente.length,
      detalle: grupoDocente.length === 0 ? 'Sin registros aún' : `${conCuentaDocente} con cuenta`,
      ayuda:
        'Estudiantes registrados en tu grupo. Quienes ya entraron con su correo institucional pueden recibir códigos.',
    },
    {
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

  return (
    <div className="@container/inicio mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
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
            <Button asChild variant="outline" size="lg">
              <Link href="/estudiantes">
                <Users aria-hidden />
                {esAdmin || grupoDocente.length > 0 ? 'Ver estudiantes' : 'Registrar estudiantes'}
              </Link>
            </Button>
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
        // La plataforma lidera; el riel personal acompaña solo cuando hay ancho suficiente.
        <div className="grid items-start gap-8 @5xl/inicio:grid-cols-[minmax(0,1.55fr)_minmax(21.5rem,25.5rem)]">
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
