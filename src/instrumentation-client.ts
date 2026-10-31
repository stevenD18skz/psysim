import { z } from 'zod';

/**
 * Zod 4 compila sus esquemas con `new Function` para validar más rápido; si la política de
 * contenido (CSP) no permite `eval`, la prueba falla (con un reintento seguro) pero el navegador la
 * registra como una violación. En el navegador se desactiva esa compilación: los formularios
 * validan pocos campos y no la necesitan. En el servidor no hay CSP y sigue activa.
 *
 * Va aquí, y no en un componente, porque debe correr antes del primer esquema: Zod hace la prueba
 * al crearlo, y el orden en que cargan los módulos del árbol de React no está garantizado.
 */
z.config({ jitless: true });
