'use client';

import { z } from 'zod';

/**
 * Zod 4 compila sus esquemas con `new Function` para validar más rápido; si la política de
 * contenido (CSP) no permite `eval`, la prueba falla (con un reintento seguro) pero el navegador la
 * registra como una violación. En el navegador se desactiva esa compilación: los formularios
 * validan pocos campos y no la necesitan. En el servidor no hay CSP y sigue activa.
 */
z.config({ jitless: true });

/** Sin interfaz: existe para que este módulo se cargue en el navegador antes que los formularios. */
export function ConfigurarZod() {
  return null;
}
