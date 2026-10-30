/**
 * Datos de una cuenta que la aplicación guarda en el navegador y que no deben quedar para la
 * siguiente persona que use el equipo (modo presencial o un computador compartido): las notas
 * privadas del estudiante durante la práctica y el borrador de retroalimentación del docente.
 * Las preferencias del equipo (sonido, voz, ambiente) se conservan.
 */
const PREFIJOS_DE_LA_CUENTA = ['psysim:notas:', 'psysim:borrador-retro:'] as const;

function borrarDe(almacen: Storage) {
  const claves = Array.from({ length: almacen.length }, (_, i) => almacen.key(i)).filter(
    (clave): clave is string =>
      clave !== null && PREFIJOS_DE_LA_CUENTA.some(prefijo => clave.startsWith(prefijo))
  );
  for (const clave of claves) almacen.removeItem(clave);
}

/** Borra del navegador los datos de la cuenta que cierra sesión o entrega el equipo. */
export function olvidarDatosDeLaCuenta() {
  try {
    borrarDe(window.localStorage);
    borrarDe(window.sessionStorage);
  } catch {
    // Sin acceso al almacenamiento (modo privado estricto): no hay nada que borrar.
  }
}
