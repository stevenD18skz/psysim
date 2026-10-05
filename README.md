# PsySim — Simulador de Escenarios Psicológicos

Plataforma web 3D para la simulación de escenarios de práctica clínica orientada a estudiantes de
psicología, con pacientes virtuales (NPC) conducidos por inteligencia artificial.

Trabajo de grado — Brayan Steven Narváez Valdés, Universidad del Valle.

| Entorno                 | URL                                                                           | Rama      |
| ----------------------- | ----------------------------------------------------------------------------- | --------- |
| Producción              | https://psysim.vercel.app                                                     | `main`    |
| Staging (preview)       | https://psysim-git-develop-brayan-steven-narvaez-valdezs-projects.vercel.app  | `develop` |
| Previews de otras ramas | `https://psysim-git-<rama>-brayan-steven-narvaez-valdezs-projects.vercel.app` | cualquier |

> Los despliegues de preview (incluido staging) están protegidos por **Vercel Authentication**:
> solo los miembros del equipo de Vercel pueden abrirlos. Ver [Tests E2E contra staging](#tests-e2e-contra-staging).

---

## Stack

| Capa           | Tecnología                                                             |
| -------------- | ---------------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router, Turbopack, `proxy.ts`) · React 19 · TypeScript |
| UI             | Tailwind CSS 4 · shadcn/ui (Radix) · lucide-react                      |
| Estado         | Zustand 5 (store por árbol de React, slices)                           |
| Validación     | Zod 4 · React Hook Form                                                |
| Backend / BaaS | Supabase: Auth, PostgreSQL con RLS                                     |
| IA             | Google Gemini vía Vercel AI SDK (`ai` + `@ai-sdk/google`)              |
| Calidad        | ESLint 9 · Prettier · Husky + lint-staged + commitlint                 |
| Pruebas        | Vitest + Testing Library (unitarias) · Playwright (E2E)                |
| Despliegue     | Vercel (Node.js 24)                                                    |

---

## Puesta en marcha

Requisitos: **Node.js 24** (ver `.nvmrc`) y **pnpm 11** (`corepack enable`).

```bash
git clone https://github.com/stevenD18skz/psysim.git
cd psysim
pnpm install                # instala dependencias y activa los git hooks
cp .env.example .env.local  # o: vercel link && vercel env pull .env.local
pnpm dev                    # http://localhost:3000
```

### Variables de entorno

Plantilla completa en [`.env.example`](.env.example). `.env.local` nunca se versiona.

| Variable                               | Dónde             | Descripción                                                       |
| -------------------------------------- | ----------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | cliente/servidor  | URL del proyecto de Supabase                                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente/servidor  | Clave publicable `sb_publishable_…` (antes `ANON_KEY`)            |
| `SUPABASE_SECRET_KEY`                  | **solo servidor** | Clave secreta `sb_secret_…` (antes `SERVICE_ROLE_KEY`). Omite RLS |
| `AI_API_KEY`                           | **solo servidor** | API key de Google Gemini                                          |
| `AI_MODEL`                             | solo servidor     | Modelo de Gemini (por defecto `gemini-3.5-flash`)                 |

Las variables se validan con Zod al arrancar (`src/lib/env`): si falta alguna, el error indica cuál.

### Base de datos (Supabase)

El esquema se versiona como migraciones SQL en [`supabase/migrations`](supabase/migrations).

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...                          # token personal de Supabase
pnpm exec supabase link --project-ref afqofsneoblsjjdvktsu
pnpm exec supabase db push                                    # aplica migraciones pendientes
pnpm db:types                                                 # regenera src/types/database.types.ts
pnpm db:seed                                                  # crea las cuentas de prueba (idempotente)
```

`pnpm db:seed` crea tres docentes de prueba (`docente{1,2,3}@psysim.test`) y una cuenta sin rol
(`sin-rol@psysim.test`) para probar el acceso denegado. Las contraseñas se generan aleatoriamente y
se muestran una sola vez (`pnpm db:seed --reset` las regenera).

Configuración de Auth aplicada al proyecto (también reflejada en `supabase/config.toml`):

- Registro público **desactivado**: las cuentas solo las crea un administrador.
- Longitud mínima de contraseña: 8.
- **Custom Access Token Hook** `public.custom_access_token_hook` activado (añade el rol al JWT).

### Inteligencia artificial

| Parámetro        | Valor                                                        |
| ---------------- | ------------------------------------------------------------ |
| Proveedor        | Google Gemini (Generative Language API) vía Vercel AI SDK 7  |
| URL base         | `https://generativelanguage.googleapis.com/v1beta`           |
| Modelo principal | `gemini-3.5-flash` (`AI_MODEL`), razonamiento `minimal`      |
| Modelo respaldo  | `gemini-3.5-flash-lite` (`AI_MODEL_RESPALDO`)                |
| Límites          | 12 s para el principal, 25 s en total, `maxDuration` de 30 s |

Se eligió `gemini-3.5-flash` por latencia (≈1 s por respuesta corta frente a ≈3–7 s de
`gemini-3.8-flash`), clave para un diálogo fluido con el paciente virtual. Como la latencia del
proveedor varía (el 29/09/2026 `gemini-3.5-flash` llegó a 11–16 s y a devolver 503), el Route
Handler pasa automáticamente al modelo de respaldo si el principal no responde en 12 s o está
saturado. Verificar la conexión:

```bash
pnpm ai:test
```

**Route Handler `POST /api/npc/chat`** (HU-12): recibe `sesion_id`, `npc_id`, `mensaje_usuario` e
`historial`; verifica la sesión del docente (401/403), valida con Zod (400), carga la sesión con
RLS (404 si no es del docente, 409 si ya finalizó), llama a la IA con el prompt **de la sesión**
(el del NPC o el personalizado por el docente) y guarda el intercambio en la tabla `mensaje`.
Responde `respuesta_npc`, `timestamp_respuesta`, `tokens_entrada` y `tokens_salida`. Los errores
de la IA se traducen a 504 (tiempo agotado), 503 (saturación) o 502, sin exponer detalles.

---

## Scripts

| Script                         | Descripción                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| `pnpm dev`                     | Servidor de desarrollo (Turbopack)                           |
| `pnpm build` / `start`         | Build de producción / servidor de producción                 |
| `pnpm lint` / `lint:fix`       | ESLint (cero advertencias permitidas)                        |
| `pnpm typecheck`               | Verificación de tipos con `tsc`                              |
| `pnpm format` / `format:check` | Prettier                                                     |
| `pnpm test`                    | Tests unitarios (Vitest)                                     |
| `pnpm test:coverage`           | Tests unitarios con cobertura                                |
| `pnpm test:e2e`                | Tests E2E (Playwright). Levanta `pnpm dev` si hace falta     |
| `pnpm check`                   | lint + typecheck + formato + tests unitarios                 |
| `pnpm db:types`                | Regenera los tipos de la base de datos                       |
| `pnpm db:seed`                 | Crea las cuentas semilla                                     |
| `pnpm modelos:inspeccionar`    | Informe de los GLB de `public/models` (medidas, animaciones) |
| `pnpm modelos:subir`           | Optimiza los GLB con Draco y los sube a Supabase Storage     |
| `pnpm supabase:test`           | Verifica conexión, RLS y claims del JWT con Supabase         |
| `pnpm ai:test`                 | Verifica la conexión con la API de IA                        |

---

## Arquitectura

```
src/
├── app/
│   ├── (auth)/login/          ← Login del docente (formulario + Server Action)
│   ├── (protected)/           ← Rutas que exigen sesión de docente
│   │   ├── layout.tsx         ← Verificación autoritativa (DAL) + carga del perfil en Zustand
│   │   ├── configuracion/     ← Escenario o caso propio, paciente virtual y datos del estudiante; /casos crea y edita casos
│   │   └── simulacion/        ← Simulación 3D de la sesión en curso (HU-08/09/10)
│   ├── api/npc/chat/          ← Route Handler del paciente virtual (HU-12)
│   ├── acceso-denegado/       ← Página para cuentas sin rol docente
│   ├── dev/                   ← Herramientas solo de desarrollo (galería de modelos, escenas)
│   └── page.tsx               ← Página pública de presentación
├── components/
│   ├── 3d/                    ← React Three Fiber: SceneCanvas, SceneLoader, sala, muebles, NPC
│   ├── casos/                 ← Constructor guiado de casos, vista previa del prompt y prueba del paciente
│   ├── configuracion/         ← Configurador de la sesión y "Mis casos"
│   ├── simulacion/            ← Simulación: HUD, panel de conversación, errores y cierre
│   ├── layout/                ← Navegación principal, botón de logout
│   └── ui/                    ← Componentes de shadcn/ui
├── lib/
│   ├── auth/                  ← Rutas, DAL (verificación de sesión/rol), Server Actions
│   ├── conversacion/          ← Máquina de estados del NPC y envío de mensajes (HU-13/14/16)
│   ├── escena/                ← Colisiones, encuadre, animaciones, ajuste de modelos, Storage
│   ├── ia/                    ← Llamada al modelo de lenguaje con respaldo y clasificación de errores
│   ├── escenarios/            ← Consultas y Server Actions de escenarios y sesiones
│   ├── casos/                 ← Casos propios del docente: composición del prompt, opciones y Server Actions
│   ├── env/                   ← Validación de variables de entorno
│   └── supabase/              ← Clientes: browser, server, admin (clave secreta), proxy
├── schemas/                   ← Esquemas Zod compartidos cliente/servidor
├── store/                     ← Store de Zustand (slices)
├── types/                     ← Tipos globales y tipos generados de la BD
└── proxy.ts                   ← Proxy de Next.js (antes middleware)
public/models/                 ← Modelos 3D fuente (se publican optimizados en Supabase Storage)
public/scenes/                 ← JSON de la escena 3D de cada escenario (docs/modelos-3d.md)
public/draco/                  ← Decodificadores Draco autoalojados
supabase/                      ← config.toml y migraciones SQL
scripts/                       ← Scripts de verificación y seed
e2e/                           ← Tests de Playwright
docs/                          ← Documentación y registros de pruebas
```

### Autenticación y autorización (defensa en profundidad)

1. **Proxy** (`src/proxy.ts`): en cada petición refresca la sesión y verifica la firma del JWT
   con `getClaims()` (claves asimétricas, sin llamada de red). En `/configuracion` y
   `/simulacion` redirige a `/login` sin sesión, o a `/acceso-denegado` si el claim
   `rol_usuario` del JWT no es `docente`.
2. **Data Access Layer** (`src/lib/auth/dal.ts`): el layout y cada página protegida validan la
   sesión con el servidor de Auth (`getUser()`, detecta sesiones revocadas) y leen el rol de la
   tabla `usuario`. Es la verificación autoritativa.
3. **RLS en PostgreSQL**: aunque el cliente use la clave publicable, cada docente solo lee su
   perfil, el catálogo activo y sus propias sesiones y configuraciones. Los privilegios se
   conceden por columna: por ejemplo, de una sesión solo se pueden modificar `estado` y `fin`.

El rol llega al JWT mediante un **Custom Access Token Hook** de Supabase, lo que evita consultar
la base de datos en cada petición del proxy.

### Escena 3D

La simulación monta la escena descrita por `public/scenes/e-XX.json` (validado con Zod): una sala
procedural cálida, mobiliario (procedural o GLB desde Supabase Storage, comprimido con Draco),
el paciente virtual y controles en primera persona (WASD + ratón con Pointer Lock) con colisiones
por cajas delimitadoras. El canvas limita el `devicePixelRatio` a 1,5 y lo baja a 1 si el
rendimiento cae (`PerformanceMonitor`). Añade `?debug=1` a la URL de la simulación para ver los FPS.
Guía de modelos y escenas: [`docs/modelos-3d.md`](docs/modelos-3d.md).

### Conversación con el paciente (Sprint 3)

Al acercarse al paciente (≤ 3,2 m) el estudiante inicia la conversación con la tecla **E**, un clic
sobre él o el botón "Conversar con …". La cámara se desplaza con suavidad hasta quedar frente al
paciente y aparece el panel de conversación (Enter envía, Shift + Enter inserta una línea).

El estado del paciente sigue la máquina de estados de la sección 4.3.4
(`src/lib/conversacion/estados-npc.ts`): `inactivo → esperando_input → procesando → respondiendo →
esperando_input`, con `error_comunicacion` (Reintentar / Finalizar sesión) y `sesion_finalizada`.
Las transiciones no válidas se rechazan (p. ej. un doble envío). El paciente reacciona a cada
estado: sigue al estudiante con la mirada, baja la cabeza al reflexionar y asiente y mueve la boca
al responder; con un GLB riggeado usa sus clips `Idle`, `Pensando` y `Hablando` con fundidos de
0,3 s. La conversación se guarda en la tabla `mensaje` y se recupera al recargar la página.

---

## Flujo de trabajo con Git

| Rama         | Propósito                                | Despliegue          |
| ------------ | ---------------------------------------- | ------------------- |
| `main`       | Código estable en producción             | Producción (Vercel) |
| `develop`    | Integración continua de funcionalidades  | Staging (preview)   |
| `feature/*`  | Nuevas funcionalidades (desde `develop`) | Preview             |
| `fix/*`      | Corrección de errores                    | Preview             |
| `hotfix/*`   | Correcciones urgentes sobre `main`       | Preview             |
| `docs/*`     | Documentación                            | Preview             |
| `refactor/*` | Refactorización sin cambios funcionales  | Preview             |

Flujo: `feature/*` → PR a `develop` (staging) → PR de `develop` a `main` (producción).

### Commits

Se usa [Conventional Commits](https://www.conventionalcommits.org/es/), validado por
**commitlint** en el hook `commit-msg`:

```
feat(auth): implementar login con Supabase
fix(proxy): conservar cookies al redirigir
docs(readme): documentar variables de entorno
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

### Git hooks

- **pre-commit**: `lint-staged` (ESLint `--fix` + Prettier sobre los archivos preparados) y
  `pnpm typecheck`. El commit se rechaza si algo falla.
- **commit-msg**: `commitlint`.

---

## Pruebas

```bash
pnpm test                 # unitarias
pnpm test:e2e:install     # (una vez) instala Chromium para Playwright
pnpm test:e2e             # E2E contra http://localhost:3000
```

Los tests E2E autenticados usan las credenciales de `.env.test.local`
(`E2E_DOCENTE_CORREO`, `E2E_DOCENTE_CONTRASENA`, `E2E_SIN_ROL_CORREO`, `E2E_SIN_ROL_CONTRASENA`);
si no existen, esos tests se omiten. Registro de pruebas del Sprint 1:
[`docs/pruebas/sprint-1.md`](docs/pruebas/sprint-1.md).

### Tests E2E contra staging

1. En Vercel: _Settings → Deployment Protection → Protection Bypass for Automation_, genera un
   secreto.
2. Ejecuta:

```bash
PLAYWRIGHT_BASE_URL=https://psysim-git-develop-brayan-steven-narvaez-valdezs-projects.vercel.app \
VERCEL_AUTOMATION_BYPASS_SECRET=<secreto> \
pnpm test:e2e e2e/smoke.spec.ts
```

---

## Seguridad

- `.env*` está ignorado por Git (excepto `.env.example`).
- `SUPABASE_SECRET_KEY` y `AI_API_KEY` solo se usan en el servidor (`import 'server-only'`).
- Encabezados de seguridad globales en `next.config.ts` (`X-Frame-Options`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`); HSTS lo añade Vercel.
- Las respuestas que renuevan la sesión se marcan como `no-store` para que ninguna CDN las
  almacene.
- Redirección post-login protegida contra _open redirects_ (solo rutas internas protegidas).
- Extensión `pg_graphql` desactivada: la aplicación solo usa la API REST.
- Pendiente (requiere plan Pro de Supabase): protección contra contraseñas filtradas
  (HaveIBeenPwned).

## Licencia

[Apache 2.0](LICENSE)
