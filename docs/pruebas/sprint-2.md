# Registro de pruebas — Sprint 2: Configuración del escenario y entorno 3D base

- **Fecha de ejecución:** 2026-09-29
- **Entorno:** servidor local (`pnpm dev`, Next.js 16.3.6) contra el proyecto de Supabase
  `PychSims` (`afqofsneoblsjjdvktsu`) con las migraciones del Sprint 2 aplicadas
  (`supabase db push`). Navegador Chromium (Playwright 1.63, WebGL por SwiftShader) y Chrome en
  el equipo de desarrollo (AMD Radeon integrada, pantalla de 75 Hz).
- **Cuentas:** `docente1@psysim.test` (docente) y `sin-rol@psysim.test` (sin perfil).
- **Automatización:**
  - Unitarias (Vitest): `pnpm test` → **105 tests** en 12 archivos.
  - E2E (Playwright): `pnpm test:e2e` → **18 tests** (10 del Sprint 1 y 8 del Sprint 2),
    estables en ejecuciones repetidas con un worker.
  - Base de datos: `pnpm supabase:test` → **21 comprobaciones** de conexión, RLS y privilegios.

## HU-06 — Formulario de configuración del escenario y datos del estudiante

| #   | Escenario                                                         | Resultado esperado                                                                       | Resultado                                       |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 6.1 | T01: escenarios y NPC en la base de datos                         | 6 escenarios (E-01 a E-06) con todos sus campos y un NPC por escenario                   | ✅ Aprobado (consulta SQL y `supabase:test`)    |
| 6.2 | T02: `/configuracion` sin sesión                                  | Redirige a `/login` (proxy + DAL)                                                        | ✅ Aprobado (E2E Sprint 1)                      |
| 6.3 | T02: cuadrícula de escenarios                                     | 6 tarjetas con código, título, categoría, nivel y competencia central                    | ✅ Aprobado (E2E)                               |
| 6.4 | T02: seleccionar una tarjeta                                      | Se expande el perfil del NPC y el prompt editable precargado desde la BD                 | ✅ Aprobado (E2E y unitario)                    |
| 6.5 | T02: seleccionar otra tarjeta                                     | Solo un escenario seleccionado; el prompt cambia al del nuevo NPC                        | ✅ Aprobado (E2E y unitario)                    |
| 6.6 | T03: iniciar con el formulario vacío                              | Errores inline en escenario, código y nombre; no se envía nada                           | ✅ Aprobado (E2E y unitario)                    |
| 6.7 | T03: código con letras / menos de 5 dígitos; nombre de 1 carácter | "El código solo puede contener números." / mínimo de dígitos / mínimo 2 caracteres       | ✅ Aprobado (E2E y `configuracion.schema.test`) |
| 6.8 | T04: iniciar con datos válidos                                    | INSERT en `sesion` (`en_curso`), id en Zustand y redirección a `/simulacion?sesion=<id>` | ✅ Aprobado (E2E verifica la fila en Supabase)  |
| 6.9 | T04: la inserción falla                                           | Mensaje de error sin redirigir                                                           | ✅ Aprobado (unitario)                          |

## HU-07 — Guardar y cargar configuraciones del docente

| #   | Escenario                                          | Resultado esperado                                         | Resultado                     |
| --- | -------------------------------------------------- | ---------------------------------------------------------- | ----------------------------- |
| 7.1 | T01: tabla `configuracion_guardada` y RLS          | Cada docente solo lee, crea, modifica y elimina las suyas  | ✅ Aprobado (`supabase:test`) |
| 7.2 | T02: botón "Guardar configuración" sin escenario   | Deshabilitado                                              | ✅ Aprobado (E2E y unitario)  |
| 7.3 | T02: guardar con nombre y prompt editado           | INSERT y confirmación visual («Configuración … guardada.») | ✅ Aprobado (E2E)             |
| 7.4 | T02: nombre repetido                               | "Ya tienes una configuración con ese nombre."              | ✅ Aprobado (E2E)             |
| 7.5 | T03: lista sin configuraciones                     | Mensaje informativo que invita a guardar la actual         | ✅ Aprobado (unitario)        |
| 7.6 | T03: lista con configuraciones (tras recargar)     | Nombre, escenario asociado y fecha de creación             | ✅ Aprobado (E2E)             |
| 7.7 | T04: cargar una configuración                      | Selecciona su escenario y carga el prompt guardado         | ✅ Aprobado (E2E y unitario)  |
| 7.8 | T04: cargar con datos del estudiante ya ingresados | Los datos del estudiante no se borran                      | ✅ Aprobado (E2E y unitario)  |
| 7.9 | Mejora: eliminar una configuración                 | Confirmación en línea y desaparece de la lista             | ✅ Aprobado (E2E)             |

## HU-08 — Configuración del motor de renderizado 3D

| #   | Escenario                                                           | Resultado esperado                                                        | Resultado                                                                   |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 8.1 | T01: `SceneCanvas` importado con `next/dynamic` y `ssr: false`      | Sin errores de hidratación; el canvas ocupa `h-[calc(100dvh-3.5rem)]`     | ✅ Aprobado                                                                 |
| 8.2 | T01: parámetros del renderer                                        | `dpr` máximo 1,5 (baja a 1 si cae el rendimiento), antialias, sombras PCF | ✅ Aprobado                                                                 |
| 8.3 | T02: iluminación base                                               | Ambiental + hemisférica + direccional con sombras suaves                  | ✅ Aprobado (inspección visual)                                             |
| 8.4 | T02: prueba de rendimiento (E-01, 1920 × 889, AMD Radeon integrada) | ≥ 30 FPS                                                                  | ✅ **75 FPS** (tope de la pantalla, medido 5 s con `requestAnimationFrame`) |
| 8.5 | Navegador sin WebGL                                                 | Mensaje claro en lugar del canvas                                         | ✅ Aprobado (fallback de `<Canvas>`)                                        |

## HU-09 — Carga y visualización del primer escenario 3D

| #   | Escenario                                              | Resultado esperado                                                          | Resultado                                      |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------- |
| 9.1 | T01: JSON de escena (plantilla E-01 y los otros cinco) | Modelos, posición del NPC, cámara, límites e iluminación; validados con Zod | ✅ Aprobado (`escena.schema.test`: 6 archivos) |
| 9.2 | T02: `SceneLoader` con `useGLTF(url, '/draco/')`       | Modelos Draco decodificados con los binarios de `public/draco/`             | ✅ Aprobado                                    |
| 9.3 | T02: `useGLTF.preload`                                 | La descarga empieza al conocerse la escena, durante la pantalla de carga    | ✅ Aprobado                                    |
| 9.4 | T02: modelo ausente o corrupto                         | Se sustituye por su versión procedural (error boundary por modelo)          | ✅ Aprobado                                    |
| 9.5 | T03: modelos en Supabase Storage                       | Bucket público `modelos-3d`; 111 modelos, 21,5 MB → 4,8 MB con Draco        | ✅ Aprobado (`pnpm modelos:subir`)             |
| 9.6 | T04: `LoadingScreen` con `useProgress`                 | Nombre del escenario, barra de progreso y mensaje; se oculta al estar lista | ✅ Aprobado (E2E)                              |
| 9.7 | T05: flujo configurar → iniciar → escena               | La escena del escenario guardado en Zustand carga con el NPC posicionado    | ✅ Aprobado (E2E + captura)                    |
| 9.8 | Recargar `/simulacion?sesion=<id>`                     | La sesión se recupera desde el servidor                                     | ✅ Aprobado (E2E)                              |
| 9.9 | `/simulacion` sin parámetro / sesión inexistente       | Retoma la última sesión en curso / estado vacío con enlace a configuración  | ✅ Aprobado (E2E)                              |

## HU-10 — Control de cámara y navegación básica

| #     | Escenario                                                 | Resultado esperado                                                               | Resultado                                                                      |
| ----- | --------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 10.1  | T01: caminar con WASD/flechas                             | Avanza hacia el paciente con aceleración suave y la altura de los ojos fija      | ✅ Aprobado (E2E, posición con `?debug=1`)                                     |
| 10.1b | T01: mirar con el ratón (`PointerLockControls`)           | Clic en "Comenzar a explorar" captura el ratón; Esc lo libera                    | ⏳ Pendiente de prueba manual del equipo (Pointer Lock requiere un gesto real) |
| 10.2  | T01: escribir en un campo de texto                        | No mueve la cámara (preparado para el chat del Sprint 3)                         | ✅ Aprobado (`use-teclado.ts`)                                                 |
| 10.3  | T02: límites del JSON                                     | El estudiante no sale de la sala                                                 | ✅ Aprobado (`colisiones.test` y E2E)                                          |
| 10.4  | T02: colisión con muebles (AABB por mueble, ver decisión) | Bloquea y permite deslizarse a lo largo del obstáculo                            | ✅ Aprobado (`colisiones.test` y E2E: la mesa de centro detiene al estudiante) |
| 10.5  | T02: posición de interacción frente al NPC                | Se llega frente al paciente (al otro lado de la mesa) sin quedar bloqueado antes | ✅ Aprobado (E2E: se detiene a ~0,5 m de la mesa, frente al sillón)            |
| 10.6  | Rendimiento bajo (p. ej. 4 FPS)                           | La velocidad de marcha no depende de los FPS (integración por subpasos)          | ✅ Aprobado (E2E con renderizado por software)                                 |

**Decisión técnica (HU-10 · T02):** se usan cajas delimitadoras (AABB) por mueble, calculadas a
partir de la geometría real de cada objeto al cargarse, en lugar de raycasting contra la malla.
Funciona igual con muebles procedurales y GLB y cuesta O(n) por fotograma con n ≈ 15.

## Verificaciones de base de datos (`pnpm supabase:test`)

| Verificación                                                                                       | Resultado                                                                           |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Sin sesión, la clave publicable no expone `escenario`, `npc`, `sesion` ni `configuracion_guardada` | ✅ Aprobado                                                                         |
| El docente lee los 6 escenarios activos y los 6 NPC                                                | ✅ Aprobado                                                                         |
| Una cuenta sin rol docente no ve los escenarios                                                    | ✅ Aprobado                                                                         |
| El docente no ve sesiones ni configuraciones de otro docente, ni puede borrarlas                   | ✅ Aprobado                                                                         |
| No se puede crear una sesión indicando otro `usuario_id`                                           | ✅ Aprobado                                                                         |
| Los datos del estudiante de una sesión son inmutables                                              | ✅ Aprobado                                                                         |
| El cliente no puede escribir `fin`; la BD lo asigna al cerrar la sesión                            | ✅ Aprobado                                                                         |
| Una sesión finalizada ya no se puede modificar                                                     | ✅ Aprobado                                                                         |
| Asesor de seguridad de Supabase (`supabase db advisors`)                                           | ✅ Sin avisos del esquema (solo "Leaked Password Protection", función del plan Pro) |

## Defectos encontrados y corregidos

| Defecto                                                                                             | Corrección                                                                                                       |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Al cerrar una sesión con la hora del cliente, un desfase de milisegundos violaba `fin >= inicio`.   | Migración `20260930020000`: un trigger asigna `fin` con la hora del servidor; el cliente ya no puede escribirla. |
| El paquete de modelos mezcla unidades (m, cm y otras) y orígenes.                                   | Campo `ajuste` (alto/ancho objetivo y giro) que normaliza cada GLB al cargarlo.                                  |
| Por debajo de 20 FPS el estudiante caminaba más lento (el paso por fotograma se limitaba a 0,05 s). | Integración por subpasos de 0,05 s (máximo 0,25 s por fotograma): velocidad independiente de los FPS.            |
