# Estado del proyecto y cómo retomarlo (20 de noviembre de 2026)

Documento de relevo: lo que se hizo, dónde está cada cosa y lo que sigue. Sirve para retomar el
trabajo en un chat nuevo o con otra persona sin releer toda la conversación.

## Dónde está todo

- **`main`** (producción) está en `0f861b2`: la PR #31 (18 de noviembre) integró las correcciones
  de la auditoría de Fable, el orquestador de NPC, el cierre del orquestador y el tiempo de
  consulta; la PR #32, el contexto del caso sin etiquetas de emoción.
- **`develop`** (staging) va 16 commits por delante de `main` con el trabajo de interfaz del 18 y
  19 de noviembre: avatares de cuenta, portada pública y guía `/manual`, inicio del Administrador,
  configurador de prácticas, Revisiones, fichas de estudiantes, casos y Administrador, recorridos
  guiados y pistas contextuales para el docente. Falta la PR de `develop` a `main`.
- **`main` está protegida** desde el 5 de noviembre: solo entra por PR y con el check «Lint,
  tipos, formato y pruebas» en verde; sin push forzado ni borrado.
- **Documento de grado:** `docs/doc_grado/` (LaTeX e instrumentos de evaluación) queda fuera de git a
  propósito. Compila en local con `docs/doc_grado/latex/compilar.ps1` (MiKTeX) o en Overleaf.
- **Backlog de Taiga:** actualizado el 8 de noviembre con la API: 58 historias (HU-31 a HU-59
  nuevas), Sprint 7 creado y sprints 3, 5 y 6 cerrados. Lo subido y las decisiones están en
  [`docs/taiga-borrador.md`](taiga-borrador.md). Las exportaciones (`taiga*.json`) no van a git.
- **Diseño:** el archivo de Figma de alta fidelidad
  (<https://www.figma.com/design/j1xZt7tAwmPSksLlXI9vFG>, versión 2.0 del 19 y 20 de noviembre)
  refleja el frontend de `develop`: ver «Figma» más abajo. Está enlazado en el capítulo 4 y el
  Anexo H del documento.
- **Servicios externos:** monitor de UptimeRobot sobre `/api/salud?profunda=1`
  ([`docs/observabilidad.md`](observabilidad.md)), acceso con Google configurado
  ([`docs/simulacion-a-distancia.md`](simulacion-a-distancia.md)) y orquestador de NPC
  ([`docs/orquestador.md`](orquestador.md)).
- **Auditoría de Codex en curso** (19 de noviembre): por pasadas, con el prompt de
  [`docs/prompt-auditoria-codex.md`](prompt-auditoria-codex.md); el informe se escribe en
  `docs/auditoria-codex.md`.

## Orquestador de NPC y tiempo de consulta (en `main` desde el 18 de noviembre)

El paciente puede responder con el orquestador de NPC de Juan José Moreno (`IA_PROVEEDOR=orquestador`)
con Gemini de respaldo. Detalle, puesta en marcha y emergencias en
[`docs/orquestador.md`](orquestador.md).

- **Cierres:** solo `crisis` e `inappropriate` del orquestador terminan la práctica; un cierre
  `success` pasa a Gemini y se registra (el error de la práctica 51b8aecd, E-08, quedó corregido).
- **Fin normal de una práctica:** tiempo de consulta (10, 15, 20 o 30 minutos, que elige el
  docente), aviso a los 3 minutos, invitación a cerrar, 5 minutos de margen y fin automático con
  motivo neutro. El paciente no cierra la consulta por sentirse mejor y ningún caso empieza a menos
  de 2 puntos de su piso de severidad (`VERSION_MAPEO = 3`).
- **Antes de usarlo con estudiantes:** el aviso de privacidad, las instrucciones de la práctica y
  el consentimiento deben nombrar al orquestador además de Google Gemini, y el documento de grado
  debe citarlo.

## Figma (versión 2.0, 19 y 20 de noviembre)

- **Pantallas:** 29 marcos capturados del frontend local (`develop`) con la captura de Figma,
  ligados a las variables del archivo y con sus estilos de texto donde coinciden tamaño e
  interlineado. Nuevas: Manual de uso, Administrador · Inicio y Administrador · Paciente con IA.
  «Código generado» se reconstruyó a mano: el modal solo aparece al crear una asignación real.
- **Simulación:** los estados se capturaron de prácticas reales de `estudiante1` (incluidos el
  aviso de los 3 minutos y la invitación a cerrar del tiempo de consulta), con sus enlaces del
  prototipo y los colores ligados a variables. El cierre de una práctica terminada es la pantalla
  de resultados, y el estado móvil es el aviso «La simulación se abre en tu computador» (se
  capturó emulando un celular táctil). La pantalla de carga y el aviso «¿Sigues ahí?» se conservan
  de octubre porque no cambiaron.
- **Prototipo navegable:** 11 copias nuevas, 14 enlaces y 5 flujos.
- **Cómo repetirlo:** Playwright con `bypassCSP: true` (la CSP de la app no deja conectar con
  Figma) y las cuentas `E2E_*` de `.env.local`. Reescribir el documento para quitar la CSP impide
  que React hidrate (Chromium bloquea el WebSocket de recarga de Next). La extensión de Claude in
  Chrome no sirve para esto por la misma CSP.
- **Datos:** las vistas del Administrador muestran solo cuentas de prueba; los datos reales que
  salían se reemplazaron.

## Documentos clave

| Documento                                                                 | Para qué                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`docs/taiga-estado.md`](taiga-estado.md)                                 | Estado real de cada historia de usuario (HU-01 a HU-30)            |
| [`docs/taiga-borrador.md`](taiga-borrador.md)                             | Lo subido a Taiga el 8 de noviembre: HU-31 a HU-59 y estados       |
| [`docs/pruebas/sprint-0.md`…`sprint-6.md`](pruebas)                       | Registros de pruebas por sprint                                    |
| [`docs/auditoria-ux.md`](auditoria-ux.md)                                 | Catálogo de reglas de UX/accesibilidad, hallazgos y recomendados   |
| [`docs/auditoria-seguridad.md`](auditoria-seguridad.md)                   | OWASP Top 10 para LLM y web: hallazgos, correcciones, pendientes   |
| [`docs/auditoria-rendimiento.md`](auditoria-rendimiento.md)               | Core Web Vitals y Lighthouse: mediciones y correcciones            |
| [`docs/performance.md`](performance.md)                                   | FPS con GPU real y medición del documento de grado                 |
| [`docs/observabilidad.md`](observabilidad.md)                             | Registros, salud y alertas por crear en Vercel                     |
| [`docs/orquestador.md`](orquestador.md)                                   | Paciente con el orquestador de NPC: puesta en marcha y emergencias |
| [`docs/reglas-de-calidad.md`](reglas-de-calidad.md)                       | Catálogos de reglas por apartado y cuáles están implementadas      |
| [`docs/rediseno/ux-escala-inmersion.md`](rediseno/ux-escala-inmersion.md) | Decisiones de UX y estándares INACSL de simulación                 |
| [`README.md`](../README.md)                                               | Instalación, scripts, arquitectura y mapa de tests por feature     |

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
- **12 al 18 de noviembre:** orquestador de NPC, cierre del orquestador, tiempo de consulta y
  correcciones de la auditoría de Fable, en producción con las PR #31 y #32.
- **18 y 19 de noviembre (en `develop`):** rediseño de inicio, configurador, Revisiones, fichas,
  casos y Administrador; avatares de cuenta; portada pública y `/manual`; recorridos guiados para
  crear un caso, asignar una práctica y revisar una conversación.
- **19 y 20 de noviembre:** Figma 2.0 al día con el frontend y documento de grado actualizado (ver
  «Documento de grado»).

## Pendiente

Ordenado por lo que más bloquea la entrega. La historia de Taiga va entre paréntesis.

### 1. Bloquea el grado

1. **Evaluación con usuarios:** cuestionarios en Google Forms, sesiones por videollamada,
   evidencia en Drive y análisis (`docs/doc_grado/evaluacion/`). Cinco de las 15 marcas
   `\pendiente{}` dependen de ella.
2. **Antes de la primera sesión:** completar en el consentimiento (Anexo J y
   `evaluacion/01-consentimiento-informado.md`) el correo del director y el contacto del Servicio
   de Psicología.
3. **Las demás marcas `\pendiente{}`**, todas decisiones del autor (lista en «Documento de
   grado»). El documento ya compila sin errores en local.

### 2. Para la sustentación

Antes de todo, **llevar `develop` a `main`** (16 commits de interfaz) cuando termine la auditoría
de Codex y se corrijan sus hallazgos.

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
vieja de la tabla de resultados y no se incluye. El capítulo 1 declara Claude Design (personajes
3D) entre las herramientas de IA; el capítulo 4 y el Anexo H, el origen y las licencias de los
modelos.

**Compilación (8 de noviembre):** primera compilación completa, con MiKTeX 25.12 (XeLaTeX y Biber
2.22) en el equipo del autor. Se corrigieron: `amssymb` faltaba en el preámbulo (las casillas
`\square` de los anexos J a L daban 308 errores), una referencia de los anexos a una tabla del
documento principal (`tab:w22`, imposible entre dos PDF), y cinco tablas que se salían del margen
(62, 5.5, C16, I1 y la hoja de tareas del Anexo J). Ahora ambos compilan sin errores, sin
referencias ni citas sin resolver y sin desbordes: principal 64 páginas, anexos 95. Para
recompilar: `docs/doc_grado/latex/compilar.ps1` (PDF en `docs/doc_grado/pdf/`, auxiliares en
`docs/doc_grado/compilacion/`). Overleaf sigue sirviendo para compartir con los directores.

**Un solo PDF (9 de noviembre):** la plataforma de entrega acepta un archivo, así que los anexos
pasaron a `latex/anexos-cuerpo.tex` y van dentro de `principal.tex`, después de las referencias
(APA 7). `anexos.tex` ya no existe. Ahora «Anexo X» es un vínculo interno; las remisiones de los
anexos al capítulo 3 son `\ref` (incluida `tab:w22`), y la Tabla 3, que estaba repetida en el
Anexo B, solo aparece en el capítulo 3. Los anexos tienen anclajes propios (`\theHsection`), porque
si no los marcadores y la lista de tablas llevaban al capítulo 5. Resultado: `pdf/principal.pdf`,
160 páginas, sin errores ni desbordes, con los 30 vínculos «Anexo X» y las listas de tablas y
figuras comprobados.

**Pasada APA 7 del 7 de noviembre:** anexos B y C con mayúscula solo inicial, coma decimal,
espacio fino de miles y términos en inglés en cursiva; citas escritas a mano convertidas a
biblatex; lista de referencias propia en `anexos.tex`; tablas de anexo numeradas A1, B2…; Brown et
al. (2020) con sus 31 autores; normas colombianas como `@misc`; Hall (1966) citado. Se corrigieron
dos errores de contenido: el Anexo C decía 4,000 para Babylon.js (la matriz da 3,975) y la tabla
de T-08 tenía cruzadas las columnas de _scripting_ y latencia en R3F con 16 a 64 agentes (el texto
del anexo se ajustó). Respaldo previo en el scratchpad de esa sesión.

**20 de noviembre:** el capítulo 4 nombra el orquestador de NPC (cuatro sistemas externos, contenedores, despliegue y selección del proveedor), y los diagramas de contexto y de contenedores se regeneraron con Mermaid (`latex/fuentes-diagramas/final-contexto.mmd` es nuevo). «La simulación» describe el tiempo de consulta, la hoja de remisión, las notas y el modo sin controles; el párrafo de Figma, la versión 2.0. Las figuras de la bandeja, la revisión, las instrucciones, la conversación y el celular son capturas nuevas. Respaldo previo en el scratchpad de esa sesión (`respaldo-latex-2026-11-20`).

Quedan 16 marcas `\pendiente{}` (en el PDF salen en rojo como «[PENDIENTE: …]»), todas del autor:

- Portada: mes y día. Resumen: resultado principal de la evaluación con usuarios.
  Agradecimientos.
- Cap. 1: si los directores exigen un manual aparte; otras herramientas de IA usadas (Claude
  Design ya está declarado; faltan las que solo conoce el autor, como asistentes para la revisión
  bibliográfica).
- Cap. 3: confirmar la pantalla de T-01 a T-12 (resultados de 100 FPS con un monitor de 75 Hz;
  el Anexo B decía 120 Hz y se quitó).
- Anexo C, tabla de T-08: confirmar con los registros las latencias de Babylon.js con 4 o más
  agentes (venían con punto de miles ambiguo; el pico de 64 se leyó como 43 130 ms).
- Cap. 4: revisar la sección con el profesor Fabián Valencia.
- Cap. 5: verificación manual (Anexo I), Lighthouse y NVDA, resultados y discusión de la
  evaluación con usuarios. Cap. 6: conclusión sobre usabilidad y satisfacción.
- Anexo J (consentimiento): correo del director y contacto del Servicio de Psicología.
- Cap. 4: la cita del trabajo de Juan José Moreno sobre el orquestador de NPC (nueva, 20 de
  noviembre).

Las tablas 68 y 71 tienen unos 30 requisitos en «Pendiente: verificación manual» que se cierran
con la pasada del Anexo I. **Lo que más bloquea es la evaluación con usuarios** (cinco marcas
dependen de ella). El documento no está en git; su único respaldo es OneDrive.

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
