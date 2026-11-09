/**
 * Datos de una cuenta que la aplicación guarda en el navegador y que no deben quedar para la
 * siguiente persona que use el equipo (modo presencial o un computador compartido): las notas
 * privadas del estudiante durante la práctica, los borradores del docente (retroalimentación y
 * casos, que llevan lo que guarda el paciente) y los consentimientos: el aviso de privacidad y el
 * dictado los acepta cada persona, no el equipo. Se compara por prefijo, así que una clave exacta
 * también sirve. Las preferencias del equipo (sonido, voz, ambiente) se conservan.
 */
const PREFIJOS_DE_LA_CUENTA = [
  'psysim:notas:',
  'psysim:borrador-retro:',
  'psysim:borrador-caso:',
  'psysim:privacidad-aceptada',
  'psysim:dictado-aceptado',
  'psysim:guia-sesion-vista',
] as const;

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
