# Registro de pruebas — Sprint 1: Autenticación y gestión del docente

- **Fecha de ejecución:** 2026-09-24
- **Entorno:** servidor local (`pnpm dev`, Next.js 16.3.6) contra el proyecto de Supabase
  `PychSims` (`afqofsneoblsjjdvktsu`), navegador Chromium (Playwright 1.63).
- **Cuentas:** `docente1@psysim.test` (rol `docente`) y `sin-rol@psysim.test` (sin perfil en
  `usuario`), creadas con `pnpm db:seed`.
- **Automatización:** cada escenario tiene un test E2E en
  [`e2e/autenticacion.spec.ts`](../../e2e/autenticacion.spec.ts). Para repetir la verificación:
  `pnpm test:e2e`.

## HU-02 — Inicio de sesión del docente y persistencia de sesión

| #   | Escenario                                                      | Resultado esperado                                                         | Resultado                                         |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| 2.1 | Enviar el formulario con correo mal formado y contraseña corta | Errores bajo cada campo, sin recargar ni llamar al servidor                | ✅ Aprobado (test unitario `login-form.test.tsx`) |
| 2.2 | Botón de envío durante la petición                             | Deshabilitado y con indicador "Ingresando…"                                | ✅ Aprobado (test unitario `login-form.test.tsx`) |
| 2.3 | Credenciales incorrectas                                       | Mensaje genérico "Correo o contraseña incorrectos." (no indica cuál falló) | ✅ Aprobado                                       |
| 2.4 | Credenciales válidas de docente                                | Redirige a `/configuracion` y muestra el nombre del docente                | ✅ Aprobado                                       |
| 2.5 | Recargar la página con sesión activa                           | La sesión se mantiene                                                      | ✅ Aprobado                                       |
| 2.6 | Abrir una nueva pestaña con sesión activa                      | La sesión se mantiene                                                      | ✅ Aprobado                                       |
| 2.7 | Acceder a `/login` con sesión activa                           | Redirige a `/configuracion` sin mostrar el formulario                      | ✅ Aprobado                                       |
| 2.8 | Acceder a `/simulacion` sin sesión e iniciar sesión            | Tras el login vuelve a `/simulacion`                                       | ✅ Aprobado                                       |
| 2.9 | `siguiente=//evil.com` u otra URL externa                      | Se ignora y redirige a `/configuracion` (sin open redirect)                | ✅ Aprobado (test unitario `routes.test.ts`)      |

## HU-03 — Rutas protegidas y control de acceso por rol docente

| #   | Escenario                                                      | Resultado esperado                                          | Resultado                                   |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| 3.1 | Acceso directo a `/configuracion` sin sesión                   | Redirige a `/login?siguiente=/configuracion`                | ✅ Aprobado                                 |
| 3.2 | Acceso directo a `/simulacion` y a una subruta sin sesión      | Redirige a `/login`                                         | ✅ Aprobado                                 |
| 3.3 | Acceso con sesión válida de docente                            | Permite el acceso                                           | ✅ Aprobado                                 |
| 3.4 | Acceso con token manipulado en la cookie                       | Redirige a `/login` (la firma del JWT no es válida)         | ✅ Aprobado                                 |
| 3.5 | Sesión revocada/expirada durante el uso                        | En la siguiente petición redirige a `/login`                | ✅ Aprobado                                 |
| 3.6 | Credenciales válidas de una cuenta sin rol `docente`           | Muestra `/acceso-denegado` y no deja ninguna sesión abierta | ✅ Aprobado                                 |
| 3.7 | JWT válido sin claim `rol_usuario = docente` en ruta protegida | Redirige a `/acceso-denegado`                               | ✅ Aprobado (test unitario `proxy.test.ts`) |
| 3.8 | La página de acceso denegado                                   | Mensaje claro, sin información técnica ni el error original | ✅ Aprobado                                 |

## HU-04 — Cierre de sesión del docente

| #   | Escenario                                                  | Resultado esperado                                  | Resultado                                       |
| --- | ---------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| 4.1 | Pulsar "Cerrar sesión" en el menú principal                | Redirige a `/login` y elimina las cookies de sesión | ✅ Aprobado                                     |
| 4.2 | Tras el logout, navegar a `/configuracion` y `/simulacion` | Ambas redirigen a `/login`                          | ✅ Aprobado                                     |
| 4.3 | Tras el logout, usar el botón "atrás" del navegador        | No muestra la versión en caché de la ruta protegida | ✅ Aprobado                                     |
| 4.4 | Estado de Zustand tras el logout                           | El slice `auth` queda vacío                         | ✅ Aprobado (test unitario `app-store.test.ts`) |

## Verificaciones de base de datos (`pnpm supabase:test`)

| Verificación                                                      | Resultado                    |
| ----------------------------------------------------------------- | ---------------------------- |
| Conexión desde el servidor con la clave secreta                   | ✅ Aprobado                  |
| Sin sesión, la clave publicable no puede leer ningún perfil (RLS) | ✅ Aprobado                  |
| Con sesión, el docente solo lee su propio perfil (RLS)            | ✅ Aprobado                  |
| El JWT emitido incluye el claim `rol_usuario = docente` (hook)    | ✅ Aprobado                  |
| Los `id` de `usuario` coinciden con los UUID de Supabase Auth     | ✅ Aprobado (`pnpm db:seed`) |
