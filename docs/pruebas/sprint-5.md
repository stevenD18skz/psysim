# Registro de pruebas — Sprint 5: Interfaz de usuario, accesibilidad y escenarios completos

- **Fecha de ejecución:** 2026-10-25 (el sprint estaba planeado del 15 al 21 de octubre; las
  historias HU-22 a HU-24 se construyeron durante el rediseño y aquí se validan con pruebas).
- **Entorno:** servidor local (`pnpm dev`, Next.js 16.3.6) contra el proyecto de Supabase
  `PychSims`. Chromium (Playwright 1.63) con WebGL por SwiftShader. Auditoría de accesibilidad con
  `@axe-core/playwright` 4.14 (reglas WCAG 2.0/2.1 A y AA).
- **Automatización:** `pnpm test` → **1 163 tests** en 85 archivos; E2E nuevos:
  `navegacion.spec.ts` (HU-22) y `accesibilidad.spec.ts` (HU-25), **36 tests aprobados**.

## HU-22 — Pantalla principal del docente y navegación general

| #    | Escenario                                                                         | Resultado esperado                                                         | Resultado                          |
| ---- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| 22.1 | T01: tras iniciar sesión llega a su bandeja                                       | Saludo con su nombre y la sección «Por revisar»                            | ✅ Aprobado (`navegacion.spec.ts`) |
| 22.2 | T02: el menú lateral (shadcn/ui `Sidebar`) ofrece las cinco secciones del docente | Inicio, Asignar práctica, Revisiones, Estudiantes, Casos; sin «Docentes»   | ✅ Aprobado                        |
| 22.3 | T03: cada enlace lleva a su sección y queda como página actual                    | URL correcta, `h1` visible y un solo enlace con `aria-current="page"`      | ✅ Aprobado (5 secciones)          |
| 22.4 | T03: una subpágina mantiene activa su sección                                     | `/configuracion/casos/nuevo` deja activo «Casos» y ofrece volver           | ✅ Aprobado                        |
| 22.5 | T04: flujo completo inicio → asignar → revisiones → estudiantes → inicio → atrás  | El menú siempre coincide con la página; «Atrás» del navegador es coherente | ✅ Aprobado                        |
| 22.6 | El estudiante tiene su propia barra, sin el menú del docente                      | «Mis prácticas» actual; las rutas del docente lo devuelven a `/practicas`  | ✅ Aprobado                        |
| 22.7 | El Administrador ve además «Docentes»                                             | Sección `/admin` activa                                                    | ✅ Aprobado                        |

## HU-23 — Pantalla de instrucciones del caso clínico

| #    | Escenario                                                                      | Resultado esperado                                                                   | Resultado                                                             |
| ---- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 23.1 | T01: diálogo entre la carga 3D y el inicio, con el título del caso como nombre | Aparece con el consultorio ya cargado al fondo                                       | ✅ Aprobado (`instrucciones-caso.test.tsx`, E2E `comenzarSimulacion`) |
| 23.2 | T02: caso completo y datos del estudiante                                      | Competencia, objetivos, descripción, paciente y «Practicas como {nombre} · {código}» | ✅ Aprobado                                                           |
| 23.3 | T02: reglas de la práctica y aviso de contenido                                | Incluye «no se puede reanudar» y los 10 minutos de inactividad                       | ✅ Aprobado                                                           |
| 23.4 | T03: «Empezar la práctica» exige aceptar la privacidad                         | Deshabilitado sin la casilla; con ella llama a `comenzarSesion`                      | ✅ Aprobado                                                           |
| 23.5 | T03: la hora de inicio la fija la base de datos                                | El store toma `inicio` de la respuesta (el tiempo de lectura no cuenta)              | ✅ Aprobado                                                           |
| 23.6 | T03: «Ahora no» y Escape                                                       | Confirma la hora límite para volver; no empieza la práctica                          | ✅ Aprobado                                                           |
| 23.7 | Si no se puede comenzar                                                        | Aviso y la práctica sigue sin comenzar                                               | ✅ Aprobado                                                           |

## HU-24 — Los doce escenarios con prompts definitivos

| #    | Escenario                                                | Resultado esperado                                                                  | Resultado                                           |
| ---- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| 24.1 | T01: E-01 a E-06 con «Cómo conversas» y «Lo que guardas» | Estilo como conducta; ≥ 2 datos guardados, cada uno con su condición de revelación  | ✅ Aprobado (`prompts-escenarios.test.ts`)          |
| 24.2 | T01: E-07 a E-12 (migración propia)                      | Mismo formato, con «Riesgo:» y la frase de apertura de la portada                   | ✅ Aprobado (ya existía)                            |
| 24.3 | T01: coherencia con el perfil                            | «Eres {nombre}», edad, «Estado actual» y la misma apertura que la portada pública   | ✅ Aprobado                                         |
| 24.4 | T01: riesgo (E-03)                                       | La ideación pasiva solo se admite ante una pregunta directa y sin describir métodos | ✅ Aprobado                                         |
| 24.5 | T02: comportamiento de cada paciente con la IA real      | —                                                                                   | ⏳ Manual: usar `/laboratorio/npc` (ver pendientes) |
| 24.6 | T03: assets 3D de los doce escenarios                    | Un JSON de escena válido por escenario y los modelos resueltos                      | ✅ Aprobado (`escena.schema.test.ts`)               |

## HU-25 — Accesibilidad y diseño responsivo

| #     | Escenario                                                                                                                   | Resultado esperado                                                               | Resultado                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 25.1  | T01: contraste de todos los pares de color, tema claro y oscuro                                                             | ≥ 4,5:1 en texto y ≥ 3:1 en bordes de campos y anillo de foco                    | ✅ Aprobado (`contraste.test.ts`, 49 comprobaciones desde `globals.css`)  |
| 25.2  | T03: axe-core en `/`, `/login`, `/privacidad`                                                                               | Sin violaciones WCAG 2.1 A/AA                                                    | ✅ Aprobado tras la corrección de 25.8                                    |
| 25.3  | T03: axe-core en las cinco pantallas del docente y en «Mis prácticas»                                                       | Sin violaciones                                                                  | ✅ Aprobado tras la corrección de 25.8                                    |
| 25.4  | T02: el formulario de acceso se recorre con Tab                                                                             | Correo → contraseña → mostrar contraseña → Entrar; el error se anuncia (`alert`) | ✅ Aprobado                                                               |
| 25.5  | T02: «Saltar al contenido» es el primer foco y lleva a `#contenido`                                                         | Visible al enfocarse                                                             | ✅ Aprobado                                                               |
| 25.6  | T02: el menú lateral se activa con Enter                                                                                    | Navega a la sección                                                              | ✅ Aprobado                                                               |
| 25.7  | T04: celular (375), tableta (768) y escritorio (1280) en todas las pantallas                                                | Sin desplazamiento horizontal; el menú móvil se abre desde su botón              | ✅ Aprobado (públicas, docente y estudiante)                              |
| 25.8  | **Hallazgo:** `label-content-name-mismatch` (WCAG 2.5.3) en las tarjetas de escenarios de la portada y en el menú de cuenta | El nombre accesible debe contener el texto visible                               | ✅ Corregido: se quitaron los `aria-label` y el nombre sale del contenido |
| 25.9  | T05: tamaño de texto base ≥ 16 px y zoom del 200 % (640 px de ancho)                                                        | Sin desborde horizontal                                                          | ✅ Aprobado                                                               |
| 25.10 | T06: consistencia visual                                                                                                    | Tema único «Nogal y salvia» con tokens; sin colores sueltos en los componentes   | ✅ Revisado (`DESIGN.md`); sin test automático                            |

## Qué falta o no se pudo automatizar

- **24.5** requiere la IA real y juicio humano sobre el comportamiento: se hace desde
  `/laboratorio/npc` conversando con cada uno de los doce pacientes.
- **Lector de pantalla real** (NVDA, VoiceOver): axe detecta lo que se puede medir con código, no
  la experiencia de uso. Queda una pasada manual.
- **Contraste sobre imágenes y el Canvas 3D**: los textos del HUD flotan sobre la escena y su
  contraste real depende de la escena; el test cubre los tokens, no cada fotograma.
