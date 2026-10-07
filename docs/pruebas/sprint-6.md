# Registro de pruebas — Sprint 6: Testing (adelantado)

- **Fecha de ejecución:** 2026-10-06 (adelantado: el Sprint 6 está planeado del 22 al 28 de octubre).
- **Alcance:** solo las historias de testing, HU-26 (tests unitarios y cobertura) y HU-27 (E2E con
  Playwright). HU-28 (rendimiento), HU-29 (despliegue beta) y HU-30 (documentación) quedan para el
  sprint.
- **Entorno:** servidor local (`pnpm dev`, Next.js 16.3.6) contra el proyecto de Supabase
  `PychSims` y la API de Google Gemini real. Chromium (Playwright 1.63) con WebGL por SwiftShader.
- **Automatización:**
  - Unitarias (Vitest): `pnpm test` → **451 tests** en 40 archivos, aprobados; **15 pendientes**
    del Sprint 4 en 2 archivos (se omiten hasta que exista su código, ver abajo).
  - Cobertura: `pnpm test:coverage` → umbral del 70 % cumplido en las tres carpetas medidas.
  - E2E (Playwright): `pnpm test:e2e --workers=2` → **32 aprobados**, 5 omitidos (4 pendientes del
    Sprint 4 y 1 que necesita una cuenta sin rol docente).

## Tests que esperan al Sprint 4

El Sprint 4 (HUD con "Finalizar sesión", métricas, `/api/metrics/save` y `/resultados`) aún no está
implementado. Sus tests ya están escritos con el contrato de Taiga y **se activan solos** cuando
existe el archivo que prueban (`test/pendiente.ts` y `SPRINT_4_LISTO` en `e2e/flujos.ts`):

| Archivo de test                            | Se activa cuando existe                             |
| ------------------------------------------ | --------------------------------------------------- |
| `src/lib/metrics.test.ts`                  | `src/lib/metrics.ts`                                |
| `src/app/api/metrics/save/route.test.ts`   | `src/app/api/metrics/save/route.ts`                 |
| `e2e/resultados.spec.ts`                   | `src/app/(protected)[/(panel)]/resultados/page.tsx` |
| `e2e/flujo-completo.spec.ts` (tramo final) | la misma página de resultados                       |

Los dos tests unitarios se validaron contra una implementación de referencia mínima (que luego se
borró): con ella pasan los 15, sin ella quedan omitidos. Si al implementar el Sprint 4 cambia algún
nombre (parámetros de la RPC `guardar_metricas_cierre`, textos de botones o tarjetas), se ajusta el
test: es la especificación.

## HU-26 — Suite de tests unitarios

| #     | Escenario                                                                             | Resultado esperado                                              | Resultado                                                             |
| ----- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| 26.1  | T01: `/api/npc/chat` con cuerpo válido                                                | 200 con `respuesta_npc` (y `emocion_npc`)                       | ✅ Aprobado (`route.test.ts`)                                         |
| 26.2  | T01: `mensaje_usuario` vacío                                                          | 400 con el detalle por campo                                    | ✅ Aprobado                                                           |
| 26.3  | T01: NPC que no pertenece a la sesión                                                 | 404                                                             | ✅ Aprobado                                                           |
| 26.4  | T01: tiempo agotado de la IA                                                          | 504                                                             | ✅ Aprobado                                                           |
| 26.5  | T02: `/api/metrics/save` (200, 400, 409, 401/403, 500 sin detalles internos)          | Según el contrato de HU-19                                      | ⏳ Escrito, pendiente del Sprint 4 (10 tests)                         |
| 26.6  | T03: store — `agregarMensaje`, `limpiarSesion`, transiciones de `actualizarEstadoNPC` | Cambios correctos y sin efectos secundarios                     | ✅ Aprobado (`conversacion.test.ts`, `app-store.test.ts`)             |
| 26.7  | T03: `calcularMetricasAgregadas` (promedio redondeado, máximo, vacío, pureza)         | `latencia_promedio_ms` y `latencia_maxima_ms` correctos         | ⏳ Escrito, pendiente del Sprint 4 (5 tests)                          |
| 26.8  | T04: umbral de cobertura del 70 % en `app/api`, `lib` y `store`                       | `pnpm test:coverage` falla si alguna carpeta queda por debajo   | ✅ Aprobado — `app/api` 95,7 %, `lib` 87,7 %, `store` 98,2 % (líneas) |
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
| 27.2 | T01: … → finalizar desde el HUD → resultados con una métrica distinta de cero                 | Pantalla de resultados con intervenciones ≥ 1                                    | ⏳ Pendiente del Sprint 4 (mismo test, tramo final)                      |
| 27.3 | T02: credenciales válidas → inicio con saludo personalizado                                   | "Hola, {nombre}." con el nombre del docente                                      | ✅ Aprobado (`autenticacion.spec.ts`)                                    |
| 27.4 | T02: credenciales inválidas                                                                   | Error en el formulario, sin redirigir                                            | ✅ Aprobado                                                              |
| 27.5 | T02: cerrar sesión desde el menú                                                              | Queda en `/login` y `/configuracion` vuelve a pedir login                        | ✅ Aprobado                                                              |
| 27.6 | T03: ajustar el prompt de un escenario, guardarlo y volver a elegirlo                         | El prompt cargado coincide con el guardado                                       | ✅ Aprobado (`configuracion.spec.ts`, HU-07; hoy "Guardar como mi caso") |
| 27.7 | T04: resultados (escenario, estudiante, 4 tarjetas, historial, "Nueva sesión", "Cerrar")      | Según HU-21                                                                      | ⏳ Escrito, pendiente del Sprint 4 (`resultados.spec.ts`)                |
| 27.8 | Registro de estudiantes: alta en la primera sesión, `/estudiantes`, buscador y "Nueva sesión" | El estudiante aparece con sus sesiones y se elige al volver                      | ✅ Aprobado (`estudiantes.spec.ts`)                                      |

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
