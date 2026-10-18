/**
 * Aceptación del aviso de privacidad, guardada en el navegador (sin cambios en la base de datos).
 * Limitación conocida: no deja constancia en el servidor y se pide de nuevo en otro navegador.
 */
const CLAVE_PRIVACIDAD = 'psysim:privacidad-aceptada';

/** Fecha ISO en que se aceptó el aviso en este navegador, o `null`. */
export function leerPrivacidadAceptada(): string | null {
  try {
    return localStorage.getItem(CLAVE_PRIVACIDAD);
  } catch {
    return null;
  }
}

export function recordarPrivacidadAceptada() {
  try {
    localStorage.setItem(CLAVE_PRIVACIDAD, new Date().toISOString());
  } catch {
    // Sin almacenamiento: se volverá a pedir la próxima vez.
  }
}
