# Reglas y estándares de calidad: qué se aplica en PsySim

Mapa de los catálogos de reglas que existen para cada apartado de una aplicación como esta, y de
cuáles se auditaron e implementaron. Sirve para el capítulo de calidad del trabajo de grado y para
saber qué falta.

Los nombres y los identificadores de cada catálogo son de conocimiento general; confírmalos en la
fuente oficial antes de citarlos. Fecha de este estado: 25 de octubre de 2026.

Leyenda de la columna **Implementado**: ✅ auditado y aplicado, con tests · 🟡 parcial · ⏳ no
auditado todavía.

## 1. Reglas de interfaz y experiencia

| Apartado                  | Reglas                                                                                                          | Por qué le importa a PsySim                             | Implementado                                                                                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Accesibilidad**         | WCAG 2.2 (contraste, nombre accesible, objetivos táctiles, foco, reflujo)                                       | Estudiantes y docentes con necesidades distintas        | ✅ Contraste AA en ambos temas, axe-core, teclado, tres anchos, objetivos ≥ 24 px. [`docs/auditoria-ux.md`](auditoria-ux.md), [`docs/pruebas/sprint-5.md`](pruebas/sprint-5.md)                                                       |
| **UX (leyes)**            | Hick, Fitts, Jakob, Miller, Tesler, Doherty, Postel, Zeigarnik, Peak-End, Von Restorff…                         | Carga de decisión en la simulación y en los formularios | ✅ Revisadas pantalla por pantalla; 9 correcciones. [`docs/auditoria-ux.md`](auditoria-ux.md)                                                                                                                                         |
| **UX (heurísticas)**      | 10 heurísticas de Nielsen, 8 reglas de Shneiderman, principios de Norman                                        | Estados, errores y control del usuario                  | ✅ Recorrido cognitivo de las tareas principales. [`docs/auditoria-ux.md`](auditoria-ux.md)                                                                                                                                           |
| **Interfaz web**          | Guías de interfaz web de Vercel (foco, formularios, animación, contenido)                                       | Código de interfaz consistente                          | ✅ Revisadas en el código; `touch-action`, `overscroll`, sin `transition-all`                                                                                                                                                         |
| **Redacción de interfaz** | Guías de UX writing (claridad, tono, errores útiles), lectura fácil                                             | Todo el texto es para estudiantes en español            | 🟡 Lenguaje claro revisado en la auditoría de UX; falta una guía de voz y tono escrita                                                                                                                                                |
| **Simulación clínica**    | INACSL: preparación previa, seguridad psicológica, integridad profesional, facilitación, conversación posterior | Es el eje pedagógico del proyecto                       | 🟡 Cubiertos preparación previa, seguridad psicológica, integridad y la reflexión del estudiante; facilitación y conversación posterior quedan del docente. [`docs/rediseno/ux-escala-inmersion.md`](rediseno/ux-escala-inmersion.md) |

## 2. Seguridad y datos

| Apartado                | Reglas                                                                                   | Por qué le importa a PsySim                                      | Implementado                                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Seguridad web**       | OWASP Top 10 (2025), OWASP ASVS, CWE Top 25                                              | Cuentas, sesiones y datos de estudiantes                         | ✅ **OWASP Top 10** auditado (política de contenido con nonce, HSTS, dependencias sin vulnerabilidades, RLS verificada). 🟡 ASVS y CWE: solo por temas. [`docs/auditoria-seguridad.md`](auditoria-seguridad.md) |
| **Seguridad de la IA**  | OWASP Top 10 para LLM (2025), NIST AI RMF                                                | El paciente es una IA que un estudiante puede intentar manipular | ✅ **OWASP LLM** auditado: contexto armado en el servidor, filtro de fuga del prompt, tope de consumo, ataque real probado con Gemini. ⏳ NIST AI RMF                                                           |
| **Privacidad y datos**  | Ley 1581 de 2012 y Decreto 1377 (Colombia), principios de GDPR (finalidad, minimización) | Datos de estudiantes y conversaciones que van a Google           | 🟡 Aviso de privacidad redactado, con aceptación registrada y la reflexión declarada; faltan las partes «Por confirmar» (responsable, contacto) y una revisión legal                                            |
| **Ética de la IA**      | Reglamento europeo de IA (transparencia), directrices de la UNESCO sobre IA              | Se conversa con una IA sobre riesgo suicida y autolesiones       | 🟡 Transparencia (se identifica como IA), avisos de contenido y recursos de apoyo; sin auditoría formal contra estos marcos                                                                                     |
| **API y base de datos** | OWASP API Security Top 10, semántica HTTP, RLS y mínimo privilegio en PostgreSQL         | Rutas `/api` y Supabase                                          | 🟡 RLS en todas las tablas y códigos HTTP correctos, comprobados por tests; sin checklist propio del Top 10 de APIs (cubierto en parte por A01 y A05 del Top 10 web)                                            |

## 3. Rendimiento y calidad técnica

| Apartado                | Reglas                                                                              | Por qué le importa a PsySim                        | Implementado                                                                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rendimiento web**     | Core Web Vitals (LCP, INP, CLS), Lighthouse, presupuestos                           | Primera impresión y accesibilidad con redes lentas | ✅ LCP 150–200 ms, CLS 0 en Chrome real; imágenes −70 %; fuentes −85 KiB. [`docs/auditoria-rendimiento.md`](auditoria-rendimiento.md)                                                                           |
| **Rendimiento 3D**      | Buenas prácticas de WebGL: llamadas de dibujo, triángulos, texturas, memoria de GPU | La escena es lo más pesado de la aplicación        | 🟡 Resolución adaptativa, modelos con Draco (−78 %), carga de 0,41 MB, FPS medidos por software; faltan FPS en hardware real y llamadas de dibujo por escena. [`docs/pruebas/sprint-6.md`](pruebas/sprint-6.md) |
| **SEO y compartir**     | Metadatos, datos estructurados, mapa del sitio, accesibilidad de enlaces            | Portada pública                                    | ✅ Lighthouse 100 en SEO (el acceso no se indexa a propósito). 🟡 La imagen para compartir usa un personaje con derechos de autor; reemplazar por el logo propio                                                |
| **Calidad de software** | ISO/IEC 25010 (ocho atributos), complejidad ciclomática, SOLID                      | Marco para el capítulo de pruebas y calidad        | ⏳ Sin mapeo formal a ISO 25010 (los tests ya cubren seguridad, usabilidad, fiabilidad y mantenibilidad; falta ordenarlos así)                                                                                  |
| **Código**              | Clean Code, 12-factor, convenciones de Next.js                                      | Mantenibilidad                                     | 🟡 Variables de entorno documentadas y validadas, tipos estrictos, lint sin advertencias; sin revisión de código formal contra Clean Code                                                                       |
| **Pruebas**             | Pirámide de pruebas, cobertura por riesgo, mutación                                 | La IA y el 3D son difíciles de probar              | ✅ 1 299 pruebas unitarias, E2E con IA real, cobertura ≥ 70 % por carpeta, una prueba por funcionalidad. ⏳ Pruebas de mutación                                                                                 |
| **Observabilidad**      | Registros estructurados, métricas, alertas                                          | Saber qué pasa en producción                       | 🟡 Registros estructurados sin datos personales; faltan alertas (5xx, picos de 429 y de fugas del prompt) en Vercel                                                                                             |

## 4. Qué haría después

1. **Privacidad** (Ley 1581): completar los datos «Por confirmar» del aviso y pedir una revisión
   legal; es lo único que puede bloquear la publicación.
2. **Rendimiento 3D en hardware real** (pendiente que depende de ti).
3. **ISO/IEC 25010**: reordenar lo que ya existe en un cuadro de ocho atributos para el documento
   de grado; casi no requiere código.
4. **Alertas en producción** cuando exista el despliegue en Vercel.
5. **Logo propio** en el ícono y en las imágenes para compartir.
