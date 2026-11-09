# Estado del proyecto y cómo retomarlo (8 de noviembre de 2026)

Documento de relevo: lo que se hizo, dónde está cada cosa y lo que sigue. Sirve para retomar el
trabajo en un chat nuevo o con otra persona sin releer toda la conversación.

## Dónde está todo

- **`main` y `develop` tienen el mismo contenido.** La PR #25 (`develop` → `main`, 8 de noviembre)
  desplegó `f518f54` en producción con la revisión del 7 de noviembre y las dependencias al día.
  Solo existen las ramas `main` y `develop`; las fusionadas se borraron. Todas las migraciones están
  aplicadas, incluida `20261107010000_revision_7_noviembre`.
- **`main` está protegida** desde el 5 de noviembre: solo entra por PR y con el check «Lint,
  tipos, formato y pruebas» en verde; sin push forzado ni borrado.
- **Documento de grado:** `docs/doc_grado/` (LaTeX e instrumentos de evaluación) queda fuera de git a
  propósito. Se compila en Overleaf (XeLaTeX + Biber, `principal.tex` y `anexos.tex`).
- **Backlog de Taiga:** actualizado el 8 de noviembre con la API: 58 historias (HU-31 a HU-59
  nuevas), Sprint 7 creado y sprints 3, 5 y 6 cerrados. Lo subido y las decisiones están en
  [`docs/taiga-borrador.md`](taiga-borrador.md). Las exportaciones (`taiga*.json`) no van a git.
- **Diseño:** el archivo de Figma de alta fidelidad
  (<https://www.figma.com/design/j1xZt7tAwmPSksLlXI9vFG>) está enlazado en el capítulo 4 y el
  Anexo H del documento.
- **Servicios externos:** monitor de UptimeRobot sobre `/api/salud?profunda=1`
  ([`docs/observabilidad.md`](observabilidad.md)) y acceso con Google configurado
  ([`docs/simulacion-a-distancia.md`](simulacion-a-distancia.md)).

## Documentos clave

| Documento                                                                 | Para qué                                                         |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`docs/taiga-estado.md`](taiga-estado.md)                                 | Estado real de cada historia de usuario (HU-01 a HU-30)          |
| [`docs/taiga-borrador.md`](taiga-borrador.md)                             | Lo subido a Taiga el 8 de noviembre: HU-31 a HU-59 y estados     |
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
- **8 de noviembre:** release a `main` (#25), Taiga al día, monitor externo, acceso con Google
  configurado (falta la prueba positiva), Figma enlazado en el documento y tabla 62 (plan de
  sprints) incluida en el capítulo 4.

## Pendiente

Ordenado por lo que más bloquea la entrega. La historia de Taiga va entre paréntesis.

### 1. Bloquea el grado

1. **Evaluación con usuarios:** cuestionarios en Google Forms, sesiones por videollamada,
   evidencia en Drive y análisis (`docs/doc_grado/evaluacion/`). Cinco de las 13 marcas
   `\pendiente{}` dependen de ella.
2. **Compilar el documento en Overleaf** (ver la sección «Documento de grado»).
3. **Las demás marcas `\pendiente{}`**, todas decisiones del autor.

### 2. Para la sustentación

4. **Prueba positiva de Google (HU-32 · T04):** registrar un correo `@correounivalle.edu.co` como
   estudiante y entrar con Google hasta «Mis prácticas». El rechazo de correos no registrados ya
   está verificado ([`docs/simulacion-a-distancia.md`](simulacion-a-distancia.md)).
5. **Acceso del jurado y E2E en producción (HU-29 · T03 y T04):** crear sus cuentas y correr
   `pnpm test:e2e` con `PLAYWRIGHT_BASE_URL` del despliegue y `--workers=1`.
6. **Conversar con los 12 pacientes** desde `/laboratorio/npc`, incluido E-07 (HU-24 y HU-49).
7. **Pasada con lector de pantalla** (NVDA) en la simulación y la revisión del docente (HU-25 ·
   T07). Con la anterior, cierra los requisitos «Pendiente: verificación manual» del Anexo I.
8. **Figma:** compartir con «Cualquiera con el enlace · puede ver» (HU-51 · T06).

### 3. Corto

9. **Aviso de privacidad:** completar los datos «Por confirmar» y pedir revisión legal (HU-52).
10. **Créditos de los modelos 3D en la aplicación:** el origen y las licencias ya están en
    [`docs/modelos-3d.md`](modelos-3d.md) y en el Anexo H (8 modelos de Poly Pizza, CC0 y CC BY 3.0;
    los pacientes son propios). Falta una línea de créditos visible en la plataforma.
11. **Gemini:** revisar cuota y facturación de la clave de producción antes de la evaluación.
12. **`deepmerge`** (alerta baja de Dependabot, solo en la CLI de shadcn): sin versión corregida;
    revisarla cuando salga.

### 4. Opcional

13. **Alertas de Vercel** basadas en registros (`docs/observabilidad.md`, sección 5); el monitor
    externo ya cubre «aplicación caída» y «base de datos caída».
14. Que el selector de Google muestre `psysim.vercel.app` en vez del dominio de Supabase (decidido
    dejarlo así; opciones en `docs/simulacion-a-distancia.md`).

## Documento de grado (revisado el 7 de noviembre; cambios del 8 al final)

Las cifras y el entorno del capítulo 5 son los de la corrida del 3 de noviembre sobre `0e0f66f`
(1402 unitarias, 115 de 116 E2E, 75 FPS, Playwright 1.63.0, Node 24.17.0). Producción ya está en
`f518f54` (revisión del 7 de noviembre y dependencias): decidir antes de entregar si se repiten las
pruebas y se actualizan fechas y versiones.

**8 de noviembre:** la tabla 62 (plan de sprints, ahora con HU-31 a HU-59 y el Sprint 7) se incluye
en «Construcción del sistema» del capítulo 4; la tabla de resultados del capítulo 1 cita el backlog;
la sección de prototipos enlaza Figma (`\linkfigma`) con la Figura de la paleta, y el Anexo G suma
las pantallas del estudiante en el celular. La tabla 82 (`generado/tabla-82.tex`) es una copia
vieja de la tabla de resultados y no se incluye.

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

## Revisión del 7 de noviembre (en producción desde el 8 de noviembre)

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

**Migración aplicada:** `20261107010000_revision_7_noviembre.sql` (tope de 150 con las
reformuladas en `guardar_intercambio`; el estudiante solo marca `finalizada` una práctica
comenzada; trigger que impide cambiar el correo de un registro con prácticas). Desde ella, las
funciones nuevas no tienen `execute` para `public` por defecto: toda función nueva que use
`authenticated` necesita su `grant` explícito.

**Pendiente:**

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
