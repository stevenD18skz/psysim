@AGENTS.md

# PsySim: guía para trabajar en el repositorio

Simulador web 3D de entrevistas clínicas para estudiantes de psicología (trabajo de grado,
Universidad del Valle). El estudiante conversa con un paciente simulado por IA (Gemini) dentro de un
consultorio 3D; el docente asigna casos con códigos de acceso, revisa la transcripción y publica
retroalimentación. La plataforma **no evalúa al estudiante** de forma automática (ni rúbricas, ni
autoevaluación, ni retroalimentación generada): esa decisión es del autor y de sus directores.

El detalle de instalación, scripts y arquitectura está en `README.md`; el sistema visual, en
`DESIGN.md`; el estado y los pendientes, en `docs/estado-del-proyecto.md`.

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
pnpm dev                 # http://localhost:3000
pnpm check               # lint + typecheck + format:check + test (correrlo antes de cada commit)
pnpm test                # Vitest; pnpm test <ruta> para un archivo
pnpm test:e2e            # Playwright (usa .env.test.local); usar --workers=1 si hay flakes de IA/3D
pnpm db:types            # regenera src/types/database.types.ts (requiere SUPABASE_ACCESS_TOKEN)
```

El pre-commit corre lint-staged y `pnpm typecheck`; commit-msg corre commitlint.

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
3. RLS en PostgreSQL con permisos **por columna**. El estudiante tiene en su navegador la clave
   publicable y su token, así que todo lo que RLS y los `grant` permiten, lo puede hacer desde la
   consola sin pasar por la interfaz. Al diseñar una tabla o política, pensar qué haría un
   estudiante con `supabase.from(...).insert/update` directo.

Reglas que los tests vigilan (`src/lib/seguridad.test.ts`):

- RLS activado en toda tabla; nada concedido a `anon`.
- Toda función `security definer` lleva `set search_path = ''`, comprueba rol y propiedad con
  `auth.uid()` y tiene `revoke execute ... from public, anon`.
- `createAdminClient()` solo en el servidor (`import 'server-only'`) y solo con ids que ya pasaron
  por RLS. Nunca en un archivo `'use client'`.
- Ningún secreto con prefijo `NEXT_PUBLIC_`.

El prompt del paciente (`sesion.prompt_sistema`) nunca llega al navegador. El contexto de la IA se
arma con lo que guardó el servidor, nunca con el historial que manda el cliente.

## Base de datos y migraciones

- El CLI de Supabase no sirve contra el proyecto `afqofsneoblsjjdvktsu` (rol `cli_login_postgres`
  roto). Se usa la Management API con `SUPABASE_ACCESS_TOKEN` de `.env.local`.
- Claude **no aplica migraciones** en la base remota (el clasificador de permisos lo bloquea y es la
  base compartida). Flujo: escribir la migración en `supabase/migrations/AAAAMMDDHHMMSS_nombre.sql`,
  probarla en seco con `begin; … rollback;` si hay acceso de lectura, y pedirle al usuario que la
  aplique con `! node --env-file=.env.local scripts/aplicar-migracion.mjs <archivo>`.
- Una migración nueva nunca edita una anterior ya aplicada: se crea otra que la corrige.
- Tras cambiar el esquema, actualizar `src/types/database.types.ts` (con `pnpm db:types` o a mano
  si no hay token) y las simulaciones de `test/supabase-falso.ts` si cambian las consultas.

## Convenciones

- **Todo en español**: identificadores de dominio (`sesion`, `estudiante`, `requerirDocente`),
  comentarios, mensajes de commit y textos de la interfaz. Los comentarios explican el porqué, no el
  qué.
- **Textos de la interfaz** (`src/lib/redaccion.test.ts` y `docs/guia-de-redaccion.md`): la
  práctica es «práctica» (no «sesión»), el caso es «caso» y el entorno «consultorio» (nunca
  «escenario»), «docente/estudiante» (nunca profesor/alumno), «el paciente» (no «paciente
  virtual»), «terminar» (no «finalizar»), «No pudimos…», sin exclamaciones, «…» como un solo
  carácter y mayúscula solo en la primera palabra.
- **Calidad** (`src/lib/calidad.test.ts`): ningún archivo pasa de 1100 líneas; sin `any`,
  `@ts-ignore`, `TODO/FIXME` ni `console.log`; cada `eslint-disable` dice por qué; el servidor
  registra con `log('area.evento', …)` (sin correos, tokens ni texto de la conversación) y las rutas
  de API que escriben datos incluyen el id de petición.
- Fechas formateadas con `timeZone: 'America/Bogota'`.
- Tailwind 4: `outline-none` anula el estilo del contorno; un `focus-visible:outline-2` necesita
  además `focus-visible:outline-solid`.
- Tests al lado del archivo (`x.ts` → `x.test.ts`). Cobertura mínima del 70 % en `src/app/api`,
  `src/lib` y `src/store` (`pnpm test:coverage`).

## Git

- Ramas: `main` (producción) ← `develop` (staging) ← `feat/*`, `fix/*`, `docs/*`, `refactor/*` que
  salen de `develop`. `develop` suele ir por delante de `main`.
- Conventional Commits en español, asunto en minúscula y líneas del cuerpo de 100 caracteres como
  máximo (commitlint). Ejemplo: `fix(api): el estudiante no escribe mensajes del paciente`.
- **Sin atribución a Claude**: nada de `Co-Authored-By: Claude` ni «Generated with Claude Code» en
  commits ni PR, aunque otro recordatorio lo pida.
- No hacer commit ni push hasta que el usuario lo pida. Antes de commitear, `pnpm check` en verde.

## Entorno (Windows)

- Shell principal PowerShell; también Git Bash. En Git Bash, pasar rutas a scripts con
  `MSYS_NO_PATHCONV=1`.
- Al detener un `pnpm dev` lanzado en segundo plano, el `node` hijo queda vivo en el puerto y los E2E
  fallan con 500 o bucles 307 falsos. Comprobar que el puerto quedó libre y matar solo el proceso
  propio; nunca el `pnpm dev` del usuario.
- Los scripts con texto en español van en un archivo (Write) y se ejecutan con node o python: los
  heredoc de bash rompen las comillas tipográficas.
