# Estado del proyecto y cómo retomarlo (5 de noviembre de 2026)

Documento de relevo: lo que se hizo, dónde está cada cosa y lo que sigue. Sirve para retomar el
trabajo en un chat nuevo o con otra persona sin releer toda la conversación.

## Dónde está todo

- **`develop` va 16 commits por delante de `main`** (`ce3a65c`, 5 de noviembre): la medición de
  rendimiento (#20) y las actualizaciones de Dependabot (#13 a #16, #18 con TypeScript 6 y #19 con
  `@hookform/resolvers` 7). Producción sigue en `0e0f66f`. Las migraciones de la auditoría ya están
  aplicadas; ninguna de estas PR trae migraciones.
- **`main` está protegida** desde el 5 de noviembre: solo entra por PR y con el check «Lint,
  tipos, formato y pruebas» en verde; sin push forzado ni borrado.
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

### Lo siguiente, en este orden

1. **Probar el preview de `develop` en Vercel a mano:** iniciar sesión, hacer una práctica corta
   en un consultorio con texturas incrustadas (E-07) y otro cualquiera, conversar con el paciente y
   terminar. El CI no cubre la escena 3D ni la IA, y entraron React 19.3.1, radix-ui 1.8, el AI SDK,
   Supabase y TypeScript 6. Si hace falta más, `pnpm test:e2e` contra el preview con `--workers=1`.
2. **PR de `develop` a `main`** cuando el preview esté bien. Al fusionarla se despliega producción;
   después, comprobar `/api/salud`.
3. **Borrar las ramas fusionadas** de la lista de arriba (y `docs/medicion-rendimiento`).

### En Vercel

4. **Crear las alertas** de `docs/observabilidad.md`, sección 5, o un monitor externo sobre
   `/api/salud`.

### Fuera del código

5. **Acceso del jurado (HU-29 · T04):** crear sus cuentas y entregarles las credenciales.
6. **Conversar con los 12 pacientes** desde `/laboratorio/npc` (HU-24 · T02).
7. **Pasada con lector de pantalla** (NVDA o VoiceOver) en la simulación y la revisión del docente.
8. **Actualizar los estados en Taiga** (las historias figuran como `New`).
9. **Completar el aviso de privacidad** (los datos «Por confirmar») y pedir revisión legal.
10. **Documento de grado** (ver la sección siguiente).

## Documento de grado (revisado el 7 de noviembre)

Al día con el proyecto: las cifras y el entorno del capítulo 5 son los de la corrida del 3 de
noviembre sobre `0e0f66f` (1402 unitarias, 115 de 116 E2E, 75 FPS, Playwright 1.63.0, Node
24.17.0), y nada de lo fusionado el 5 de noviembre las contradice. Si `develop` sube a `main` antes
de entregar, decidir si se repiten las pruebas y se actualizan fechas y versiones.

**Pasada APA 7 del 7 de noviembre:** anexos B y C con mayúscula solo inicial, coma decimal,
espacio fino de miles y términos en inglés en cursiva; citas escritas a mano convertidas a
biblatex; lista de referencias propia en `anexos.tex`; tablas de anexo numeradas A1, B2…; Brown et
al. (2020) con sus 31 autores; normas colombianas como `@misc`; Hall (1966) citado. Se corrigieron
dos errores de contenido: el Anexo C decía 4,000 para Babylon.js (la matriz da 3,975) y la tabla
de T-08 tenía cruzadas las columnas de _scripting_ y latencia en R3F con 16 a 64 agentes (el texto
del anexo se ajustó). Respaldo previo en el scratchpad de esa sesión.

Quedan 13 marcas `\pendiente{}`, todas del autor:

- Portada: mes y día. Resumen: resultado principal de la evaluación con usuarios.
  Agradecimientos.
- Cap. 1: si los directores exigen un manual aparte; otras herramientas de IA usadas.
- Cap. 3: confirmar la pantalla de T-01 a T-12 (resultados de 100 FPS con un monitor de 75 Hz;
  el Anexo B decía 120 Hz y se quitó).
- Anexo C, tabla de T-08: confirmar con los registros las latencias de Babylon.js con 4 o más
  agentes (venían con punto de miles ambiguo; el pico de 64 se leyó como 43 130 ms).
- Cap. 4: revisar la sección con el profesor Fabián Valencia.
- Cap. 5: verificación manual (Anexo I), Lighthouse y NVDA, resultados y discusión de la
  evaluación con usuarios. Cap. 6: conclusión sobre usabilidad y satisfacción.

Las tablas 68 y 71 tienen unos 30 requisitos en «Pendiente: verificación manual» que se cierran
con la pasada del Anexo I. **Lo que más bloquea es la evaluación con usuarios** (cinco marcas
dependen de ella). El documento nunca se ha compilado: subirlo a Overleaf (XeLaTeX + Biber,
`principal.tex` y `anexos.tex`) cuanto antes. No está en git; su único respaldo es OneDrive.

## Revisión del 7 de noviembre (sin commit, rama `docs/agenda-retomar`)

Cuatro revisores por áreas. Sin hallazgos críticos ni altos. **Corregido** (con pruebas):

- Modo presencial: el consentimiento de privacidad y del dictado, la guía vista y los borradores
  de casos (con lo que guarda el paciente) ahora se borran al entregar el equipo.
- Filtro de fuga: las frases citadas del prompt ya no cuentan (E-07 fallaba con 502 cada vez que
  Hernán hacía su pregunta de diez palabras).
- Chat: una respuesta que llega tras salir o reabrir la práctica se descarta; el 409 muestra «La
  práctica ya terminó»; el aviso de error ya no dice que el mensaje se guardó.
- Inactividad: una pestaña oculta en `respondiendo` ya no mantiene la práctica abierta.
- Sin WebGL: aviso propio con «Ir a Mis prácticas» por encima de la pantalla de carga.
- Panel: `error.tsx` propio que conserva el menú; «Terminar la práctica» del docente con foco,
  `role="alert"` y manejo de error de red; textos según la guía; CSV con fecha de Bogotá;
  «Agregar correo» a un registro antiguo con prácticas; cursor del paciente; prueba intermitente
  de `reflexion.test.tsx`.

**Segunda pasada (mismo día), corregido** (con pruebas):

- Cambiar la contraseña pide la actual (se comprueba con un cliente aparte, sin tocar la sesión);
  las cuentas de estudiante ya no pueden crear contraseña y el menú no se lo ofrece.
- Corregir el correo de un estudiante sin prácticas ya funciona: antes se borra la cuenta del
  correo anterior si solo la usaba ese registro (si la usa otro docente, se avisa).
- Chat: si `guardar_intercambio` falla, la ruta responde 503 en vez de 200 (el intercambio no
  quedaba en la transcripción). Reintentar envía `reintento: true` y, si el intercambio ya se
  guardó, el servidor devuelve lo guardado sin llamar a la IA ni duplicarlo.
- Panel: todas las transiciones que llaman Server Actions pasan por `sinPerderElPanel` (un corte
  de red da un aviso, no la página de error); `loading.tsx` del panel; quitar un comentario ofrece
  «Deshacer»; «Anular» mueve el foco a la confirmación y lo devuelve al cancelar; eliminar a un
  estudiante con una práctica abierta lo advierte; archivar un caso anula sus códigos sin usar.
- Pantalla de carga: tras 45 s sin avance ofrece «Recargar» e «Ir a Mis prácticas».
- `modelos:subir`: caché de un día (antes un año en la misma URL).

**Pendiente:**

- **Aplicar** `supabase/migrations/20261107010000_revision_7_noviembre.sql` (no se probó en seco):
  tope de 150 con las reformuladas en `guardar_intercambio`; el estudiante solo marca `finalizada`
  una práctica comenzada; trigger que impide cambiar el correo de un registro con prácticas;
  funciones nuevas sin `execute` para `public` por defecto (desde ahí, toda función nueva que use
  `authenticated` necesita su `grant` explícito). Funciona con el código de `main` y `develop`.
  `! node --env-file=.env.local scripts/aplicar-migracion.mjs supabase/migrations/20261107010000_revision_7_noviembre.sql`
- Opcional: activar también «Secure password change» en Supabase (Auth → Providers → Email).
- Ante una fuga, el respaldo vuelve a llamar a la IA (la prueba lo fija a propósito): decidir si se
  mantiene; el límite real es entonces de 20 llamadas por minuto.

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
