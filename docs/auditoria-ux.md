# Auditoría de UX y accesibilidad (25 de octubre de 2026)

Revisión de toda la interfaz de PsySim contra un catálogo de reglas de UX, accesibilidad e interfaz
web. Se hizo de tres maneras: (1) **mediciones automáticas en el navegador** en cada pantalla, en
celular y escritorio; (2) **revisión visual** de capturas de las pantallas públicas, del docente,
del estudiante, de la simulación y de los resultados; (3) **lectura del código** contra las guías
de Vercel y de WCAG 2.2. Las reglas que una máquina puede comprobar quedaron como test permanente
(`e2e/ux-reglas.spec.ts`, `e2e/accesibilidad.spec.ts` y `src/lib/contraste.test.ts`).

## 1. Catálogo de reglas usado

| Familia                        | Reglas                                                                                                                                                                                                               | Cómo se comprueba                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Accesibilidad (WCAG 2.2)**   | Contraste 1.4.3 y 1.4.11; nombre accesible 4.1.2 y 2.5.3; objetivos táctiles 2.5.8 (24 px); foco no tapado 2.4.11; reflujo 1.4.10; entrada redundante 3.3.7; autenticación accesible 3.3.8; evitar pérdidas 3.3.4    | axe-core, tests de contraste y de objetivos |
| **Leyes de UX**                | Hick, Fitts, Jakob, Miller, Tesler, Doherty (< 400 ms), Postel, Pareto, Zeigarnik, Goal-Gradient, Aesthetic-Usability, Peak-End, Serial Position, Von Restorff, Parkinson                                            | Revisión por pantalla (sección 3)           |
| **Gestalt**                    | Proximidad, región común, semejanza, continuidad, cierre, Prägnanz                                                                                                                                                   | Revisión visual                             |
| **Heurísticas de Nielsen**     | Las 10 (estado del sistema, lenguaje real, control, consistencia, prevención de errores, reconocer antes que recordar, flexibilidad, minimalismo, recuperación de errores, ayuda)                                    | Recorrido cognitivo de las tareas           |
| **Ocho reglas de Shneiderman** | Consistencia, atajos, retroalimentación, cierre del diálogo, manejo simple de errores, deshacer, control del usuario, menos carga de memoria                                                                         | Recorrido cognitivo                         |
| **Principios de Norman**       | Affordances y signifiers, feedback, restricciones, mapeo, modelo conceptual                                                                                                                                          | Revisión visual                             |
| **Guías de interfaz web**      | Foco visible, formularios (etiquetas, `autocomplete`, errores en línea), animación (`prefers-reduced-motion`, sin `transition: all`), contenido (desbordes, estados vacíos), tacto (`touch-action`), URL como estado | Lectura del código y mediciones             |
| **Estados (fortificar)**       | Vacío, cargando, parcial, error, éxito, desconectado, deshabilitado, desborde; primera vez; pérdida de trabajo                                                                                                       | Inventario de estados                       |
| **Simulación clínica**         | Estándares INACSL: preparación previa, integridad profesional, seguridad psicológica, facilitación, conversación posterior                                                                                           | `docs/rediseno/ux-escala-inmersion.md`      |

Aportes que no estaban en tu lista inicial: las **ocho reglas de Shneiderman**, los **principios de
Norman**, la **Ley de Postel**, los criterios nuevos de **WCAG 2.2** (2.5.8, 2.4.11, 3.3.7, 3.3.8),
el **efecto de gradiente de meta** y las **guías de interfaz web de Vercel**.

Fuentes: [Laws of UX](https://lawsofux.com/index.md) ·
[Shneiderman, ocho reglas de oro](https://konigi.com/blog/shneidermans-eight-golden-rules-interface-design) ·
[Norman, principios de diseño](https://uxmag.com/articles/understanding-don-normans-principles-of-interaction) ·
[Novedades de WCAG 2.2](https://dequeuniversity.com/resources/wcag-2.2) ·
[Web Interface Guidelines de Vercel](https://github.com/vercel-labs/web-interface-guidelines). Los
criterios de WCAG 2.2 y las leyes de UX se resumieron de esas fuentes; para citar un número de
criterio en el documento de grado, confírmalo en el texto oficial del W3C.

## 2. Resultado de las mediciones automáticas

Medido en 10 pantallas × 2 anchos (celular 390 px y escritorio 1366 px).

| Regla                                             | Antes                                                     | Después   |
| ------------------------------------------------- | --------------------------------------------------------- | --------- |
| Un solo `h1` y encabezados sin saltos             | ✅ Cumple                                                 | ✅ Cumple |
| Todo campo con etiqueta; `autocomplete` declarado | ✅ Cumple                                                 | ✅ Cumple |
| Botones y enlaces con nombre accesible            | ✅ Cumple (tras corregir 3 casos de WCAG 2.5.3 el 25-oct) | ✅ Cumple |
| Sin desplazamiento horizontal                     | ✅ Cumple                                                 | ✅ Cumple |
| Un solo `main` y título propio por página         | ✅ Cumple                                                 | ✅ Cumple |
| **Objetivos táctiles ≥ 24 × 24 px (WCAG 2.5.8)**  | ❌ 8 grupos con 15–22 px de alto                          | ✅ Cumple |

## 3. Hallazgos y qué se hizo

### Corregidos en esta revisión

| #   | Sev. | Hallazgo                                                                                                                                                                                                                                                                                  | Reglas                                             | Corrección                                                                                                                                                                                                                        |
| --- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P1   | En las instrucciones del caso, el pie decía «Marca la casilla de privacidad para empezar», pero la casilla estaba al final de un texto largo, fuera de la vista: el botón principal quedaba bloqueado sin que se viera la causa                                                           | Nielsen 1, 6; Fitts; Zeigarnik; Norman (signifier) | La casilla y su enlace pasaron al **pie fijo**, junto a «Empezar la práctica». Siempre visibles; el botón explica por qué está bloqueado                                                                                          |
| 2   | P1   | El formulario «Crear caso» (varios minutos de trabajo) no avisaba al salir ni guardaba nada: cerrar la pestaña perdía todo                                                                                                                                                                | Nielsen 3, 5, 9; Shneiderman 6; WCAG 3.3.4         | **Borrador automático** (`useBorrador`), aviso al cerrar o recargar con cambios sin guardar, y banner «Tienes un borrador sin guardar» con Recuperar o Descartar                                                                  |
| 3   | P2   | Enlaces y chips de menos de 24 px: «Privacidad y tratamiento de datos» del pie (16 px), índice del aviso de privacidad (15 px), enlaces del login (20 px), chips de competencia y de frase de apertura (22 px), lista «faltan N datos» (20 px), nombre del estudiante en la tabla (20 px) | WCAG 2.5.8; Fitts                                  | Áreas de toque ampliadas (`min-h-6` a `min-h-8`) sin cambiar la tipografía                                                                                                                                                        |
| 4   | P3   | Los controles táctiles tenían el retraso de 300 ms; los diálogos pasaban el desplazamiento a la página de atrás                                                                                                                                                                           | Doherty; guías de Vercel                           | `touch-action: manipulation` global y `overscroll-behavior: contain` en diálogos y paneles                                                                                                                                        |
| 5   | P3   | `transition-all` en la mira de la simulación                                                                                                                                                                                                                                              | Guías de animación                                 | Se listan las propiedades que cambian (`transition-[width,height,background-color,border-color]`)                                                                                                                                 |
| 6   | P3   | En los resultados, un valor vacío («—») no decía por qué                                                                                                                                                                                                                                  | Nielsen 1, 9                                       | Texto de ayuda según el caso: «El paciente aún no respondió», «La práctica no llegó a empezar»                                                                                                                                    |
| 8   | P2   | **La barra de la simulación tenía 8 botones de ícono** al explorar                                                                                                                                                                                                                        | Hick, Miller; Nielsen 6                            | Voz del paciente y ambiente emocional pasaron a un solo botón «Ajustes del consultorio» (7 botones). Silenciar el sonido sigue a un clic (Fitts)                                                                                  |
| 9   | P2   | **La reflexión del estudiante no se guardaba** («Para ti, mientras esperas»): se perdía el punto de partida de la conversación posterior                                                                                                                                                  | INACSL (debriefing); Nielsen 3                     | Ahora se escribe en los resultados, es **opcional**, se guarda (`reflexion`, función `guardar_reflexion`), se puede corregir o retirar, y la lee el docente en los resultados y en su revisión. El aviso de privacidad lo declara |
| 7   | P3   | Los nombres accesibles de las tarjetas de escenarios y del menú de cuenta no contenían el texto visible                                                                                                                                                                                   | WCAG 2.5.3                                         | Corregido el 25-oct (ver `docs/pruebas/sprint-5.md`)                                                                                                                                                                              |

### Recomendados (no aplicados)

| #   | Sev. | Recomendación                                                                                                                                                                                                                                      | Por qué no se aplicó ahora                                                               |
| --- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| R2  | P2   | **Las instrucciones del caso son largas** (aviso, competencia, objetivos, descripción, paciente, 6 reglas, controles). Sugiero mostrar primero lo esencial en tres bloques («El caso», «Cómo funciona», «Tus controles») con pestañas o acordeones | Cambia el contenido de la preparación previa (INACSL); requiere decidirlo con el docente |
| R4  | P3   | Filtros de Estudiantes y Casos: comprobar que **el estado vive en la URL** (compartible, botón Atrás)                                                                                                                                              | No se verificó pantalla por pantalla                                                     |
| R5  | P3   | **Lector de pantalla real** (NVDA o VoiceOver) en la simulación y en la revisión del docente                                                                                                                                                       | Requiere una persona y el programa instalado                                             |
| R6  | P3   | **Prueba con 3 o 5 personas** (estudiantes y un docente) siguiendo las tareas «usar un código», «asignar una práctica», «revisar una conversación»                                                                                                 | Requiere usuarios; es la forma de validar R1 y R2                                        |

## 4. Lo que ya estaba bien (a proteger)

- **Visibilidad del estado del paciente** en el HUD y el panel («Escuchando», «Pensando…»), con `role="status"`.
- **Ley de Jakob y consistencia:** enlaces de retorno («‹ Mis prácticas»), misma barra, mismos botones primarios en latón (Von Restorff: una acción principal por pantalla).
- **Prevención de errores:** «Terminar práctica» pide confirmación y dice que no se puede reanudar; el botón se bloquea mientras el paciente piensa; el límite de mensajes explica cuánto esperar.
- **Estados vacíos que guían** (Inicio, Revisiones, Mis casos) y estados de error con salida («Ir a mis prácticas»).
- **Progreso visible** (Zeigarnik, gradiente de meta): los pasos 1–2–3 de «Asignar práctica» y «Para guardar te faltan N datos» con enlaces a cada campo.
- **Tecnología asistiva:** enlace «Saltar al contenido», `aria-current` en la navegación, `aria-live` en avisos, contraste AA en ambos temas comprobado por tests, `prefers-reduced-motion` respetado (32 usos), `scroll-padding` para que las barras fijas no tapen el foco (WCAG 2.4.11).
- **Lenguaje:** español claro, sin jerga técnica en la interfaz; «Tu docente leerá la conversación» explica quién ve qué (Nielsen 2).
- **Tesler:** los casos de ejemplo y los chips de síntomas evitan que el docente escriba instrucciones para una IA.

## 5. Cómo mantenerlo

`pnpm test:e2e e2e/ux-reglas.spec.ts e2e/accesibilidad.spec.ts` comprueba en cada cambio las reglas
medibles; `pnpm test` incluye el contraste del tema. Las reglas de juicio (Hick, Gestalt, Peak-End)
se vuelven a revisar con esta misma tabla cuando se agregue una pantalla nueva.
