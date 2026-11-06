# Estado del proyecto y cómo retomarlo (5 de noviembre de 2026)

Documento de relevo: lo que se hizo, dónde está cada cosa y lo que sigue. Sirve para retomar el
trabajo en un chat nuevo o con otra persona sin releer toda la conversación.

## Dónde está todo

- **Producción (`main`) y staging (`develop`) tienen el mismo contenido** desde el 3 de noviembre
  (PR #11 a `develop` y #12 a `main`, `0e0f66f`). Las migraciones de la auditoría ya están
  aplicadas.
- **Ramas de feature fusionadas que siguen en GitHub** (se pueden borrar): `feat/accesibilidad-sprint5`,
  `feat/auditoria-seguridad-ia`, `feat/auditoria-ux`, `feat/despliegue-y-docs-sprint6`,
  `feat/metricas-sesion`, `feat/pruebas-sprint6`, `feat/redaccion-seo-y-compartir`,
  `feat/ux-ajustes-y-reflexion` y `fix/auditoria-thermos`.
- **Documento de grado:** `docs/doc_grado/` (LaTeX e instrumentos de evaluación) queda fuera de git a
  propósito. Se compila en Overleaf (XeLaTeX + Biber, `principal.tex` y `anexos.tex`).
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
| [`docs/performance.md`](performance.md)                                   | FPS con GPU real y medición del documento de grado               |
| [`docs/observabilidad.md`](observabilidad.md)                             | Registros, salud y alertas por crear en Vercel                   |
| [`docs/reglas-de-calidad.md`](reglas-de-calidad.md)                       | Catálogos de reglas por apartado y cuáles están implementadas    |
| [`docs/rediseno/ux-escala-inmersion.md`](rediseno/ux-escala-inmersion.md) | Decisiones de UX y estándares INACSL de simulación               |
| [`README.md`](../README.md)                                               | Instalación, scripts, arquitectura y mapa de tests por feature   |

## Qué quedó hecho

- **Sprints 4 a 6:** métricas de la práctica, accesibilidad automatizada, rendimiento, checklist de
  seguridad y `.env.example` completo.
- **Auditorías de UX y de seguridad (hasta el 25 de octubre):** reflexión del estudiante (INACSL),
  Next 16.4.3, política de contenido con nonce, contexto de la IA armado en el servidor, filtro de
  fuga del prompt y tope de intervenciones por práctica.
- **Auditoría thermo-nuclear (29 de octubre al 3 de noviembre):** el cliente ya no escribe mensajes
  ni números que ve el docente, permisos por columna, funciones de rol que leen la tabla. Detalle
  en `docs/auditoria-seguridad.md`, sección 5.
- **CI en GitHub Actions** (lint, tipos, formato y pruebas en cada PR) y **Dependabot** semanal.
- **Medición de rendimiento con GPU real** contra producción: 75 FPS en E-01, E-04 y E-08 durante
  diez minutos de conversación (`docs/performance.md`).

## Pendiente

### En GitHub (decide el autor)

1. **Dependabot:** #13, #14 y #15 (acciones de CI) y #16 (21 dependencias menores) tienen CI y el
   preview de Vercel en verde. #18 (TypeScript 6) y #19 (`@hookform/resolvers` 6) quedan para
   después de la entrega.
2. **Proteger `main`** (sin push directo, PR con CI en verde).
3. **Borrar las ramas fusionadas** de la lista de arriba.

### En Vercel

4. **Crear las alertas** de `docs/observabilidad.md`, sección 5, o un monitor externo sobre
   `/api/salud`.

### Fuera del código

5. **Acceso del jurado (HU-29 · T04):** crear sus cuentas y entregarles las credenciales.
6. **Conversar con los 12 pacientes** desde `/laboratorio/npc` (HU-24 · T02).
7. **Pasada con lector de pantalla** (NVDA o VoiceOver) en la simulación y la revisión del docente.
8. **Actualizar los estados en Taiga** (las historias figuran como `New`).
9. **Completar el aviso de privacidad** (los datos «Por confirmar») y pedir revisión legal.
10. **Documento de grado:** compilarlo en Overleaf y resolver sus marcas `PENDIENTE` (evaluación
    con usuarios, Lighthouse y NVDA, entre otras).

## Recomendaciones de UX sin aplicar

- **R2:** acortar las instrucciones del caso (tres bloques en lugar de un texto largo). Cambia la
  preparación previa de INACSL: decidirlo con el docente.
- **R4:** comprobar que los filtros de Estudiantes y Casos viven en la URL.
- **R6:** probar con 3 a 5 personas (usar un código, asignar una práctica, revisar una
  conversación).
- **Contraseñas filtradas** (HaveIBeenPwned): requiere el plan Pro de Supabase.

## Cómo trabajar aquí

- **Comprobar todo:** `pnpm check` (lint, tipos, formato y pruebas unitarias). Los E2E
  (`pnpm test:e2e`) usan la base real y la IA real; correrlos de a pocos (`--workers=1`): con dos
  workers el equipo se satura y fallan por tiempo.
- **Commits:** convencionales, en español, un commit por funcionalidad con sus tests; el cuerpo no
  pasa de 100 caracteres por línea y el asunto va en minúscula (commitlint). Hooks de Husky:
  `lint-staged` y `tsc` en cada commit.
- **Ramas:** una por funcionalidad (`feat/...`, `fix/...`, `docs/...`) desde `develop`, fusionadas
  con PR.
- **Tests por funcionalidad:** un archivo por historia o módulo, no una suite única (mapa en el
  README).
- **Reglas medibles de UX** que no deben romperse: `e2e/ux-reglas.spec.ts`,
  `e2e/accesibilidad.spec.ts`, `src/lib/contraste.test.ts` y `src/lib/seguridad.test.ts`.
- **Seguridad de datos:** las migraciones y los E2E tocan la base de datos remota real (proyecto
  `afqofsneoblsjjdvktsu`), compartida por staging y producción; las tablas nuevas deben tener RLS y
  las funciones `security definer`, un `search_path` fijo (lo comprueba `seguridad.test.ts`).
