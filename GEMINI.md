@AGENTS.md

# PsySim: guía y contexto para continuar en Antigravity (`GEMINI.md`)

Simulador web 3D de entrevistas clínicas para estudiantes de psicología (trabajo de grado,
Universidad del Valle). El estudiante conversa con un paciente simulado por IA (Orquestador de NPC
como proveedor principal y Gemini como respaldo automático) dentro de un consultorio 3D; el docente
asigna casos con códigos de acceso, revisa la transcripción y publica retroalimentación. La
plataforma **no evalúa al estudiante** de forma automática (ni rúbricas, ni autoevaluación, ni
retroalimentación generada): esa decisión es del autor y de sus directores.

El detalle de instalación, scripts y arquitectura está en `README.md`; el sistema visual, en
`DESIGN.md`; el estado general e histórico del proyecto, en `docs/estado-del-proyecto.md`.

---

## Prioridad actual (noviembre de 2026): mejora profunda de UI y UX por componente, bloque o sección

Durante estos días la prioridad del proyecto es revisar y mejorar a fondo la interfaz y la
experiencia de usuario en entregas puntuales e iterativas, antes del cierre documental y el
despliegue final.

### Cómo trabajamos en cada pedido

1. **El usuario señala un objetivo concreto:** un componente, bloque, tarjeta, formulario, flujo o
   sección específica de la aplicación.
2. **Se aplican juntos los tres plugins globales (`impeccable`, `intent` y `antislop`):**
   - **`intent`** guía el criterio de UX: propósito visible en cada pantalla («qué puedo hacer aquí,
     por qué importa y qué pasa después»), flujo cognitivo sin fricción, arquitectura de la
     información, accesibilidad estructural (`/include`), resiliencia fuera del camino feliz
     (`/fortify`: estados vacío, carga, error y recuperación) y redacción clara (`/articulate`).
   - **`impeccable`** dirige el oficio visual y de interacción: composición, escala y contraste
     tipográfico (`Archivo` con eje `wdth`), densidad acorde al modo de la superficie (`Operate` en
     paneles, `Persuade` en inicio público, `Read` en guías, `Experience` en la simulación 3D),
     microinteracciones con sentido y acabados de detalle (`polish`, `layout`, `typeset`, `delight`,
     `clarify`, `distill`, `harden`).
   - **`antislop`** (activo en modo `during` según
     `C:\Users\braya\AppData\Roaming\antislop\settings.json`) actúa como filtro estricto: cero
     plantillas genéricas de IA, razón explícita para cada decisión visual relevante, contraste WCAG
     AA verificado, foco visible, operación completa por teclado, diseño responsivo sin desbordes
     (390 px, 768 px y escritorio; áreas táctiles ≥ 44 px) y verificación del _Delivery Gate_ antes
     de entregar.
3. **Estándar esperado en cada intervención:**
   - **Jerarquía y legibilidad al máximo:** un foco principal claro por vista o bloque, lectura cómoda,
     espaciado estructural y subordinación limpia de los metadatos y acciones secundarias.
   - **Claridad y economía cognitiva:** reducir ruido visual, duplicidad y pasos innecesarios; cada
     etiqueta, ayuda contextual y estado explica lo justo en lenguaje humano.
   - **Creatividad e innovación con criterio:** proponer soluciones visuales e interactivas frescas y
     memorables que mejoren el uso real dentro del sistema «Nogal y salvia» de `DESIGN.md` (sin
     romper la regla de una sola acción de latón por vista, la terracota exclusiva del paciente, los
     tokens del tema ni `src/lib/calidad.test.ts` / `src/lib/redaccion.test.ts`).
   - **Criterio de entrega:** leer el componente y su contexto (`DESIGN.md`, `PRODUCT.md`,
     `.impeccable/`), implementar cubriendo todos los estados y validar con `pnpm check` antes de
     dar por cerrado el cambio.

### Leyes de UX de referencia (`https://lawsofux.com/`)

Además de `intent`, `impeccable` y `antislop`, cada revisión de UI y UX en PsySim contrasta las
decisiones con las leyes de psicología aplicada al diseño de interfaces de `lawsofux.com`:

- **Carga cognitiva y toma de decisiones:**
  - **Ley de Hick:** menos opciones visibles a la vez reducen el tiempo de decisión; descompón tareas
    complejas en pasos o pestañas y destaca la opción recomendada.
  - **Sobrecarga de elección (_Choice Overload_) y Ley de Miller / _Chunking_:** agrupa la
    información en bloques pequeños y significativos (5 a 7 elementos como máximo por grupo) para
    no saturar la memoria de trabajo (_Working Memory_).
  - **Ley de Tesler (conservación de la complejidad):** la complejidad esencial del flujo clínico no
    desaparece, pero la absorbe el sistema (valores por defecto útiles, atajos y reglas en el
    servidor) en lugar de trasladarla al docente o al estudiante.
  - **Navaja de Occam:** ante dos diseños igual de claros, elige el más simple y con menos elementos
    decorativos o supuestos.
  - **Principio de Pareto (80/20):** prioriza visualmente el 20 % de las acciones que resuelven el
    80 % del uso cotidiano; mueve lo avanzado o poco frecuente a un diálogo o revelación progresiva.
  - **Paradoja del usuario activo:** las personas casi nunca leen instrucciones largas antes de
    actuar; la interfaz debe explicarse con etiquetas concretas, affordances visibles y ayudas breves
    justo donde se usan.
- **Percepción visual (principios de la Gestalt):**
  - **Ley de Proximidad:** los controles que actúan sobre un dato van junto a ese dato (por ejemplo,
    «Copiar código» junto al código y «Copiar enlace» junto al enlace).
  - **Ley de Región Común y Conexión Uniforme:** encierra o conecta visualmente los elementos que
    pertenecen a una misma acción o unidad lógica para que se lean como un solo bloque.
  - **Ley de Similitud:** controles que cumplen una misma función comparten forma, peso y estilo; las
    diferencias visuales se reservan para diferencias reales de jerarquía.
  - **Ley de Prägnanz:** prefiere estructuras geométricas limpias y regulares que el ojo interprete
    al instante sin ruido visual.
  - **Efecto Von Restorff (aislamiento) y Atención Selectiva:** un único foco destacado por vista o
    modal (como el botón de latón o el código generado en nogal) atrae la atención sin competir con
    el resto.
- **Interacción, velocidad y ergonomía:**
  - **Ley de Fitts:** los objetivos frecuentes o clave deben ser suficientemente grandes (mínimo
    44 × 44 px en móvil) y quedar cerca del punto de atención donde ocurre la tarea.
  - **Ley de Jakob:** respeta los patrones que los usuarios ya conocen (un ícono de desplegable abre
    y cierra su lista, Escape cierra un modal, Enter confirma en un buscador).
  - **Umbral de Doherty (< 400 ms):** responde de inmediato a cada interacción (estados de carga,
    confirmaciones breves como «Copiado» y transiciones rápidas de 150 a 300 ms).
  - **Ley de Postel (robustez):** sé tolerante con lo que escribe o intenta la persona (búsquedas
    flexibles, recuperación entre pestañas, deshacer sin fricción) y preciso en lo que muestra el
    sistema.
- **Memoria, progreso y cierre:**
  - **Efecto de gradiente de meta (_Goal-Gradient_) y Efecto Zeigarnik:** muestra progreso claro en
    flujos por pasos (completado, actual y pendiente) para sostener el foco hasta cerrar la tarea.
  - **Efecto de posición serial:** ubica la información y acciones más importantes al principio o al
    final de una lista, barra o modal.
  - **Regla del pico y el final (_Peak-End Rule_):** cuida con especial esmero el momento de mayor
    valor y el cierre del flujo (por ejemplo, el modal de código listo tras asignar una práctica).
  - **Efecto estética-usabilidad:** una interfaz serena, ordenada y cuidada genera confianza y se
    percibe más fácil de usar, siempre respaldada por usabilidad real.

---

## Estado actual y base reciente (actualizado al 18 de noviembre de 2026)

### 1. Ramas, Git y entorno

- **Ramas activas:** solo existen `main` (producción) y `develop` (staging). Las ramas previas
  (`test/verificacion-supabase-al-dia` y `feat/orquestador-npc`) ya se fusionaron en `develop` y se
  eliminaron tanto en local como en `origin`.
- **Último commit en `develop` (`origin/develop` al día):** `0f861b2`
  (`Merge pull request #32 from stevenD18skz/develop`; sobre la base de `bff0b5d` se integraron
  mejoras en el inicio, listados paginados, sesiones, casos, popover de cuenta, accesibilidad y
  orquestador).
- **GitHub CLI (`gh`):** autenticado para `stevenD18skz` en
  `C:\Users\braya\AppData\Roaming\GitHub CLI\hosts.yml`.
- **Plugins globales instalados en Antigravity (`C:\Users\braya\.gemini\config\`):**
  - `antislop` (v3.2.30, preferencia global `mode: "during"` en
    `C:\Users\braya\AppData\Roaming\antislop\settings.json`)
  - `intent` (v1.7.4)
  - `impeccable` (v4.9.1)

### 2. Orquestador de NPC verificado en vivo

- Migración `20261111010000_orquestador_npc.sql` aplicada en Supabase remoto (`afqofsneoblsjjdvktsu`).
- Cuenta `teacher` (`brayan.steven.narvaez@correounivalle.edu.co`) activa contra
  `https://ai-npc-orchestrator-production.up.railway.app` y configurada en `.env.local` con
  `IA_PROVEEDOR=orquestador`.
- Los 12 casos oficiales (`E-01` a `E-12`) están sincronizados en el orquestador mediante
  `pnpm orquestador:sincronizar` (tabla `public.npc_orquestador` poblada) y se verificó el ciclo
  completo de sesión en vivo (`POST /sessions/start` → `POST /conversation/{id}/stream` →
  `PATCH /sessions/{id}/time` → `PATCH /sessions/{id}/end`).

### 3. Datos de prueba en Supabase (`scripts/seed-docentes.ts`, commit `d59f092` y ampliado)

- 1 Administrador de prueba (`admin@psysim.test`, `ADM-0001`).
- 3 docentes de prueba (`docente1@psysim.test`, `docente2@psysim.test`, `docente3@psysim.test`).
- 6 estudiantes de prueba (`estudiante1@psysim.test` a `estudiante5@psysim.test` y
  `estudiante7@psysim.test`, códigos `209990001` a `209990005` y `209990007`):
  - `admin@psysim.test`: `estudiante7@psysim.test` (`209990007`).
  - `docente1@psysim.test`: `estudiante1@psysim.test` (`209990001`) y `estudiante2@psysim.test`
    (`209990002`).
  - `docente2@psysim.test`: `estudiante3@psysim.test` (`209990003`) y `estudiante4@psysim.test`
    (`209990004`).
  - `docente3@psysim.test`: `estudiante5@psysim.test` (`209990005`).

### 4. Vista de Administrador y mejoras de UI/UX recientes (`2d45084` a `0f861b2` y cambios del 17 y 18 de noviembre en trabajo)

1. **Vista global de estudiantes y proveedor IA para el Administrador (`2d45084`):**
   - El `superadmin` ve todos los estudiantes de todos los docentes en `/estudiantes`, puede
     filtrarlos por docente, abrir cualquier ficha en `/estudiantes/[id]` y asignarles o gestionar
     prácticas desde `/configuracion`.
   - Nota técnica clave: `public.estudiante` tiene dos claves foráneas hacia `public.usuario`
     (`docente_id` y `usuario_id`), por lo que en PostgREST siempre se debe desambiguar con
     `usuario!estudiante_docente_id_fkey ( nombre )`.
   - `/admin/ia` muestra siempre la tarjeta de estado de configuración del proveedor
     (`Orquestador de NPC`, respaldo `Gemini`, capacidad y cuentas configuradas) aunque haya 0
     prácticas registradas en el periodo seleccionado.
2. **Componentes base, skeletons y ayuda contextual (`ea90126`):**
   - `AyudaContextual` (`src/components/comun/ayuda-contextual.tsx`): ícono de ayuda accesible por
     ratón, teclado y toque táctil.
   - `Indicadores` (`src/components/comun/indicadores.tsx`): soporta `detalle`, `ayuda` (tooltip),
     `sinMarco` y ajuste completo en 3 celdas móvil (`col-span-2 sm:col-span-1`).
   - `CargandoPanel` (`src/app/(protected)/(panel)/loading.tsx`): corregido con el contenedor
     `mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10` y silueta realista de
     encabezado, indicadores y listas.
   - `Button`, `Input`, `Textarea`, `Tooltip` y `SelectorLista` refinados siguiendo `DESIGN.md`
     («Nogal y salvia»).
3. **Asignar práctica y «Crear caso a partir de» (`bff0b5d` y `0f861b2`):**
   - **Paso 1 de `/configuracion` (`ConfiguradorSesion`):** dividido en pestañas segmentadas
     (**Casos predefinidos** y **Mis casos**) para mostrar una sección a la vez, con insignia del
     caso elegido.
   - **Paso 2 de `/configuracion` (`ResumenPacientePaso` y `AjustesPaciente`):** bloque derecho
     rediseñado con resumen de exigencia, atajos de 1 clic (**Hacerlo más accesible hoy**,
     **Hacerlo más retador hoy**), botón **Ajustar para esta práctica**, opción de plegar y acceso
     a **Crear caso a partir de este**.
   - **«Crear caso a partir de» y variantes de dificultad (`valoresDesdePlantilla`,
     `adaptarDificultadCaso`, `SelectorPlantillaCaso`):** permite crear un caso propio en el
     constructor guiado (`/configuracion/casos/nuevo?desde=<id>`) partiendo de cualquier caso
     oficial (`E-01`..`E-12`) o propio, y adaptar su dificultad (**Básico**, **Intermedio**,
     **Avanzado**) con un clic.
4. **Refinamiento UI/UX de portada (`/`, `/manual`) e inicio de Administrador (`/inicio`) — 17 de noviembre de 2026 (pendiente de commit en `develop`):**
   - **Portada pública y `/manual` (`src/app/page.tsx`, `src/app/manual/page.tsx`, `src/components/landing/`):**
     navegación con subrayado en latón; `HeroConsultorio` con imágenes `unoptimized` y rotación
     aleatoria automática cada `6500 ms` sin controles manuales (pausa al enfocar o con
     `reducir movimiento`); línea temporal de 5 pasos en `CicloPractica`; tarjetas en arco sin
     esquinas blancas en `EscenariosGaleria` y `RevisionIlustrativa` con acceso al manual.
   - **Inicio de Administrador (`PanelPlataforma`, `src/components/inicio/panel-plataforma.tsx`):**
     dos franjas claras de 3 KPIs: **Toda la plataforma** (`Docentes activos`, `Estudiantes` y
     **`Practicando ahora`** en la 3.ª posición superior) y **Tus estudiantes** (cifras exclusivas del
     Administrador como docente: `Tus estudiantes`, `Por revisar` con `Nota media` propia y
     `Tus prácticas`). Marca `Tú` en **Actividad por docente** y refresco automático también ante
     prácticas activas en toda la plataforma.
   - **Resumen del Orquestador (`ResumenOrquestador`, `src/components/inicio/resumen-orquestador.tsx`):**
     bloque en la columna derecha de `/inicio` bajo `Tu bandeja`, alimentado con `obtenerMetricasIa(7)`:
     reparto Orquestador vs Respaldo Gemini, pasos a Gemini, latencia media/`p95`, fallos/esperas,
     cupo simultáneo y motivo principal.
   - **Bandeja paginada (`BandejaDocente`, `ListaPaginada`, `formatearVencimientoCodigo`):**
     filas de **Practicando ahora** y **Por revisar** reorganizadas en 2 niveles; **Códigos sin usar**
     con código institucional bajo el nombre del estudiante a la izquierda y vencimiento natural a
     la derecha (`Vence hoy`, `Vence mañana`, `Vence en X días` en `America/Bogota`); paginación
     local por bloque (`3`–`4` en riel lateral, `5`–`6` en columnas) para equilibrar columnas ante 20+
     elementos.
   - **Ícono «en vivo» `((o))` (`IndicadorEnVivo`, `src/components/comun/indicador-en-vivo.tsx`):**
     ondas concéntricas animadas solo bajo `prefers-reduced-motion: no-preference`, unificado en
     `InsigniaEstado`, `Indicadores`, `BarraEstudiante`, `/inicio`, `/estudiantes`, `/practicas` y
     `/sesiones/[id]`.
5. **Refinamiento UI/UX de `/configuracion` y modal de código generado (18 de noviembre de 2026, pendiente de commit en `develop`):**
   - **Leyes de UX (`lawsofux.com`):** incorporadas arriba en `GEMINI.md` como criterio operativo
     junto con `intent`, `impeccable` y `antislop`.
   - **Modal enfocado para «Ver o editar el texto completo (avanzado)» (`AjustesPaciente`,
     `ConfiguradorSesion`):** reemplaza el `<details>` en línea por un diálogo `sm:max-w-3xl` con la
     misma anatomía que «Ver las 15 reglas exactas», estado del texto, contador de palabras y
     caracteres, **Copiar texto**, **Volver al original**, aviso de edición manual y propagación de
     errores de validación dentro y fuera del diálogo.
   - **Buscador de estudiantes (`BuscadorEstudiante`):** el ícono derecho (`<>`, `ChevronsUpDown`)
     ahora es un `<button type="button">` real que abre y cierra la lista sin perder el foco del
     campo, junto con el botón de limpiar búsqueda accesible.
   - **Modal «Código listo para {estudiante}» (`CodigoGenerado`, `BotonCopiar`, `BotonCompartir`):**
     tarjeta de nogal más protagonista (`rounded-2xl`, filo sutil en latón, código en `2.35rem`) con
     botón solo ícono `44 × 44 px` y tooltip (`Copiar código` / `Copiado`) junto al código; campo
     compuesto de **Enlace directo** con botón solo ícono + tooltip a la derecha (`Copiar enlace`);
     bloque dedicado **Enviar instrucciones** con `Compartir` en variante primaria de nogal (una
     sola acción de latón: `Listo`) y cuerpo desplazable en pantallas cortas.
   - **Pulido general de `/configuracion` (`ConfiguradorSesion`, `ResumenPacientePaso`,
     `GuardarComoCaso`):** recuperación entre pestañas cuando una búsqueda coincide solo en la otra
     sección, botón `X` en el chip del caso elegido, Paso 3 con duración y vigencia en 2 columnas y
     píldoras de `44 px` en móvil, corrección de desborde móvil en `GuardarComoCaso` y retiro del
     ícono genérico `Sparkles`.

### 5. Qué sigue

1. **Prioridad activa (refinamiento de UI/UX pieza por pieza):** continuar con la siguiente vista o
   bloque que indique el usuario (aplicando `impeccable`, `intent`, `antislop` y las Leyes de UX).
   Ya quedaron revisados portada (`/`), `/inicio` de Administrador y `/configuracion` (pendientes
   de commit).
2. **Al terminar esta fase de UI/UX (dejado para el cierre por indicación del usuario):**
   - Revisar y commitear en `develop` los cambios de UI/UX tras validar `pnpm check`.
   - Actualizar la documentación (`docs/orquestador.md`, `docs/estado-del-proyecto.md` y el aviso de
     privacidad en `/privacidad`).
   - Configurar las variables de entorno del orquestador en **Vercel** (`IA_PROVEEDOR`,
     `ORQUESTADOR_URL`, `ORQUESTADOR_CORREO`, `ORQUESTADOR_CONTRASENA`, etc.) antes de fusionar
     `develop` en `main`.

---

## Stack

Next.js 16 (App Router, Turbopack, `src/proxy.ts` en lugar de middleware) · React 19 · TypeScript
estricto · Tailwind CSS 4 + shadcn/ui · Zustand 5 · Zod 4 + React Hook Form · Supabase (Auth,
PostgreSQL con RLS, Storage) · Vercel AI SDK 7 con `@ai-sdk/google` · React Three Fiber/drei ·
Vitest + Testing Library · Playwright · pnpm 11 · Node 24 · despliegue en Vercel.

Next 16 cambió APIs: antes de usar una que no conozcas bien, léela en `node_modules/next/dist/docs/`.
Ejemplos ya vistos: `error.tsx` recibe `retry` (no `reset`); en un `catch` dentro de
`startTransition` que llama una Server Action con `redirect`, llamar primero a
`unstable_rethrow(error)`.

## Comandos

```bash
pnpm dev                        # http://localhost:3000
pnpm check                      # lint + typecheck + format:check + test (correrlo antes de cada commit)
pnpm test                       # Vitest; pnpm test <ruta> para un archivo
pnpm test:e2e                   # Playwright (usa .env.test.local); usar --workers=1 si hay flakes de IA/3D
pnpm orquestador:sincronizar    # sincroniza los casos activos con el orquestador de NPC
pnpm db:types                   # regenera src/types/database.types.ts (requiere SUPABASE_ACCESS_TOKEN)
```

El pre-commit corre lint-staged y `pnpm typecheck`; commit-msg corre commitlint. En un clon nuevo
(sin `.next/`), `pnpm typecheck` falla con `Cannot find name 'PageProps'` hasta correr
`pnpm exec next typegen`. Sin `.env.local` no hay acceso a Supabase ni a la IA: las pruebas
unitarias funcionan igual (usan valores ficticios), los E2E y `pnpm build` no.

## Mapa del código

- `src/app/(auth)`: login, modo presencial (`/entrega`). `src/app/(protected)/(panel)`: pantallas del
  docente, del estudiante y del Administrador. `src/app/(protected)/simulacion`: la práctica 3D.
- `src/app/api`: `npc/chat` (paciente IA), `metrics/save` (cierre con métricas), `telemetria`,
  `salud`.
- `src/lib/<dominio>/`: lógica por dominio. Cada carpeta separa `actions.ts` (Server Actions),
  `queries.ts` (lecturas) y funciones puras con su `*.test.ts` al lado.
- `src/lib/auth/dal.ts`: verificación autoritativa (`requerirUsuario`, `requerirDocente`,
  `requerirEstudiante`, `requerirSuperadmin`).
- `src/lib/supabase/`: `server.ts` (cliente con RLS), `admin.ts` (clave secreta, omite RLS),
  `client.ts` (navegador), `proxy.ts`.
- `src/lib/ia/`, `src/lib/conversacion/`: prompt, historial, filtro de fuga y máquina de estados del
  paciente. `src/lib/npc/`, `src/lib/escena/`, `src/components/3d/`: rig, gestos, rostro y escena.
- `src/lib/orquestador/`: el paciente con el orquestador de NPC de Juan José Moreno (proveedor
  principal si `IA_PROVEEDOR=orquestador`, con Gemini de respaldo): cliente HTTP, cuentas, turnero,
  sincronización de casos y cierre. Solo servidor. Guía: `docs/orquestador.md`.
- `src/schemas/`: esquemas Zod compartidos por cliente y servidor.
- `supabase/migrations/`: esquema versionado. Es la fuente de verdad de los permisos.
- `public/scenes/e-XX.json`: escena de cada caso oficial (E-01 a E-12). Los GLB se publican
  optimizados en Supabase Storage (`pnpm modelos:subir`).

## Roles y modelo de seguridad

Roles: `superadmin` («Administrador», también es docente), `docente`, `estudiante` (entra con Google,
solo correos `@correounivalle.edu.co`; `psysim.test` para las cuentas de prueba). El registro público
está desactivado: el Administrador crea docentes y el docente registra estudiantes.

Defensa en profundidad, en este orden:

1. `src/proxy.ts`: refresca la sesión, valida el JWT y filtra rutas por el claim `rol_usuario`.
2. DAL en cada layout, página, Server Action y Route Handler: lee el rol y `activo` de la tabla
   `usuario`. **Toda función `'use server'` exportada es un endpoint público**: debe llamar a un
   `requerir*()` y validar su entrada con `safeParse` antes de tocar datos.
3. RLS en PostgreSQL con permisos **por columna**.

Reglas que los tests vigilan (`src/lib/seguridad.test.ts`):

- RLS activado en toda tabla; nada concedido a `anon`.
- Toda función `security definer` lleva `set search_path = ''`, comprueba rol y propiedad con
  `auth.uid()` y tiene `revoke execute ... from public, anon`.
- `createAdminClient()` solo en el servidor (`import 'server-only'`) y solo con ids que ya pasaron
  por RLS. Nunca en un archivo `'use client'`.
- Ningún secreto con prefijo `NEXT_PUBLIC_`.

El prompt del paciente (`sesion.prompt_sistema`) nunca llega al navegador. El contexto de la IA se
arma con lo que guardó el servidor, nunca con el historial que manda el cliente.

## Convenciones

- **Todo en español**: identificadores de dominio (`sesion`, `estudiante`, `requerirDocente`),
  comentarios, mensajes de commit y textos de la interfaz. Los comentarios explican el porqué, no el
  qué.
- **Textos de la interfaz** (`src/lib/redaccion.test.ts` y `docs/guia-de-redaccion.md`): la
  práctica es «práctica» (no «sesión»), el caso es «caso» y el entorno «consultorio» (nunca
  «escenario»), «docente/estudiante» (nunca profesor/alumno), «el paciente» (no «paciente
  virtual»), «terminar» (no «finalizar»), «No pudimos…» (con salida accionable si lleva punto final),
  sin exclamaciones, «…» como un solo carácter y mayúscula solo en la primera palabra.
- **Calidad** (`src/lib/calidad.test.ts`): ningún archivo pasa de 1100 líneas; ningún texto baja de
  12 px; sin `any`, `@ts-ignore`, `TODO/FIXME` ni `console.log`; cada `eslint-disable` dice por qué;
  el servidor registra con `log('area.evento', …)` (sin correos, tokens ni texto de la conversación)
  y las rutas de API que escriben datos incluyen el id de petición.
- Fechas formateadas con `timeZone: 'America/Bogota'`.
- Tailwind 4: `outline-none` anula el estilo del contorno; un `focus-visible:outline-2` necesita
  además `focus-visible:outline-solid`.

## Git

- Ramas: `main` (producción) ← `develop` (staging) ← `feat/*`, `fix/*`, `docs/*`, `refactor/*` que
  salen de `develop`.
- Conventional Commits en español, asunto en minúscula y líneas del cuerpo de 100 caracteres como
  máximo (commitlint).
- **Sin atribución a IA**: nada de `Co-Authored-By` ni «Generated with…» en commits ni PR.
- No hacer commit ni push hasta que el usuario lo pida. Antes de commitear, `pnpm check` en verde.
