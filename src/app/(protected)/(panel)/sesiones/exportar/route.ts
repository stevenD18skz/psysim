import { obtenerSesionUsuario } from '@/lib/auth/dal';
import { ROLES_DOCENTE } from '@/lib/auth/routes';
import { IDS_PERIODO, leerOpcion, leerTexto } from '@/lib/listas';
import { obtenerSesionesDelDocente } from '@/lib/sesiones/queries';
import {
  filtrarRevisiones,
  IDS_ORDEN,
  IDS_VISTA,
  ordenarRevisiones,
  ordenPorDefecto,
  revisionesCsv,
} from '@/lib/sesiones/revisiones';

/**
 * Exporta a CSV las prácticas del docente con los mismos filtros y el mismo orden que la página
 * de revisiones (los parámetros de la URL), para llevar las notas al sistema de la universidad.
 * RLS garantiza que solo salen las prácticas de sus estudiantes.
 */
export async function GET(request: Request): Promise<Response> {
  const usuario = await obtenerSesionUsuario();
  if (usuario.estado !== 'autorizado' || !ROLES_DOCENTE.includes(usuario.perfil.rol)) {
    return new Response('No tienes permiso para exportar estas prácticas.', { status: 403 });
  }

  const parametros = new URL(request.url).searchParams;
  const leer = (clave: string) => parametros.get(clave) ?? undefined;
  const vista = leerOpcion(leer('vista'), IDS_VISTA, 'pendientes');
  const orden = leerOpcion(leer('orden'), IDS_ORDEN, ordenPorDefecto(vista));

  const sesiones = await obtenerSesionesDelDocente();
  const filtradas = ordenarRevisiones(
    filtrarRevisiones(sesiones, {
      vista,
      consulta: leerTexto(leer('q')),
      caso: leerTexto(leer('caso')),
      periodo: leerOpcion(leer('periodo'), IDS_PERIODO, 'todo'),
    }),
    orden
  );

  const hoy = new Date().toISOString().slice(0, 10);
  return new Response(revisionesCsv(filtradas), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="practicas-${vista}-${hoy}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
