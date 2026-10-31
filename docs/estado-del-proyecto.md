# Estado del proyecto y cómo retomarlo (25 de octubre de 2026)

Documento de relevo: lo que se hizo, dónde está cada cosa y lo que sigue. Sirve para retomar el
trabajo en un chat nuevo o con otra persona sin releer toda la conversación.

## Dónde está todo

- **Rama de trabajo:** `develop` (en GitHub, `f0f8a6f` al escribir esto). `main` no se tocó; subir
  `develop` a `main` es un paso pendiente.
- **Ramas de feature ya fusionadas en `develop`:** `feat/metricas-sesion` (Sprint 4),
  `feat/accesibilidad-sprint5` (Sprint 5), `feat/despliegue-y-docs-sprint6` (Sprint 6),
  `feat/auditoria-ux`, `feat/ux-ajustes-y-reflexion`. Siguen existiendo en GitHub; se pueden borrar.
- **`feat/pruebas-sprint6` (remota):** copia anterior de este trabajo, ya incluida. Se puede borrar.
- **Backlog de Taiga:** `taiga.json` (no se modificó). Su estado real está en
  [`docs/taiga-estado.md`](taiga-estado.md).

## Documentos clave

| Documento                                                                 | Para qué                                                         |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`docs/taiga-estado.md`](taiga-estado.md)                                 | Estado real de cada historia de usuario (HU-01 a HU-30)          |
| [`docs/pruebas/sprint-0.md`…`sprint-6.md`](pruebas)                       | Registros de pruebas por sprint                                  |
| [`docs/auditoria-ux.md`](auditoria-ux.md)                                 | Catálogo de reglas de UX/accesibilidad, hallazgos y recomendados |
| [`docs/auditoria-seguridad.md`](auditoria-seguridad.md)                   | OWASP Top 10 para LLM y web: hallazgos, correcciones, pendientes |
| [`docs/auditoria-rendimiento.md`](auditoria-rendimiento.md)               | Core Web Vitals y Lighthouse: mediciones y correcciones          |
| [`docs/reglas-de-calidad.md`](reglas-de-calidad.md)                       | Catálogos de reglas por apartado y cuáles están implementadas    |
| [`docs/rediseno/ux-escala-inmersion.md`](rediseno/ux-escala-inmersion.md) | Decisiones de UX y estándares INACSL de simulación               |
| [`README.md`](../README.md)                                               | Instalación, scripts, arquitectura y mapa de tests por feature   |

## Qué quedó hecho en esta etapa

- **Sprint 4:** métricas de la sesión (`/api/metrics/save`, tabla `metrica`, función
  `guardar_metricas_cierre`), estado del paciente en el HUD, cierre que guarda y lleva a
  `/resultados`.
- **Sprint 5:** pruebas de navegación, instrucciones y prompts; accesibilidad automatizada
  (contraste WCAG AA, axe-core, teclado, tres anchos).
- **Sprint 6:** test de rendimiento, checklist de seguridad automatizado, `.env.example` completo.
- **Auditoría de UX:** casilla de privacidad en el pie de las instrucciones, borrador automático en
  «Crear caso», objetivos táctiles ≥ 24 px, botón único de «Ajustes del consultorio».
- **INACSL:** la reflexión del estudiante ahora se guarda (tabla `reflexion`) y la lee el docente.
- **Migraciones aplicadas en Supabase:** `20261025010000_metricas_sesion` y
  `20261025020000_reflexion_estudiante`. Se aplican con
  `node --env-file=.env.local scripts/aplicar-migracion.mjs <archivo>` (requiere
  `SUPABASE_ACCESS_TOKEN` válido en `.env.local`).

- **Seguridad y rendimiento (25-oct):** Next 16.4.3 (la 16.3.6 tenía 2 vulnerabilidades
  críticas), `pnpm audit` limpio, política de contenido con nonce, contexto de la IA armado en el
  servidor, filtro de fuga del prompt, tope de 150 intervenciones por práctica, imágenes −70 % y
  fuentes −85 KiB.

## Pendiente (no se puede cerrar desde el código)

1. **Vercel (HU-29):** cargar las variables de entorno, correr
   `PLAYWRIGHT_BASE_URL=<despliegue> pnpm test:e2e`, registrar la URL beta y dar acceso al jurado.
2. **Rendimiento en hardware real (HU-28):**
   `E2E_FPS_MINIMO=30 pnpm exec playwright test e2e/rendimiento.spec.ts --workers=1` en un PC con
   GPU integrada (el caso exigente) y, si se puede, en otro con GPU dedicada.
3. **Conversar con los 12 pacientes** desde `/laboratorio/npc` (HU-24 · T02).
4. **Pasada con lector de pantalla** (NVDA o VoiceOver) en la simulación y la revisión del docente.
5. **Actualizar los estados en Taiga** (las historias figuran como `New`).
6. **Subir `develop` a `main`** cuando se dé por terminada una etapa.
7. **Reemplazar el logo de Psyduck** (personaje de Pokémon) en `src/app/icon.png` y en las
   imágenes para compartir (`opengraph-image.png`, `twitter-image.png`); luego
   `node scripts/optimizar-imagenes.mjs <imagen>`.
8. **Completar el aviso de privacidad** (los datos «Por confirmar») y pedir revisión legal.
9. **Correr la regresión E2E completa con el PC en reposo** (`pnpm test:e2e --workers=1`). La del
   25-oct se cortó por poca memoria tras 73 pruebas aprobadas; faltaron `flujo-completo`,
   `laboratorio`, `navegacion`, `presencial`, `rendimiento`, `resultados`, `revisiones`, `smoke`
   y `ux-reglas`.

## Recomendaciones de UX sin aplicar

- **R2:** acortar las instrucciones del caso (tres bloques en lugar de un texto largo). Cambia la
  preparación previa de INACSL: decidirlo con el docente.
- **R4:** comprobar que los filtros de Estudiantes y Casos viven en la URL.
- **R6:** probar con 3 a 5 personas (usar un código, asignar una práctica, revisar una
  conversación).
- **CSP:** ya existe (con nonce, en `src/proxy.ts`) y se probó con la escena 3D en la build de
  producción; conviene volver a probarla en el preview de Vercel.
- **Contraseñas filtradas** (HaveIBeenPwned): requiere el plan Pro de Supabase.

## Cómo trabajar aquí

- **Comprobar todo:** `pnpm typecheck && pnpm lint && pnpm test` (1 299 tests). Los E2E
  (`pnpm test:e2e`) usan la base real y la IA real; correrlos de a pocos (`--workers=1`): con dos
  workers el equipo se satura y fallan por tiempo.
- **Commits:** convencionales, en español, un commit por funcionalidad con sus tests; el cuerpo no
  pasa de 100 caracteres por línea y el asunto va en minúscula (commitlint). Hooks de Husky:
  `lint-staged` y `tsc` en cada commit.
- **Ramas:** una por funcionalidad (`feat/...`), fusionadas en `develop` con merge sin
  avance rápido, como el resto del historial.
- **Tests por funcionalidad:** un archivo por historia o módulo, no una suite única (mapa en el
  README).
- **Reglas medibles de UX** que no deben romperse: `e2e/ux-reglas.spec.ts`,
  `e2e/accesibilidad.spec.ts`, `src/lib/contraste.test.ts` y `src/lib/seguridad.test.ts`.
- **Seguridad de datos:** las migraciones y los E2E tocan la base de datos remota real (proyecto
  `afqofsneoblsjjdvktsu`); las tablas nuevas deben tener RLS y las funciones `security definer`, un
  `search_path` fijo (lo comprueba `seguridad.test.ts`).
