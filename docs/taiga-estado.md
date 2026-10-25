# Estado real del backlog de Taiga (revisión del 25 de octubre de 2026)

Se revisó `taiga.json` (29 historias de usuario y 107 tareas, sprints 0 a 6) contra el código, los
tests y los registros de `docs/pruebas/`. La columna «Taiga» es lo que decía el archivo exportado;
«Real» es lo que se verificó en el repositorio.

**Resumen:** el archivo marcaba las historias como `New` y las tareas de los sprints 0 a 3 como
cerradas (salvo 10 en curso del Sprint 3). Los sprints 4 a 6 figuraban sin empezar. Tras esta
revisión, **todo lo que se puede hacer desde el repositorio está hecho y probado**; lo que queda
depende de acciones en Supabase, Vercel o de una persona (ver «Pendiente»).

Leyenda: ✅ hecho y probado · 🟡 hecho, falta una acción externa o una verificación manual ·
⏳ no se puede cerrar desde el código.

## Sprints 0 a 3 (cerrados antes; se confirman)

| HU    | Historia                                           | Taiga                    | Real | Evidencia                                                                                          |
| ----- | -------------------------------------------------- | ------------------------ | ---- | -------------------------------------------------------------------------------------------------- |
| HU-01 | Configuración inicial del entorno                  | tareas cerradas          | ✅   | `docs/pruebas/sprint-0.md`; `pnpm check`, Husky, Vitest y Playwright funcionando                   |
| HU-02 | Inicio de sesión y persistencia                    | tareas cerradas          | ✅   | `docs/pruebas/sprint-1.md`; `autenticacion.spec.ts`, `lib/auth/*.test.ts`                          |
| HU-03 | Rutas protegidas por rol                           | tareas cerradas          | ✅   | `proxy.test.ts`, `lib/auth/routes.test.ts` (ahora con `/resultados`)                               |
| HU-04 | Cierre de sesión                                   | tareas cerradas          | ✅   | `autenticacion.spec.ts`                                                                            |
| HU-06 | Formulario de configuración y datos del estudiante | tareas cerradas          | ✅   | `docs/pruebas/sprint-2.md`; hoy se asigna con código de acceso (`configuracion.spec.ts`)           |
| HU-07 | Guardar y cargar configuraciones                   | tareas cerradas          | ✅   | Evolucionó a «Casos» propios (`lib/casos/*.test.ts`)                                               |
| HU-08 | Motor de renderizado 3D                            | tareas cerradas          | ✅   | `scene-canvas.tsx`, monitor de FPS; `docs/pruebas/sprint-2.md`                                     |
| HU-09 | Carga del primer escenario 3D                      | tareas cerradas          | ✅   | `escena.schema.test.ts` (los doce escenarios)                                                      |
| HU-10 | Control de cámara y navegación                     | tareas cerradas          | ✅   | `docs/pruebas/sprint-2.md` (colisiones, límites, velocidad independiente de los FPS)               |
| HU-11 | Carga y visualización del NPC                      | T49, T52 sin cerrar      | ✅   | `modelo-glb.tsx` (Storage + Draco), `paciente-personaje.tsx`; `docs/pruebas/sprint-3.md` 11.1–11.5 |
| HU-12 | Route Handler de IA                                | T56, T57, T58 sin cerrar | ✅   | `app/api/npc/chat/route.ts` y su test; E2E con la IA real                                          |
| HU-13 | Interfaz de conversación                           | T62 sin cerrar           | ✅   | `conversation-panel.tsx`, `enviar-mensaje.test.ts`, `conversacion.spec.ts`                         |
| HU-14 | Estado conversacional en Zustand                   | T65, T66, T69 sin cerrar | ✅   | `store/*.test.ts`, `estados-npc.test.ts`                                                           |
| HU-15 | Animaciones del NPC                                | T68 sin cerrar           | ✅   | Gestos procedurales (`lib/npc/*.test.ts`)                                                          |
| HU-16 | Errores de comunicación con la IA                  | tareas cerradas          | ✅   | `conversacion.spec.ts` (HU-16 · T01/T02), 429 por límite de mensajes                               |

## Sprint 4 — HUD, métricas y cierre de sesión (implementado en esta revisión)

| HU    | Historia                  | Taiga | Real | Qué se hizo                                                                                   |
| ----- | ------------------------- | ----- | ---- | --------------------------------------------------------------------------------------------- |
| HU-17 | HUD de la simulación      | New   | ✅   | Estado del paciente en el HUD (`hud-sesion.tsx`); barra y «Terminar práctica» ya existían     |
| HU-18 | Captura de métricas       | New   | ✅   | `lib/metrics.ts`, muestreo de proximidad (`use-proximidad.ts`), slice de métricas             |
| HU-19 | Route Handler de métricas | New   | 🟡   | `app/api/metrics/save` + migración `20261025010000_metricas_sesion.sql` (**falta aplicarla**) |
| HU-20 | Flujo de cierre de sesión | New   | ✅   | `use-finalizar-sesion.ts` guarda y redirige; si el guardado falla, cierra sin métricas        |
| HU-21 | Pantalla de resultados    | New   | ✅   | `/resultados`: indicadores, historial y acciones, para el estudiante y su docente             |

Detalle y escenarios: [`docs/pruebas/sprint-4.md`](pruebas/sprint-4.md).

## Sprint 5 — Interfaz, accesibilidad y escenarios

| HU    | Historia                                | Taiga | Real | Qué se hizo                                                                                                |
| ----- | --------------------------------------- | ----- | ---- | ---------------------------------------------------------------------------------------------------------- |
| HU-22 | Pantalla principal y navegación         | New   | ✅   | Ya existía; se añadió `navegacion.spec.ts` (T04)                                                           |
| HU-23 | Instrucciones del caso                  | New   | ✅   | Ya existía; se añadió `instrucciones-caso.test.tsx` (17 tests)                                             |
| HU-24 | Doce escenarios con prompts definitivos | New   | 🟡   | Prompts E-01 a E-12 y assets listos y probados; **T02** (conversar con cada paciente) es manual            |
| HU-25 | Accesibilidad y responsivo              | New   | ✅   | Contraste AA automatizado, axe-core, teclado, tres anchos. **Se corrigieron 3 fallos reales** (WCAG 2.5.3) |

Detalle y escenarios: [`docs/pruebas/sprint-5.md`](pruebas/sprint-5.md).

## Sprint 6 — Testing, optimización y despliegue beta

| HU    | Historia                      | Taiga | Real | Qué se hizo                                                                                                           |
| ----- | ----------------------------- | ----- | ---- | --------------------------------------------------------------------------------------------------------------------- |
| HU-26 | Suite de tests unitarios      | New   | ✅   | 1 163 tests; cobertura `app/api` 97,9 %, `lib` 79,9 %, `store` 98,5 % (umbral 70 %)                                   |
| HU-27 | Tests E2E con Playwright      | New   | ✅   | Flujo completo, autenticación, configuración y resultados (los cuatro de la historia) más seis más                    |
| HU-28 | Rendimiento del entorno 3D    | New   | 🟡   | DPR adaptativo y Draco ya estaban; `rendimiento.spec.ts` mide carga, FPS y bytes. **T03** en hardware real: pendiente |
| HU-29 | Despliegue beta en Vercel     | New   | ⏳   | `seguridad.test.ts` y `entorno-documentado.test.ts` cubren T01/T02 en el repositorio; T03/T04 requieren Vercel        |
| HU-30 | Documentación del repositorio | New   | ✅   | README con el mapa de tests por funcionalidad, `.env.example` completo y verificado por un test                       |

Detalle y escenarios: [`docs/pruebas/sprint-6.md`](pruebas/sprint-6.md).

## Pendiente (no se puede cerrar desde el código)

1. **Aplicar la migración** `20261025010000_metricas_sesion.sql` en Supabase (HU-19). Sin ella todo
   funciona, pero las métricas no se guardan y los resultados las reconstruyen.
2. **Verificar en producción** (HU-29 · T03): correr `pnpm test:e2e` con `PLAYWRIGHT_BASE_URL` del
   despliegue, tras cargar las variables de entorno en Vercel.
3. **Registrar la URL beta y dar acceso al jurado** (HU-29 · T04).
4. **Medir el rendimiento en el hardware del usuario objetivo** (HU-28 · T03):
   `E2E_FPS_MINIMO=30 pnpm test:e2e e2e/rendimiento.spec.ts` en un computador con GPU integrada.
5. **Conversar con cada uno de los doce pacientes** desde `/laboratorio/npc` (HU-24 · T02).
6. **Pasada con lector de pantalla** (NVDA o VoiceOver) por el estudiante y el docente (HU-25).
7. **Actualizar los estados en Taiga** (las historias figuran como `New`).
