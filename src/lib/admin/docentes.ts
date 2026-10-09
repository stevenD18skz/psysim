import { normalizarTexto } from '@/lib/estudiantes/estudiantes';
import { type DocenteAdmin } from '@/types';

export type FiltroEstadoDocente = 'todos' | 'activos' | 'desactivados';

/**
 * Cuentas que coinciden con lo escrito (cada palabra en el nombre, el correo o el código, sin
 * importar tildes) y con el filtro de estado.
 */
export function filtrarDocentes(
  docentes: readonly DocenteAdmin[],
  termino: string,
  estado: FiltroEstadoDocente = 'todos'
): DocenteAdmin[] {
  const palabras = normalizarTexto(termino).split(' ').filter(Boolean);
  return docentes.filter(docente => {
    if (estado === 'activos' && !docente.activo) return false;
    if (estado === 'desactivados' && docente.activo) return false;
    const texto = normalizarTexto(
      `${docente.nombre} ${docente.correo} ${docente.codigoInstitucional}`
    );
    return palabras.every(palabra => texto.includes(palabra));
  });
}

/** Cómo entra la cuenta, en palabras del Administrador. */
export function describirAcceso(
  docente: Pick<DocenteAdmin, 'conGoogle' | 'contrasenaTemporal' | 'ultimoAcceso'>
): string {
  if (!docente.ultimoAcceso) {
    return docente.contrasenaTemporal ? 'Aún no entra · contraseña temporal' : 'Aún no ha entrado';
  }
  if (docente.contrasenaTemporal) return 'Contraseña temporal sin cambiar';
  return docente.conGoogle ? 'Con Google' : 'Con contraseña';
}
