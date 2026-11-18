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

## Estado actual y qué se hizo en la última sesión (15 de noviembre de 2026)

### 1. Ramas, Git y entorno

- **Ramas activas:** solo existen `main` (producción) y `develop` (staging). Las ramas previas
  (`test/verificacion-supabase-al-dia` y `feat/orquestador-npc`) ya se fusionaron en `develop` y se
  eliminaron tanto en local como en `origin`.
- **Último commit en `develop` (`origin/develop` al día):** `bff0b5d`
  (`feat(casos): permite crear casos a partir de otros, variar dificultad y divide el configurador`).
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

### 3. Datos de prueba en Supabase (`scripts/seed-docentes.ts`, commit `d59f092`)

- 3 docentes de prueba (`docente1@psysim.test`, `docente2@psysim.test`, `docente3@psysim.test`).
- 5 estudiantes de prueba (`estudiante1@psysim.test` a `estudiante5@psysim.test`, códigos
  `209990001` a `209990005`) asignados a los docentes de prueba:
  - `docente1@psysim.test`: `estudiante1@psysim.test` (`209990001`) y `estudiante2@psysim.test`
    (`209990002`).
  - `docente2@psysim.test`: `estudiante3@psysim.test` (`209990003`) y `estudiante4@psysim.test`
    (`209990004`).
  - `docente3@psysim.test`: `estudiante5@psysim.test` (`209990005`).

### 4. Vista de Administrador y mejoras de UI/UX (commits `2d45084` a `bff0b5d`)

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
   - `Indicadores` (`src/components/comun/indicadores.tsx`): soporta `detalle` y `ayuda` (tooltip)
     en cada celda.
   - `CargandoPanel` (`src/app/(protected)/(panel)/loading.tsx`): corregido con el contenedor
     `mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10` y silueta realista de
     encabezado, indicadores y listas.
   - `Button`, `Input`, `Textarea`, `Tooltip` y `SelectorLista` refinados siguiendo `DESIGN.md`
     («Nogal y salvia»).
3. **Página de Inicio (`/inicio`) con KPIs ejecutivos (`a97dac8`):**
   - `PanelEjecutivoAdmin` en `src/app/(protected)/(panel)/inicio/page.tsx`: barra de estado de la
     plataforma con indicador del proveedor de IA, accesos rápidos (`Docentes`, `Estudiantes`,
     `Paciente con IA`), 6 KPIs globales con tooltips y tabla resumen de **Actividad por docente**.
   - Franja de 4 KPIs con tooltips para docentes cuando ingresan con rol `docente`.
4. **Asignar práctica y «Crear caso a partir de» (`bff0b5d`):**
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

### 5. Qué sigue en la próxima sesión

1. **Pruebas desde la interfaz (`http://localhost:3000`):** continuar revisando el flujo de
   administrador, docente y estudiante en el navegador y ajustar cualquier detalle visual o de UX
   que surja.
2. **Al terminar las pruebas de interfaz (dejado para el cierre por indicación del usuario):**
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
