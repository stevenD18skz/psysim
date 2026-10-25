# Registro de pruebas — Sprint 4: HUD, métricas y cierre de sesión

- **Fecha de ejecución:** 2026-10-25 (el sprint estaba planeado del 8 al 15 de octubre; se
  implementó tarde porque el rediseño de estudiante y docente tuvo prioridad).
- **Entorno:** servidor local (`pnpm dev`, Next.js 16.3.6) contra el proyecto de Supabase
  `PychSims` y la API de Google Gemini real. Chromium (Playwright 1.63) con WebGL por SwiftShader.
- **Migración:** `supabase/migrations/20261025010000_metricas_sesion.sql` (tabla `metrica` y función
  `guardar_metricas_cierre`). Se aplica con
  `node --env-file=.env.local scripts/aplicar-migracion.mjs supabase/migrations/20261025010000_metricas_sesion.sql`.
  Mientras no esté aplicada, el cierre sigue funcionando (guarda sin métricas) y los resultados se
  reconstruyen con la conversación (ver «Degradación elegante»).
- **Automatización:** cada historia tiene sus propios archivos de test (ver el mapa en el
  [README](../../README.md#pruebas)). `pnpm test` → **1 163 tests** en 85 archivos, todos aprobados;
  `pnpm test:coverage` cumple el umbral del 70 % en `app/api`, `lib` y `store`.

## Cómo se adaptó el sprint a la plataforma actual

El backlog de Taiga describe un docente que corre la simulación. Hoy el estudiante practica en su
cuenta y el docente revisa después. Por eso:

- «Finalizar sesión» (HU-17 · T03) es **«Terminar práctica»**, y lo pulsa el estudiante.
- `/api/metrics/save` (HU-19) lo llama el **estudiante** (401/403 para cualquier otro rol), y la
  pantalla `/resultados` (HU-21) la ven **el estudiante y su docente** (RLS decide cuáles).
- «Nueva sesión» y «Cerrar» (HU-21 · T04) son del docente; el estudiante tiene «Ir a Mis prácticas»
  y «Cerrar sesión» (en el computador del docente, en modo presencial, «Cerrar sesión en este
  equipo»).
- Las métricas son **datos de la sesión, no una calificación**; la pantalla lo dice. La nota sigue
  siendo la retroalimentación del docente.

## HU-17 — HUD de la simulación

| #    | Escenario                                                             | Resultado esperado                                                        | Resultado                                                  |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 17.1 | T01: barra con el caso, el paciente y el cronómetro                   | Título, código del caso, paciente y tiempo de práctica                    | ✅ Aprobado (`hud-sesion.test.tsx`)                        |
| 17.2 | T01: el cronómetro se detiene al terminar y no corre antes de empezar | Duración final fija; «Sin iniciar» hasta confirmar las instrucciones      | ✅ Aprobado                                                |
| 17.3 | T02: estado del paciente en el HUD                                    | «Esperando que te acerques», «Escuchando», «Pensando…», «Respondiendo»…   | ✅ Aprobado (sigue los cambios del store; `role="status"`) |
| 17.4 | T02: modo compacto mientras se conversa                               | El panel de conversación ya muestra el estado: el HUD solo deja lo útil   | ✅ Aprobado                                                |
| 17.5 | T03: «Terminar práctica» con modal de confirmación                    | Avisa que no se puede reanudar; deshabilitado mientras el paciente piensa | ✅ Aprobado (`flujos.ts › finalizarDesdeHud`, E2E)         |

## HU-18 — Captura de métricas durante la sesión

| #    | Escenario                                                  | Resultado esperado                                                    | Resultado                                                   |
| ---- | ---------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| 18.1 | T01: latencia por mensaje (reloj monotónico del navegador) | Cada respuesta del paciente guarda su latencia percibida              | ✅ Aprobado (`enviar-mensaje.test.ts`, ya existía)          |
| 18.2 | T02: contador de intervenciones                            | Cuenta las del estudiante; se recupera al recargar                    | ✅ Aprobado (`metricas.test.ts`, `conversacion.test.ts`)    |
| 18.3 | T03: proximidad al paciente desde el motor 3D              | Una muestra cada 2 s, solo con la práctica abierta; ignora `Infinity` | ✅ Aprobado (`use-proximidad.test.tsx`, `metricas.test.ts`) |
| 18.4 | T04: indicadores agregados al cierre                       | Promedio redondeado, máximo; nulos (no 0 ni NaN) sin respuestas       | ✅ Aprobado (`metrics.test.ts`, contrato de Taiga)          |

## HU-19 — Route Handler de persistencia (`POST /api/metrics/save`)

| #    | Escenario                                                                | Resultado esperado                                                    | Resultado                                                         |
| ---- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 19.1 | T01: cuerpo válido                                                       | 200 con `sesion_id` y `metrica_id`; llama a `guardar_metricas_cierre` | ✅ Aprobado (`route.test.ts`)                                     |
| 19.2 | T01: cuerpo que no pasa Zod (UUID, negativos, decimales, máxima < media) | 400 con el detalle por campo, sin tocar la base de datos              | ✅ Aprobado (`route.test.ts`, `metrics.schema.test.ts`)           |
| 19.3 | T01: sin sesión, sin rol de estudiante, JSON inválido                    | 401 / 403 / 400                                                       | ✅ Aprobado                                                       |
| 19.4 | T02: sesión inexistente o ajena, o ya terminada                          | 404 / 409 (no se guardan métricas dos veces)                          | ✅ Aprobado (también el 409 de la función, código `55000`)        |
| 19.5 | T02: INSERT en `metrica` y UPDATE de la sesión                           | Una sola transacción; duración y tokens los calcula la base de datos  | ⏳ Escrito; verificado con la base remota al aplicar la migración |
| 19.6 | T02: falla de la base de datos                                           | 500 con mensaje genérico, sin código ni nombres de tablas             | ✅ Aprobado                                                       |
| 19.7 | T03: tests unitarios del Route Handler                                   | Cubre 200, 400, 401, 403, 404, 409 y 500                              | ✅ 17 tests (cobertura de `app/api`: 97,9 %)                      |

## HU-20 — Flujo de cierre de sesión

| #    | Escenario                                                       | Resultado esperado                                                         | Resultado                                            |
| ---- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| 20.1 | T01: «Terminar práctica» pasa el paciente a `sesion_finalizada` | Estado terminal; no se cierra con una respuesta de la IA en camino         | ✅ Aprobado (`use-finalizar-sesion.test.tsx`)        |
| 20.2 | T02: persiste las métricas y redirige a `/resultados?sesion=…`  | Guarda y abre los resultados                                               | ✅ Aprobado (unitario) · E2E en `resultados.spec.ts` |
| 20.3 | T02: si el guardado de métricas falla                           | Cierra la sesión sin ellas y sigue a los resultados (nadie queda atrapado) | ✅ Aprobado                                          |
| 20.4 | T02: si tampoco se puede cerrar                                 | Aviso de conexión y la práctica sigue abierta para reintentar              | ✅ Aprobado                                          |
| 20.5 | T02: la sesión ya estaba terminada (409)                        | Va a los resultados                                                        | ✅ Aprobado                                          |

## HU-21 — Pantalla de resultados (`/resultados?sesion=…`)

| #     | Escenario                                                                       | Resultado esperado                                                           | Resultado                                                                          |
| ----- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 21.1  | T01: encabezado con el escenario, el estudiante (nombre y código) y el paciente | `h1` con el caso; datos del estudiante visibles                              | ✅ Aprobado (`resultados.spec.ts`)                                                 |
| 21.2  | T02: cuatro tarjetas (intervenciones, latencia promedio y máxima, duración)     | Regiones con su título como nombre; duración en `MM:SS`; «—» si no hay valor | ✅ Aprobado (`resultados.test.tsx`)                                                |
| 21.3  | T02: tarjeta de cercanía al paciente cuando se midió                            | Distancia media en metros                                                    | ✅ Aprobado                                                                        |
| 21.4  | T03: historial completo de la conversación                                      | `[data-remitente]` en orden; el docente lee «Estudiante», el estudiante «Tú» | ✅ Aprobado                                                                        |
| 21.5  | T04: acciones al pie                                                            | Estudiante: Mis prácticas / Cerrar sesión. Docente: Nueva sesión / Cerrar    | ✅ Aprobado (`resultados.test.tsx`)                                                |
| 21.6  | T04: modo presencial                                                            | «Cerrar sesión en este equipo» es la acción principal                        | ✅ Aprobado                                                                        |
| 21.7  | Sesión ajena, inexistente o UUID inválido                                       | Redirige al inicio del rol (`/practicas` o `/inicio`)                        | ✅ Aprobado (E2E)                                                                  |
| 21.8  | Práctica aún abierta                                                            | Se retoma (`/simulacion`) o, para el docente, se abre la revisión            | ✅ Aprobado (código); sin test dedicado                                            |
| 21.9  | Sin métricas guardadas (inactividad, error, prácticas anteriores)               | Se reconstruyen con la conversación y la duración; se avisa en pantalla      | ✅ Aprobado (`resultados.test.ts`)                                                 |
| 21.10 | T05: flujo completo de sesión                                                   | Terminar → resultados con ≥ 1 intervención → métricas en Supabase            | ✅ `flujo-completo.spec.ts` · ⏳ comprobación en `metrica` al aplicar la migración |

## Degradación elegante

La migración es lo único que el despliegue necesita **antes** del código nuevo:

- Sin la función `guardar_metricas_cierre`, `/api/metrics/save` responde 500; el cliente cierra la
  sesión con la acción de siempre (`finalizarSesion`) y los resultados muestran las métricas
  reconstruidas («se calcularon con la conversación guardada»). Nadie queda bloqueado.
- Con la migración aplicada, el cierre guarda la fila de `metrica` y la sesión en una sola
  transacción: no hay sesiones cerradas a medias.

## Decisiones

- **El servidor calcula lo que puede.** La duración (`fin − inicio`, con el reloj de la base de
  datos) y los tokens (suma de `mensaje`) no los manda el navegador; solo lo que únicamente el
  navegador sabe: la latencia percibida, las intervenciones y la proximidad.
- **La latencia es la percibida**, medida con el reloj monotónico del navegador (no la del
  servidor, que ya queda en `mensaje.latencia_ms`).
- **Sin nota automática.** Las métricas describen la sesión; el desempeño lo evalúa el docente.
