# Registro de pruebas — Sprint 3: NPC e integración con la API de IA

- **Fecha de ejecución:** 2026-09-29
- **Entorno:** servidor local (`pnpm dev`, Next.js 16.3.6) contra el proyecto de Supabase
  `PychSims` con la migración `20260930030000_crear_tabla_mensaje.sql` aplicada, y la API de
  Google Gemini real (`gemini-3.5-flash` con respaldo `gemini-3.5-flash-lite`). Chromium
  (Playwright 1.63) con WebGL por SwiftShader para los E2E y con la GPU real (AMD Radeon
  integrada, ANGLE/D3D11) para la medición de rendimiento.
- **Automatización:**
  - Unitarias (Vitest): `pnpm test` → **210 tests** en 21 archivos (105 nuevos en este sprint).
  - E2E (Playwright): `pnpm test:e2e --workers=1` → **24 tests** (6 nuevos), todos aprobados.
  - Base de datos: `pnpm supabase:test` → **28 comprobaciones** (7 nuevas de la tabla `mensaje`).

## HU-11 — Carga y visualización del NPC en el entorno 3D

| #    | Escenario                                                             | Resultado esperado                                                                       | Resultado                                                                                                                                                      |
| ---- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11.1 | T01: `NPCModel` carga el GLB del paciente con `useGLTF` y lo precarga | El GLB se descarga durante la pantalla de carga; si falla, se usa el paciente procedural | ✅ Aprobado (mismo cargador que el mobiliario, verificado en el Sprint 2)                                                                                      |
| 11.2 | T02: posición y orientación desde el JSON de escena                   | El paciente queda frente a la cámara inicial, a escala humana                            | ✅ Aprobado (6 escenas; capturas)                                                                                                                              |
| 11.3 | T03: animación en reposo                                              | Respira en bucle y sigue al estudiante con la mirada                                     | ✅ Aprobado con el paciente procedural (`poseProcedural`)                                                                                                      |
| 11.4 | T03: animación en reposo con clips del GLB (`Idle`)                   | Reproduce el clip en bucle                                                               | ⏳ Pendiente: los 12 personajes aún no tienen esqueleto ni clips (ver `docs/modelos-3d.md` §4). La selección de clips está cubierta por `animaciones.test.ts`. |
| 11.5 | T04: rendimiento con el NPC (E-01, 1920 × 889, AMD Radeon integrada)  | ≥ 30 FPS, sin errores en consola                                                         | ✅ **60 FPS** (tope del modo headless); 5 GLB desde Storage, el más lento en 497 ms                                                                            |

## HU-12 — Route Handler de IA (`POST /api/npc/chat`)

| #     | Escenario                                                        | Resultado esperado                                                                | Resultado                                        |
| ----- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| 12.1  | T01: estructura y tipado                                         | Tipos de entrada y salida con Zod; respuesta JSON sin caché                       | ✅ Aprobado (`route.test.ts`)                    |
| 12.2  | T02: cuerpo válido                                               | 200 con `respuesta_npc`, `timestamp_respuesta`, `tokens_entrada`, `tokens_salida` | ✅ Aprobado (unitario y E2E con la IA real)      |
| 12.3  | T02: cuerpo que no pasa Zod                                      | 400 con el detalle por campo, sin llamar a la IA                                  | ✅ Aprobado (unitario y E2E)                     |
| 12.4  | Sin sesión / sin rol docente                                     | 401 / 403                                                                         | ✅ Aprobado (unitario y E2E)                     |
| 12.5  | T03: sesión inexistente o de otro docente; NPC ajeno a la sesión | 404                                                                               | ✅ Aprobado (unitario)                           |
| 12.6  | Sesión ya finalizada                                             | 409                                                                               | ✅ Aprobado (unitario)                           |
| 12.7  | T03: prompt del sistema                                          | Se usa el prompt de la sesión (del NPC o el personalizado por el docente)         | ✅ Aprobado (unitario)                           |
| 12.8  | T04: orden de los mensajes                                       | Sistema (en `instructions`) → historial reciente → mensaje del estudiante         | ✅ Aprobado (`paciente.test.ts`)                 |
| 12.9  | T04: tiempo máximo                                               | 25 s para la IA, `maxDuration = 30`                                               | ✅ Aprobado                                      |
| 12.10 | T05: tokens                                                      | Se registran en el log (sin el contenido) y se devuelven al cliente               | ✅ Aprobado                                      |
| 12.11 | Mejora: persistencia                                             | Estudiante + paciente se guardan juntos en `mensaje`                              | ✅ Aprobado (E2E verifica las filas en Supabase) |
| 12.12 | Mejora: modelo de respaldo                                       | Si el principal falla o tarda > 12 s, responde `gemini-3.5-flash-lite`            | ✅ Aprobado (unitario: 503, 429, tiempo agotado) |

## HU-13 — Interfaz de conversación

| #    | Escenario                                                        | Resultado esperado                                                                 | Resultado              |
| ---- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------- |
| 13.1 | T01: acercarse al paciente (≤ 3,2 m)                             | Aparece "Conversar con Marta" / "Presiona E para hablar con Marta"                 | ✅ Aprobado (E2E)      |
| 13.2 | T01: iniciar la conversación (botón, tecla E o clic con la mira) | La cámara se desplaza frente al paciente, se libera el ratón y aparece el panel    | ✅ Aprobado (E2E)      |
| 13.3 | T01: `pointer-events` del panel                                  | El contenedor no bloquea el canvas; solo el panel recibe eventos                   | ✅ Aprobado            |
| 13.4 | T01: historial                                                   | Estudiante a la derecha, paciente a la izquierda; desplazamiento al último mensaje | ✅ Aprobado (capturas) |
| 13.5 | T02: Enter envía / Shift + Enter nueva línea                     | El mensaje se envía con su salto de línea                                          | ✅ Aprobado (E2E)      |
| 13.6 | T02: campo y botón durante `procesando`                          | Deshabilitados; el campo se limpia al aceptar el envío                             | ✅ Aprobado (E2E)      |
| 13.7 | T03: flujo de envío y latencia                                   | Latencia medida con el reloj monotónico y guardada en el slice de métricas         | ✅ Aprobado (unitario) |
| 13.8 | Volver a explorar                                                | Cierra el panel sin perder la sesión                                               | ✅ Aprobado (E2E)      |
| 13.9 | Recargar la página                                               | La conversación se recupera desde Supabase                                         | ✅ Aprobado (E2E)      |

## HU-14 — Estado conversacional en Zustand

| #    | Escenario                                                                      | Resultado esperado                                                                                    | Resultado                            |
| ---- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 14.1 | T01: slices `conversacion`, `npc` y `metricas` tipados                         | Estados de la sección 4.3.4 y mensajes con `id`, `remitente`, `contenido`, `timestamp`, `latencia_ms` | ✅ Aprobado (`tsc`)                  |
| 14.2 | T02: `agregarMensaje`, `actualizarEstadoNPC`, `iniciarSesion`, `limpiarSesion` | Producen los cambios esperados                                                                        | ✅ Aprobado (`conversacion.test.ts`) |
| 14.3 | Transiciones no válidas (p. ej. doble envío)                                   | Se rechazan sin cambiar el estado                                                                     | ✅ Aprobado (unitario)               |
| 14.4 | T03: el motor 3D se suscribe al estado del NPC                                 | El paciente cambia de pose según el estado                                                            | ✅ Aprobado                          |

## HU-15 — Animaciones sincronizadas con la conversación

| #    | Escenario                                                    | Resultado esperado                                                                       | Resultado                                    |
| ---- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| 15.1 | T01: `procesando`                                            | Respira más despacio y baja la cabeza (reflexiona)                                       | ✅ Aprobado (procedural; `animaciones.test`) |
| 15.2 | T02: `respondiendo`                                          | Asiente y mueve la boca; la respuesta se escribe de forma progresiva                     | ✅ Aprobado                                  |
| 15.3 | T02: transición a `esperando_input` al terminar de mostrarse | Automática                                                                               | ✅ Aprobado (E2E)                            |
| 15.4 | T02: transiciones suaves                                     | Fundido de ~0,3 s (`crossFadeTo` en el GLB; amortiguación equivalente en el procedural)  | ✅ Procedural · ⏳ GLB pendiente de clips    |
| 15.5 | Accesibilidad                                                | "Reducir movimiento" muestra el texto completo; el lector de pantalla lo anuncia una vez | ✅ Aprobado                                  |

## HU-16 — Manejo de errores de comunicación

| #    | Escenario                                                | Resultado esperado                                              | Resultado                          |
| ---- | -------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------- |
| 16.1 | T01: tiempo agotado / estructura inesperada / credencial | 504 / 502 / 502, sin detalles internos (saturación: 503)        | ✅ Aprobado (`route.test.ts`)      |
| 16.2 | T01: el cliente recibe un error o falla la red           | NPC en `error_comunicacion` y el historial se conserva          | ✅ Aprobado (unitario y E2E)       |
| 16.3 | T02: aviso con el historial visible detrás               | "El paciente virtual no está disponible temporalmente"          | ✅ Aprobado (E2E y captura)        |
| 16.4 | T02: Reintentar                                          | Reenvía el último mensaje sin duplicarlo                        | ✅ Aprobado (E2E con la IA real)   |
| 16.5 | T02: Finalizar sesión (con confirmación)                 | `sesion_finalizada`, la BD asigna `fin` y se muestra el resumen | ✅ Aprobado (E2E verifica la fila) |

## Verificaciones de base de datos (`pnpm supabase:test`, nuevas)

| Verificación                                                     | Resultado                 |
| ---------------------------------------------------------------- | ------------------------- |
| Sin sesión no se expone `mensaje`                                | ✅ Aprobado               |
| El docente guarda y lee, en orden, la conversación de su sesión  | ✅ Aprobado               |
| No lee ni escribe en la conversación de otro docente             | ✅ Aprobado               |
| Solo los mensajes del paciente llevan latencia y tokens          | ✅ Aprobado               |
| Los mensajes no se editan y no se añaden a una sesión finalizada | ✅ Aprobado               |
| Asesor de seguridad de Supabase                                  | ✅ Sin avisos del esquema |

## Defectos encontrados y corregidos

| Defecto                                                                                                         | Corrección                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Un segundo envío durante `procesando` pasaba el control (la transición al mismo estado se trataba como válida). | `enviarMensaje` exige `esperando_input` para enviar y `error_comunicacion` para reintentar.  |
| En Chrome reciente `scrollIntoView` devuelve una Promise; usada como retorno de un efecto rompía la página.     | El efecto de desplazamiento ya no devuelve ningún valor.                                     |
| `gemini-3.5-flash` tardó 11–16 s y devolvió 503 intermitentes (degradación del proveedor).                      | Modelo de respaldo `gemini-3.5-flash-lite` (~1 s) si el principal falla o tarda más de 12 s. |
| El `timeout` del SDK recibía milisegundos decimales en el camino del respaldo.                                  | Se redondea el tiempo restante.                                                              |
| El panel tapaba el rostro del paciente y el aviso de error repetía su título.                                   | Nuevo encuadre (mira bajo los ojos del paciente) y texto de detalle específico.              |

## Decisiones técnicas

- **Latencia:** se mide en el cliente con `performance.now()` (envío → respuesta) en lugar de restar
  la hora del servidor a la del navegador, que pueden estar desfasadas.
- **Transición de cámara:** interpolación propia (amortiguación exponencial) en lugar de
  `CameraControls`, para no tener dos controladores disputándose la cámara con `PointerLockControls`.
- **Prompt:** el Route Handler usa el prompt guardado en la sesión, no el de la tabla `npc`, para
  respetar la personalización del docente (HU-06).

## Pendientes para cerrar del todo el sprint

- Riggear en Mixamo los personajes asignados y verificar 11.4 y 15.4 con sus clips.
- Probar manualmente la captura del ratón (Pointer Lock) en un navegador real.
