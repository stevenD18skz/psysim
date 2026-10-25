# Registro de pruebas — Sprint 6: Testing, optimización y despliegue beta

- **Fechas de ejecución:** 2026-10-06 (HU-26 y HU-27, adelantadas) y 2026-10-25 (se activan los
  tests del Sprint 4 y se completan HU-28, HU-29 y HU-30). El sprint estaba planeado del 22 al 28
  de octubre.
- **Entorno:** servidor local (`pnpm dev`, Next.js 16.3.6) contra el proyecto de Supabase
  `PychSims` y la API de Google Gemini real. Chromium (Playwright 1.63) con WebGL por SwiftShader.
- **Automatización:**
  - Unitarias (Vitest): `pnpm test` → **1 163 tests** en 85 archivos, todos aprobados (ya no hay
    tests pendientes: los del Sprint 4 se activaron al implementarlo).
  - Cobertura: `pnpm test:coverage` → umbral del 70 % cumplido en las tres carpetas medidas
    (`app/api` 97,9 %, `lib` 79,9 %, `store` 98,5 % de líneas).
  - E2E (Playwright): ver «Resultado de la corrida completa» al final.

## Tests del Sprint 4 (ya activos)

Los tests del Sprint 4 se habían escrito con el contrato de Taiga antes que su código y se
omitían solos mientras faltaba el archivo (`test/pendiente.ts`). Al implementar el sprint se
activaron y se eliminó ese mecanismo: hoy son tests normales.

| Archivo de test                          | Historia | Estado                                                    |
| ---------------------------------------- | -------- | --------------------------------------------------------- |
| `src/lib/metrics.test.ts`                | HU-18    | ✅ Contrato intacto; se añadieron proximidad y el cuerpo  |
| `src/app/api/metrics/save/route.test.ts` | HU-19    | ✅ Contrato intacto; 7 casos más (403 docente, 404, 409…) |
| `e2e/resultados.spec.ts`                 | HU-21    | ✅ Adaptado a los dos roles (ver `sprint-4.md`)           |
| `e2e/flujo-completo.spec.ts`             | HU-20    | ✅ El cierre ahora llega a `/resultados`                  |

Cambios respecto al contrato original: en `/resultados` el estudiante tiene «Ir a Mis prácticas» y
«Cerrar sesión» (la «Nueva sesión» y «Cerrar» son del docente), y una sesión ajena lleva al inicio
del rol, no a `/configuracion`, que el estudiante no puede abrir.

## HU-26 — Suite de tests unitarios

| #     | Escenario                                                                             | Resultado esperado                                              | Resultado                                                             |
| ----- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| 26.1  | T01: `/api/npc/chat` con cuerpo válido                                                | 200 con `respuesta_npc` (y `emocion_npc`)                       | ✅ Aprobado (`route.test.ts`)                                         |
| 26.2  | T01: `mensaje_usuario` vacío                                                          | 400 con el detalle por campo                                    | ✅ Aprobado                                                           |
| 26.3  | T01: NPC que no pertenece a la sesión                                                 | 404                                                             | ✅ Aprobado                                                           |
| 26.4  | T01: tiempo agotado de la IA                                                          | 504                                                             | ✅ Aprobado                                                           |
| 26.5  | T02: `/api/metrics/save` (200, 400, 409, 401/403, 500 sin detalles internos)          | Según el contrato de HU-19                                      | ✅ Aprobado (`route.test.ts`, 17 tests)                               |
| 26.6  | T03: store — `agregarMensaje`, `limpiarSesion`, transiciones de `actualizarEstadoNPC` | Cambios correctos y sin efectos secundarios                     | ✅ Aprobado (`conversacion.test.ts`, `app-store.test.ts`)             |
| 26.7  | T03: `calcularMetricasAgregadas` (promedio redondeado, máximo, vacío, pureza)         | `latencia_promedio_ms` y `latencia_maxima_ms` correctos         | ✅ Aprobado (`metrics.test.ts`)                                       |
| 26.8  | T04: umbral de cobertura del 70 % en `app/api`, `lib` y `store`                       | `pnpm test:coverage` falla si alguna carpeta queda por debajo   | ✅ Aprobado — `app/api` 97,9 %, `lib` 79,9 %, `store` 98,5 % (líneas) |
| 26.9  | T04: componentes 3D fuera de la cobertura                                             | `components/3d`, `npc` y `dev` excluidos (JSDOM no tiene WebGL) | ✅ Aprobado (`vitest.config.ts`)                                      |
| 26.10 | T04: reporte en `coverage/`, fuera del control de versiones                           | Reporte HTML y resumen JSON; `coverage/` en `.gitignore`        | ✅ Aprobado                                                           |

Para alcanzar el umbral en `lib` (estaba en 68 % de líneas y 57 % de ramas) se añadieron tests de
las Server Actions y consultas que no tenían ninguno, con un cliente de Supabase falso reutilizable
(`test/supabase-falso.ts`):

| Archivo                                   | Qué cubre                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `lib/escenarios/actions.test.ts`          | Iniciar (sin enviar `estudiante_id`), finalizar y comenzar la sesión; errores sin detalles                         |
| `lib/casos/actions.test.ts`               | Crear (reintento por código repetido, archivado si falla el NPC), editar, archivar, variante y prueba del paciente |
| `lib/auth/actions.test.ts`, `dal.test.ts` | Login (mensajes genéricos, 429, sin rol, redirección abierta), logout y verificación del rol                       |
| `lib/escenarios/queries.test.ts`          | Catálogo, sesión en curso (sin el prompt), historial y última sesión                                               |
| `lib/estudiantes/queries.test.ts`         | Lectura de la vista `estudiante_resumen`                                                                           |

## HU-27 — Tests E2E con Playwright

| #    | Escenario                                                                                     | Resultado esperado                                                               | Resultado                                                                |
| ---- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 27.1 | T01: login → E-01 → estudiante → instrucciones → escena 3D → mensaje → respuesta del NPC      | Respuesta visible, sin la etiqueta de emoción; mensajes y estudiante en Supabase | ✅ Aprobado (`flujo-completo.spec.ts`, IA real)                          |
| 27.2 | T01: … → finalizar desde el HUD → resultados con una métrica distinta de cero                 | Pantalla de resultados con intervenciones ≥ 1                                    | ✅ Aprobado (`flujo-completo.spec.ts`, tramo final)                      |
| 27.3 | T02: credenciales válidas → inicio con saludo personalizado                                   | "Hola, {nombre}." con el nombre del docente                                      | ✅ Aprobado (`autenticacion.spec.ts`)                                    |
| 27.4 | T02: credenciales inválidas                                                                   | Error en el formulario, sin redirigir                                            | ✅ Aprobado                                                              |
| 27.5 | T02: cerrar sesión desde el menú                                                              | Queda en `/login` y `/configuracion` vuelve a pedir login                        | ✅ Aprobado                                                              |
| 27.6 | T03: ajustar el prompt de un escenario, guardarlo y volver a elegirlo                         | El prompt cargado coincide con el guardado                                       | ✅ Aprobado (`configuracion.spec.ts`, HU-07; hoy "Guardar como mi caso") |
| 27.7 | T04: resultados (escenario, estudiante, 4 tarjetas, historial, acciones)                      | Según HU-21                                                                      | ✅ Aprobado (`resultados.spec.ts`)                                       |
| 27.8 | Registro de estudiantes: alta en la primera sesión, `/estudiantes`, buscador y "Nueva sesión" | El estudiante aparece con sus sesiones y se elige al volver                      | ✅ Aprobado (`estudiantes.spec.ts`)                                      |

## HU-28 — Optimización de rendimiento del entorno 3D

| #    | Escenario                                                            | Resultado esperado                                                                | Resultado                                                                             |
| ---- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 28.1 | T01: configuración del renderer para hardware con iGPU               | DPR máximo 1,5 que baja a 1 si el rendimiento cae; sombras PCF; tone mapping fijo | ✅ Revisado (`scene-canvas.tsx`, `PerformanceMonitor`); ya estaba aplicado            |
| 28.2 | T02: modelos GLB comprimidos con Draco                               | 111 modelos: 21,5 MB → 4,8 MB; decodificador autoalojado en `public/draco/`       | ✅ Aprobado (`docs/modelos-3d.md` §2)                                                 |
| 28.3 | T02: lo que descarga el navegador al abrir el consultorio E-01       | Cada modelo ≤ 2 MB y el total ≤ 8 MB                                              | ✅ **5 GLB, 0,41 MB en total** (el mayor, 0,38 MB) — `rendimiento.spec.ts`            |
| 28.4 | T02: tiempo hasta ver el consultorio                                 | ≤ 60 s en el peor caso                                                            | ✅ **3,1 s** con renderizado por software                                             |
| 28.5 | T03: FPS en el consultorio E-01 (800 × 600, SwiftShader)             | ≥ 5 FPS por software (piso); ≥ 30 FPS con GPU integrada                           | ✅ **13 FPS** por software · ⏳ medición en hardware representativo pendiente         |
| 28.6 | T03: FPS medidos antes en una GPU integrada (AMD Radeon, 1920 × 889) | ≥ 30 FPS                                                                          | ✅ 75 FPS en el Sprint 2 y 60 FPS con el paciente en el Sprint 3 (tope del navegador) |

**Cómo medir en otro equipo:** `E2E_FPS_MINIMO=30 pnpm test:e2e e2e/rendimiento.spec.ts` (con
`PLAYWRIGHT_BASE_URL` si se mide contra el despliegue). El resultado queda como anotaciones del
test (`carga`, `fps`, `modelos`). El renderizado por software de Playwright es un piso, no el
rendimiento de un computador real.

## HU-29 — Despliegue beta en Vercel

| #     | Escenario                                                     | Resultado esperado                                                                | Resultado                                                              |
| ----- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 29.1  | T01: todas las variables que lee el código están documentadas | `.env.example` lista cada una con su comentario                                   | ✅ Aprobado (`entorno-documentado.test.ts`; faltaban 6 y se añadieron) |
| 29.2  | T01: `.env.example` no trae secretos                          | Claves vacías; sin `sb_secret_`, `AIza…` ni JWT                                   | ✅ Aprobado                                                            |
| 29.3  | T01: variables configuradas en Vercel (producción)            | Las seis obligatorias y las opcionales                                            | ⏳ Requiere el panel de Vercel                                         |
| 29.4  | T02: RLS en toda tabla de `public`                            | Cada `create table` tiene `enable row level security`                             | ✅ Aprobado (`seguridad.test.ts`)                                      |
| 29.5  | T02: funciones `security definer`                             | Todas fijan `search_path`; la de métricas exige rol de estudiante                 | ✅ Aprobado                                                            |
| 29.6  | T02: rol anónimo                                              | Ningún `grant … to anon` en las migraciones                                       | ✅ Aprobado                                                            |
| 29.7  | T02: secretos                                                 | Ningún componente de cliente usa `SUPABASE_SECRET_KEY`; módulos con `server-only` | ✅ Aprobado                                                            |
| 29.8  | T02: Route Handlers                                           | Todos exigen sesión (salvo el callback de OAuth) y responden `no-store`           | ✅ Aprobado                                                            |
| 29.9  | T02: encabezados de seguridad                                 | `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`             | ✅ Aprobado                                                            |
| 29.10 | T02: política de contenido (CSP)                              | `Content-Security-Policy` estricta                                                | ⏳ No se añadió: ver «Pendiente»                                       |
| 29.11 | T03: flujo E2E en producción                                  | `PLAYWRIGHT_BASE_URL=<despliegue> pnpm test:e2e`                                  | ⏳ Requiere el despliegue                                              |
| 29.12 | T04: URL beta y acceso del jurado                             | URL registrada; cuenta de prueba o acceso por Google                              | ⏳ Requiere decisión del autor                                         |

## HU-30 — Documentación del repositorio

| #    | Escenario                                               | Resultado esperado                                                          | Resultado                                                 |
| ---- | ------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- |
| 30.1 | T01: README para instalar, ejecutar y desplegar         | Requisitos, variables, base de datos, IA, scripts, arquitectura y seguridad | ✅ Revisado; se añadió el mapa de tests por funcionalidad |
| 30.2 | T01: la arquitectura del README refleja el código       | Incluye `api/metrics/save`, `resultados`, `metrics.ts` y `contraste.ts`     | ✅ Actualizado                                            |
| 30.3 | T02: `.env.example` con comentarios explicativos        | Cada variable lleva su comentario; las opcionales, comentadas               | ✅ Aprobado (`entorno-documentado.test.ts`)               |
| 30.4 | T03: comentarios JSDoc en componentes y funciones clave | Cada módulo nuevo explica el porqué y su historia (HU)                      | ✅ Aplicado a todo el código nuevo                        |

## Correcciones encontradas al correr la suite

- **`playwright.config.ts`:** con `PLAYWRIGHT_BASE_URL=` (declarada pero vacía en `.env.local`) la
  URL base quedaba vacía y ninguna navegación funcionaba. Ahora una variable vacía cuenta como no
  definida.
- **Login en los E2E:** el rediseño del login añadió el botón "Mostrar la contraseña" y
  `getByLabel('Contraseña')` encontraba dos elementos. Se usa la coincidencia exacta.
- **Limpieza de datos:** cada sesión registra a su estudiante; los E2E ahora borran también la fila
  de `estudiante` (después de las sesiones). Cada archivo usa su propio prefijo de código reservado
  (`2099000`, `2099010`, `2099100`, `2099200`, `2099300`): antes `configuracion` y `conversacion`
  compartían uno y, en paralelo, la limpieza de uno borraba la sesión del otro a mitad de un test.
- **Tiempos de espera:** 15 s para las aserciones de Playwright (Server Actions contra Supabase
  remoto y compilación de rutas en desarrollo) y para los tests de Vitest (formularios que se
  escriben tecla a tecla con la instrumentación de cobertura).
- **Escenarios oficiales:** el test que esperaba exactamente 6 casos fallaba si el docente de pruebas
  tenía casos propios; ahora cuenta los 6 oficiales.
- **Accesibilidad (2026-10-25):** axe-core encontró nombres accesibles que no contenían el texto
  visible (WCAG 2.5.3) en las tarjetas de escenarios de la portada y en el menú de cuenta. Se
  corrigieron (ver `sprint-5.md`, 25.8).
- **Checklist de despliegue (2026-10-25):** `.env.example` no documentaba `NEXT_PUBLIC_SITE_URL`,
  `GOOGLE_SITE_VERIFICATION` ni las cuentas `E2E_ADMIN_*` y `E2E_SIN_ROL_*`.

## Pendiente

- **CSP:** una `Content-Security-Policy` estricta exige permitir Supabase, Google Fonts/OAuth,
  los workers y WASM de Draco y los estilos de Tailwind. Se deja para validarla en un preview de
  Vercel: activarla sin esa prueba podría romper la escena 3D.
- **Protección contra contraseñas filtradas** (HaveIBeenPwned): requiere el plan Pro de Supabase.
- **Variables en Vercel, E2E en producción y URL beta:** acciones en el panel de Vercel.

## Resultado de la corrida completa

Corrida completa (`pnpm test:e2e --workers=2`, 92 tests): **72 aprobados**; los 7 que fallaron
se debieron a la sobrecarga del PC (cierres del navegador y tiempos agotados con dos workers a la
vez) y, uno, a un clic bloqueado por el lienzo 3D en `resultados.spec.ts`. Reejecutados en serie
(`--workers=1`) tras corregirlos: configuración, conversación, estudiantes, flujo completo,
laboratorio y modo presencial **aprobados (28/28)** y `resultados.spec.ts` **5 aprobados y 1
omitido**: la comprobación de la fila de `metrica` en Supabase se omite sola mientras la migración
`20261025010000_metricas_sesion.sql` no esté aplicada (el resto de la pantalla funciona con las
métricas reconstruidas).

Hallazgos de esta corrida: la pantalla de resultados lanzaba un error si la tabla `metrica` no
existía (corregido: devuelve «sin métricas» y reconstruye), y `finalizarDesdeHud` debe soltar el
puntero antes de pulsar «Terminar práctica».
