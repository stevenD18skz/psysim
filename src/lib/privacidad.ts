/**
 * Aceptación del aviso de privacidad, guardada en el navegador (sin cambios en la base de datos).
 * Limitación conocida: no deja constancia en el servidor y se pide de nuevo en otro navegador.
 */
export const TEXTO_AUTORIZACION_PRACTICA =
  'Leí el aviso de privacidad y acepto que el orquestador de pacientes simulados y su proveedor de IA, o Google Gemini, procesen mi conversación y que la lea mi docente.';

// Cambiar la versión vuelve a pedir autorización si cambian las condiciones del aviso.
const VERSION_AVISO = 2;
const clavePrivacidad = (cuentaId: string) =>
  `psysim:privacidad-aceptada:v${VERSION_AVISO}:${cuentaId}`;

/** Fecha ISO en que se aceptó el aviso en este navegador, o `null`. */
export function leerPrivacidadAceptada(cuentaId: string): string | null {
  try {
    const fecha = localStorage.getItem(clavePrivacidad(cuentaId));
    return fecha && Number.isFinite(Date.parse(fecha)) ? fecha : null;
  } catch {
    return null;
  }
}

export function recordarPrivacidadAceptada(cuentaId: string) {
  try {
    localStorage.setItem(clavePrivacidad(cuentaId), new Date().toISOString());
  } catch {
    // Sin almacenamiento: se volverá a pedir la próxima vez.
  }
}
