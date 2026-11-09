# Actualización de Taiga (8 de noviembre de 2026)

**Subido a Taiga el 8 de noviembre de 2026** con la API (58 HU y 216 tareas). Parte de `taiga actual.json` (la
exportación de hoy del proyecto `stevend18skz-pychsims`) y se contrastó con el código, el historial
de git, `docs/taiga-estado.md` y los registros de `docs/pruebas/`.

## Lo que se encontró

- **Taiga tiene 29 historias (HU-01 a HU-30, sin HU-05) y 107 tareas.** El último cambio es del
  7 de octubre. Todas las historias siguen en `New`; 49 tareas están cerradas, 7 en
  `Ready for test` y 51 en `New`.
- **HU-31 a HU-44 nunca se subieron.** Existían solo en el `taiga.json` local (ignorado por git),
  redactadas en una sesión anterior. Aquí se retoman, se revisan y se completan con criterios de
  aceptación.
- **Lo hecho después del 25 de octubre** (auditorías, CI, observabilidad, la revisión del 7 de
  noviembre) y varias funciones de octubre (casos propios, paciente expresivo, E-07 a E-12, límite
  de mensajes, rediseño) no tienen historia. Se proponen **HU-45 a HU-60**.
- Los sprints 3 a 6 siguen abiertos aunque sus fechas pasaron. Se propone cerrarlos y crear un
  **Sprint 7** para el trabajo desde el 29 de octubre.

## Decisiones (8 de noviembre)

1. HU-31 a HU-44 van todas en el Sprint 4, como en el borrador anterior.
2. Sprint 7: «Sprint 7: Endurecimiento, calidad y evaluación con usuarios», del 2026-10-29 al
   2026-11-20.
3. Sin etiqueta para las historias agregadas después del plan.
4. La evaluación con usuarios no va a Taiga.
5. HU-32 queda `In progress` (T04 sin empezar): el inicio con Google se configura después.
6. Menores: HU-24 se renombra; HU-25 recibe la T07 (lector de pantalla); HU-30 · T03 se cierra
   con un comentario; HU-59 es una historia aparte. HU-49 y HU-52, que siguen abiertas, pasan al
   Sprint 7. HU-51 (falta Figma) y HU-57 (faltan borrar ramas) quedaron `In progress` por sus tareas
   abiertas; HU-51 pasó al Sprint 7.

Al subirlo, la tabla de HU del documento de grado (`latex/generado/tabla-62.tex`, «fechas
planificadas en Taiga») queda desactualizada: habría que sumarle HU-31 a HU-59.

---

## Parte A. Cambios de estado de lo que ya existe

Estados de Taiga: historias `New → Ready → In progress → Ready for test → Done`; tareas
`New → In progress → Ready for test → Closed`.

### Sprints

| Sprint                    | Hoy     | Propuesta                                                        |
| ------------------------- | ------- | ---------------------------------------------------------------- |
| Sprint 0, 1 y 2           | Cerrado | Sin cambio                                                       |
| Sprint 3 (NPC e IA)       | Abierto | Cerrar                                                           |
| Sprint 4 (HUD y métricas) | Abierto | Cerrar                                                           |
| Sprint 5 (interfaz)       | Abierto | Cerrar, aunque HU-24 y HU-25 quedan abiertas (pasan al Sprint 7) |
| Sprint 6 (testing)        | Abierto | Cerrar; HU-29 pasa al Sprint 7                                   |

Taiga no deja cerrar un sprint con historias abiertas sin moverlas. Por eso HU-24, HU-25 y HU-29
se mueven al Sprint 7.

### Historias HU-01 a HU-30

| HU    | Hoy | Propuesta                     | Tareas                                                          | Por qué                                                                    |
| ----- | --- | ----------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| HU-01 | New | **Done**                      | todas cerradas                                                  | Sprint 0 terminado                                                         |
| HU-02 | New | **Done**                      | todas cerradas                                                  | `autenticacion.spec.ts`                                                    |
| HU-03 | New | **Done**                      | todas cerradas                                                  | `src/proxy.ts`, DAL, `seguridad.test.ts`                                   |
| HU-04 | New | **Done**                      | todas cerradas                                                  |                                                                            |
| HU-06 | New | **Done**                      | todas cerradas                                                  |                                                                            |
| HU-07 | New | **Done**                      | todas cerradas                                                  | Las configuraciones guardadas pasaron a ser casos propios (HU-45)          |
| HU-08 | New | **Done**                      | todas cerradas                                                  |                                                                            |
| HU-09 | New | **Done**                      | todas cerradas                                                  |                                                                            |
| HU-10 | New | **Done**                      | todas cerradas                                                  |                                                                            |
| HU-11 | New | **Done**                      | #49 Ready for test → **Closed**                                 | Los GLB se sirven optimizados desde Storage                                |
| HU-12 | New | **Done**                      | #56, #57, #58 → **Closed**                                      | `route.test.ts` de `/api/npc/chat`                                         |
| HU-13 | New | **Done**                      | #62 → **Closed**                                                | `conversation-panel.tsx`, `conversacion.spec.ts`                           |
| HU-14 | New | **Done**                      | #65, #66 → **Closed**                                           | `store/*.test.ts`, `estados-npc.test.ts`                                   |
| HU-15 | New | **Done**                      | todas cerradas                                                  | Ampliada después por HU-46                                                 |
| HU-16 | New | **Done**                      | todas cerradas                                                  |                                                                            |
| HU-17 | New | **Done**                      | #78, #79, #80 → **Closed**                                      | `hud-sesion.tsx`; ajustes de voz y ambiente en un botón                    |
| HU-18 | New | **Done**                      | #81 a #84 → **Closed**                                          | `lib/metrics.ts`, `use-proximidad.ts`                                      |
| HU-19 | New | **Done**                      | #85 a #87 → **Closed**                                          | Migración `20261025010000_metricas_sesion` aplicada                        |
| HU-20 | New | **Done**                      | #88, #89 → **Closed**                                           | Reintenta 3 veces los fallos pasajeros                                     |
| HU-21 | New | **Done**                      | #90 a #94 → **Closed**                                          | `/resultados`, `resultados.spec.ts`                                        |
| HU-22 | New | **Done**                      | #96 a #99 → **Closed**                                          | `navegacion.spec.ts`; la pantalla de inicio es la bandeja `/inicio`        |
| HU-23 | New | **Done**                      | #101 a #103 → **Closed**                                        | `instrucciones-caso.test.tsx` (17 pruebas)                                 |
| HU-24 | New | **In progress** → Sprint 7    | #105, #107 → **Closed**; #106 → **In progress**                 | Falta conversar con cada paciente a mano. Ver nota 1                       |
| HU-25 | New | **Ready for test** → Sprint 7 | #109 a #114 → **Closed**                                        | Falta la pasada con lector de pantalla (NVDA). Ver nota 2                  |
| HU-26 | New | **Done**                      | #116 a #119 → **Closed**                                        | 1 402 pruebas unitarias; cobertura sobre el 70 %                           |
| HU-27 | New | **Done**                      | #121 a #124 → **Closed**                                        | 115 de 116 E2E el 3 de noviembre                                           |
| HU-28 | New | **Done**                      | #126 a #128 → **Closed**                                        | 75 FPS con GPU real (`docs/performance.md`)                                |
| HU-29 | New | **In progress** → Sprint 7    | #130, #131 → **Closed**; #132 → **In progress**; #133 → **New** | Producción desplegada; faltan E2E contra producción y el acceso del jurado |
| HU-30 | New | **Done**                      | #135, #136 → **Closed**; #137 → **Closed**                      | Ver nota 3                                                                 |

**Nota 1 (HU-24).** El título dice «seis escenarios», pero ahora son doce (los otros seis son
HU-49). Propongo renombrarla a «HU-24 · Prompts definitivos de los casos E-01 a E-06» para que no
se contradigan. Se renombra.

**Nota 2 (HU-25).** Propongo añadir la tarea **T07 · Pasada con lector de pantalla (NVDA) en la
simulación y en la revisión del docente**, en `New`, para que quede claro qué falta. Se añade.

**Nota 3 (HU-30 · T03, JSDoc).** El código no usa JSDoc en todas partes: la convención es comentar
el porqué en español, y las reglas las vigila `calidad.test.ts`. Se cierra con un comentario que lo
explique. Se cierra con comentario.

---

## Parte B. Historias nuevas

Formato de cada una: título, sprint, estado y puntos (Front / Back, como en las existentes);
historia, criterios de aceptación y tareas. Todas quedan asignadas a
`brayan.steven.narvaez@correounivalle.edu.co`.

### Simulación a distancia (retomadas del borrador anterior)

#### HU-31 · Registro y gestión de estudiantes por el docente

Sprint 4 · **Done** · Front 1 / Back 1

Como docente, quiero registrar a mis estudiantes y consultar la ficha de cada uno, para asignarles
prácticas y seguir su avance desde un solo lugar.

**Criterios de aceptación**

- El docente registra a un estudiante con código, nombre y correo `@correounivalle.edu.co`; el
  servidor crea su cuenta sin contraseña. Si otro docente ya lo registró, se reutiliza la cuenta.
- La lista se puede buscar, filtrar y paginar, y los filtros viven en la URL.
- La ficha muestra datos, prácticas y códigos del estudiante.
- El correo de un registro con prácticas no se puede cambiar (lo impide la base de datos).
- Eliminar a un estudiante con una práctica abierta lo advierte antes.
- Un docente solo ve a sus estudiantes (RLS).

**Tareas**

- [Closed] T01 · Crear la tabla `estudiante` con RLS (migración `20261006010000_estudiantes`)
- [Closed] T02 · Registrar al estudiante y crear su cuenta (`registrarEstudiante`, Zod)
- [Closed] T03 · Lista de estudiantes con búsqueda y paginación (vista `estudiante_resumen`)
- [Closed] T04 · Ficha, edición y eliminación del estudiante
- [Closed] T05 · Pruebas: `estudiantes.spec.ts` y pruebas de las acciones

#### HU-32 · Rol estudiante e inicio de sesión con Google

Sprint 4 · **In progress** · Front 1 / Back 1

Como estudiante, quiero entrar con mi cuenta institucional de Google, para acceder a mis prácticas
sin crear ni recordar otra contraseña.

**Criterios de aceptación**

- «Continuar con Google» solo admite correos `@correounivalle.edu.co` registrados por un docente;
  cualquier otro llega a `/acceso-denegado`.
- El estudiante solo ve sus rutas (`/practicas`, `/unirse`, `/simulacion`, `/resultados`).
- Las cuentas de estudiante no pueden crear contraseña y el menú no se lo ofrece.
- Los E2E usan cuentas de prueba `@psysim.test` con contraseña, porque Google no se automatiza.

**Tareas**

- [Closed] T01 · Rol `estudiante` en la DAL y en `src/proxy.ts` (migración `20261007010000_rol_estudiante`)
- [Closed] T02 · Botón de Google y ruta `/auth/callback` con el filtro de dominio
- [Closed] T03 · Cuentas de estudiante de prueba con `pnpm db:seed`
- [New] T04 · Activar el proveedor de Google en Supabase y probarlo con una cuenta real

#### HU-33 · Códigos de acceso a la práctica

Sprint 4 · **Done** · Front 1 / Back 1

Como docente, quiero asignar un caso a un estudiante con un código de acceso, para que practique
desde su propio equipo sin que yo inicie la práctica por él.

**Criterios de aceptación**

- El docente elige caso, ajustes del paciente, estudiante y vigencia (1, 3, 7 o 30 días; 7 por
  defecto) y obtiene un código de un solo uso (`abc-defg-hij`), un enlace `/unirse/<código>` y un
  mensaje listo para copiar o compartir.
- Los códigos sin usar se pueden volver a compartir o anular desde la ficha del estudiante.
- Archivar un caso anula sus códigos sin usar.

**Tareas**

- [Closed] T01 · Tabla `asignacion` (migración `20261007020000_codigos_acceso_retroalimentacion`)
- [Closed] T02 · Generar el código desde `/configuracion`
- [Closed] T03 · Compartir el código (enlace, mensaje y botón de compartir del sistema)
- [Closed] T04 · Anular códigos sin usar

#### HU-34 · Canje del código por el estudiante

Sprint 4 · **Done** · Front 1 / Back 1

Como estudiante, quiero escribir el código o abrir el enlace que me envió mi docente, para empezar
la práctica que me asignó.

**Criterios de aceptación**

- `canjear_codigo` comprueba que el código sea del estudiante, esté vigente y no esté anulado.
- Un código vencido, anulado o ajeno muestra un mensaje que explica qué pasó.
- En el celular, el código no se gasta: se avisa que la práctica se hace en un computador.

**Tareas**

- [Closed] T01 · Función `security definer` `canjear_codigo`
- [Closed] T02 · Formulario en `/practicas` y ruta `/unirse/[codigo]`
- [Closed] T03 · Flujo completo a distancia en `e2e/flujo-completo.spec.ts`

#### HU-35 · Panel «Mis prácticas» del estudiante

Sprint 4 · **Done** · Front 1 / Back 1/2

Como estudiante, quiero ver en un solo lugar el estado de mis prácticas y retomar la que dejé
abierta, para saber qué me toca hacer y no perder mi avance.

**Criterios de aceptación**

- Las prácticas se agrupan por estado: la abierta primero (con la hora concreta hasta la que puedo
  volver), luego «Esperando retroalimentación» y «Con retroalimentación».
- Una práctica en curso se retoma con la conversación guardada en el servidor.
- «Salir» en el HUD confirma hasta qué hora queda abierta la práctica.

**Tareas**

- [Closed] T01 · Página `/practicas`
- [Closed] T02 · Retomar una práctica en curso
- [Closed] T03 · Salir sin terminar, con confirmación

#### HU-36 · Revisiones y seguimiento de prácticas del docente

Sprint 4 · **Done** · Front 2 / Back 1/2

Como docente, quiero ver todas las prácticas de mis estudiantes con su estado, para saber cuáles
siguen en curso y cuáles esperan mi retroalimentación.

**Criterios de aceptación**

- `/sesiones` tiene búsqueda, filtros por estado, caso y fecha, orden, vistas por estudiante, por
  caso y matriz estudiantes × casos, con paginación.
- Mientras el estudiante practica, la revisión solo dice «Simulación en progreso» y se actualiza
  sola.
- El docente puede dar por interrumpida una práctica que el estudiante no terminó; el tiempo de
  las interrumpidas cuenta en los indicadores.

**Tareas**

- [Closed] T01 · Página Revisiones con filtros, vistas y paginación
- [Closed] T02 · Vista «Simulación en progreso»
- [Closed] T03 · Dar por interrumpida una práctica (`interrumpirSesion`)
- [Closed] T04 · Pruebas: `revisiones.spec.ts`

#### HU-37 · Cierre de la práctica por inactividad

Sprint 4 · **Done** · Front 1/2 / Back 1

Como estudiante, quiero que me avisen antes de que la práctica se cierre por inactividad, para no
perderla por una distracción; y como docente, quiero que las prácticas abandonadas no queden
abiertas para siempre.

**Criterios de aceptación**

- Tras 10 minutos sin actividad, el servidor cierra la práctica.
- El aviso previo se comparte entre pestañas; una pestaña oculta no mantiene la práctica abierta.
- Al cerrarse, se muestra lo que alcanzó a quedar registrado.

**Tareas**

- [Closed] T01 · Registrar la actividad y cerrar en el servidor (migración `20261008010000_cierre_por_inactividad`)
- [Closed] T02 · Aviso de inactividad y resumen al cerrar (`use-inactividad.test.tsx`)

#### HU-38 · Retroalimentación del docente con frases comentadas

Sprint 4 · **Done** · Front 2 / Back 1

Como docente, quiero comentar frases concretas de la conversación y publicar una retroalimentación
con nota, para que el estudiante sepa exactamente qué mejorar.

**Criterios de aceptación**

- El docente selecciona una frase de una intervención del estudiante y la comenta; los comentarios
  se ven como globos junto al texto.
- La retroalimentación (comentario general y nota de 0,0 a 5,0) se guarda como borrador hasta
  publicarla; se puede corregir después de publicada.
- «Publicar y abrir la siguiente» lleva a la próxima práctica por revisar.
- Quitar un comentario ofrece «Deshacer».

**Tareas**

- [Closed] T01 · Tablas `retroalimentacion` y `anotacion` con RLS
- [Closed] T02 · Subrayado y comentarios en `/sesiones/[id]`
- [Closed] T03 · Borrador, publicación y «Publicar y abrir la siguiente»

#### HU-39 · Lectura de la retroalimentación por el estudiante

Sprint 4 · **Done** · Front 1 / Back 1/2

Como estudiante, quiero releer mi conversación con la nota y los comentarios de mi docente, para
reflexionar sobre mi desempeño.

**Criterios de aceptación**

- Antes de publicarse, la práctica muestra «Pendiente de retroalimentación».
- Después, se ven la nota, el comentario general y las frases subrayadas con su comentario.
- El estudiante nunca puede leer un borrador del docente, ni desde la consola (RLS).

**Tareas**

- [Closed] T01 · Vista `/practicas/[id]`
- [Closed] T02 · Políticas de RLS para lo publicado

#### HU-40 · Administrador y gestión de docentes

Sprint 4 · **Done** · Front 1 / Back 1

Como Administrador, quiero crear y gestionar las cuentas de los docentes, para controlar quién usa
la plataforma ahora que el registro público está desactivado.

**Criterios de aceptación**

- Solo el Administrador entra a `/admin`; también puede trabajar como docente.
- Crea docentes con ingreso por Google o con contraseña temporal.
- Puede editar, desactivar, restablecer la contraseña y eliminar a un docente; una cuenta
  desactivada pierde el acceso al instante, no cuando vence su token.

**Tareas**

- [Closed] T01 · Rol `superadmin` (migraciones `20261009010000` y `20261009020000`)
- [Closed] T02 · Crear docentes desde `/admin`
- [Closed] T03 · Gestión de cada docente en `/admin/docentes/[id]`
- [Closed] T04 · Pruebas: `admin.spec.ts`

#### HU-41 · Exportación de notas e informe del estudiante

Sprint 4 · **Done** · Front 1 / Back 1/2

Como docente, quiero exportar las notas e imprimir el informe de un estudiante, para llevar los
resultados al sistema de la universidad.

**Criterios de aceptación**

- `/sesiones/exportar` genera un CSV con los mismos filtros y el mismo orden de Revisiones, con
  fechas en hora de Bogotá.
- `/estudiantes/[id]/notas` se imprime o se guarda como PDF, con una fila por práctica y solo la
  retroalimentación publicada.

**Tareas**

- [Closed] T01 · Exportar las prácticas a CSV
- [Closed] T02 · Informe imprimible del estudiante

#### HU-42 · Ensayar otra respuesta durante la práctica

Sprint 4 · **Done** · Front 1 / Back 1

Como estudiante, quiero volver a una de mis intervenciones y ensayar otra respuesta, para aprender
de un error sin perder la práctica; y como docente, quiero ver esos intentos, para entender cómo
razonó el estudiante.

**Criterios de aceptación**

- Al reformular, el paciente olvida lo que vino después, pero nada se borra (`descartado_en`).
- El docente ve el intento plegado en su lugar, según la norma INACSL de integridad.
- Las reformuladas cuentan en el tope de intervenciones de la práctica.

**Tareas**

- [Closed] T01 · Reformulación en el servidor (migración `20261018010000_ensayar_otra_respuesta`)
- [Closed] T02 · Acción «Ensayar otra respuesta» en el panel de conversación
- [Closed] T03 · Intentos reformulados en la revisión del docente
- [Closed] T04 · Dictado por voz opcional en el panel

#### HU-43 · Modo presencial en el computador del docente

Sprint 4 · **Done** · Front 1 / Back 1

Como docente, quiero entregar mi computador a un estudiante durante la clase, para que practique en
su propia cuenta sin que se mezcle con la mía.

**Criterios de aceptación**

- «Practicar en este equipo» cierra la sesión del docente y lleva a `/entrega`, que saluda al
  estudiante por su nombre.
- Mientras dure la entrega, `/auth/callback` solo acepta cuentas de estudiante.
- Al terminar, se borra del navegador todo lo de la cuenta (notas, borradores, consentimientos) y
  se pide cerrar también la sesión de Google.

**Tareas**

- [Closed] T01 · Entrega del equipo (`entregarEquipo`, cookies de 4 horas)
- [Closed] T02 · Pantalla `/entrega`
- [Closed] T03 · Cierre en equipo compartido y `/entrega/fin`
- [Closed] T04 · Borrado de los datos locales de la cuenta (`olvidarDatosDeLaCuenta`)
- [Closed] T05 · Pruebas: `presencial.spec.ts`

#### HU-44 · Reflexión del estudiante después de la práctica

Sprint 4 · **Done** · Front 1 / Back 1/2

Como estudiante, quiero escribir una reflexión al terminar la práctica, para ordenar lo que
aprendí; y como docente, quiero leerla, para tenerla en cuenta en mi retroalimentación.

**Criterios de aceptación**

- La pantalla de resultados ofrece la reflexión guiada (estándar INACSL de _debriefing_).
- El docente la lee en la revisión de la práctica.
- El aviso de privacidad declara que se guarda.

**Tareas**

- [Closed] T01 · Tabla `reflexion` y `guardar_reflexion` (migración `20261025020000_reflexion_estudiante`)
- [Closed] T02 · Formulario en `/resultados` y lectura del docente (`resultados.spec.ts`)

### Casos y paciente

#### HU-45 · Casos propios del docente

Sprint 3 · **Done** · Front 2 / Back 1

Como docente, quiero crear mis propios casos clínicos y ajustar los de PsySim sin redactar
instrucciones para la IA, para practicar situaciones que se ajusten a mi curso.

**Criterios de aceptación**

- «Mis casos» tiene un constructor guiado (ficha del paciente, motivo, actitudes, lo que guarda,
  riesgo), un modo texto y una vista previa.
- El docente prueba al paciente en un chat antes de asignarlo; esas pruebas cuentan en el límite
  de mensajes a la IA.
- Las reglas comunes del paciente las pone el servidor y el docente no las puede quitar.
- Al asignar, ajusta apertura, emociones y actitudes, con un resumen en lenguaje cotidiano;
  «Ajustar a mi medida» crea una variante de un caso de PsySim.
- Crear un caso guarda un borrador automático y avisa al salir con cambios sin guardar.
- Un docente no puede usar un código oficial `E-NN` para sus casos.

**Tareas**

- [Closed] T01 · Casos con RLS por dueño (migración `20261004010000_casos_personalizados`)
- [Closed] T02 · Constructor guiado, modo texto y vista previa
- [Closed] T03 · Chat de prueba del paciente
- [Closed] T04 · Ajustes guiados al asignar y variantes de los casos de PsySim
- [Closed] T05 · Borrador automático y aviso al salir

#### HU-46 · Paciente expresivo: emociones, rostro y gestos

Sprint 5 · **Done** · Front 3 / Back 1/2

Como estudiante, quiero que el paciente muestre en el cuerpo y en la cara lo que siente, para
practicar la lectura de la comunicación no verbal.

**Criterios de aceptación**

- Cada respuesta trae una emoción y su intensidad (1 a 3), que se guardan con el mensaje.
- El rostro se anima (parpadeo, mirada, expresión, boca al hablar).
- Los brazos gesticulan según la emoción, al ritmo de la voz y ante frases clave, sin atravesar el
  cuerpo ni la silla.
- El reposo varía sin repetirse; asiente en las pausas del estudiante y reacciona al silencio.
- Con «reducir movimiento» del sistema, los gestos se suavizan.

**Tareas**

- [Closed] T01 · Pacientes 3D con esqueleto y animaciones por emoción
- [Closed] T02 · Rostro animado (`lib/npc/rostro.ts`)
- [Closed] T03 · Emoción persistida por mensaje (migración `20261012020000_mensaje_emocion`)
- [Closed] T04 · Gestos procedurales con cinemática inversa (`lib/npc/*.test.ts`)
- [Closed] T05 · Escucha activa, reacción al silencio y respeto a `prefers-reduced-motion`

#### HU-47 · Ambiente y sonido del consultorio

Sprint 5 · **Done** · Front 2 / Back 0

Como estudiante, quiero que el consultorio suene y se sienta como un espacio real, para
concentrarme en la entrevista como lo haría en una consulta.

**Criterios de aceptación**

- La luz y el clima del consultorio cambian con la emoción del paciente; el velo emocional se puede
  desactivar.
- Hay voz del paciente con sonido espacial y eco de sala, ventilación, tráfico y la puerta al
  entrar; voz del sistema en español opcional.
- Las ventanas muestran una vista exterior; hay un reloj de pared con la hora real.
- Voz y ambiente se ajustan desde un solo botón del HUD.

**Tareas**

- [Closed] T01 · Ambiente dinámico según la emoción (`lib/ambiente/clima.ts`)
- [Closed] T02 · Motor de audio, voz y sonido espacial (`lib/audio`)
- [Closed] T03 · Vista exterior y reloj de pared
- [Closed] T04 · Ajustes de voz y ambiente en el HUD

#### HU-48 · Comportamiento clínico realista del paciente

Sprint 5 · **Done** · Front 1/2 / Back 2

Como docente, quiero que el paciente se comporte como una persona en consulta y no como un
asistente, para que el estudiante practique a ganarse la confianza y a preguntar.

**Criterios de aceptación**

- El paciente no cuenta lo que no le preguntan; la extensión de sus respuestas sigue a la confianza
  que gana el estudiante, y a veces pregunta.
- Cada paciente tiene «lo que guarda», que solo revela con buena escucha.
- El estudiante no da órdenes al paciente ni es una autoridad para él; todo es confidencial.
- Las instrucciones del caso incluyen objetivos, acuerdo de ficción, herramientas (hoja de
  remisión, libreta de notas) y un aviso de contenido sensible con salida.

**Tareas**

- [Closed] T01 · Reglas de comportamiento en el prompt (`lib/ia`, `lib/conversacion`)
- [Closed] T02 · «Lo que guarda» en los pacientes (migración `20261018020000_pacientes_lo_que_guardan`)
- [Closed] T03 · Preparación previa INACSL en las instrucciones del caso
- [Closed] T04 · Hoja de remisión y libreta de notas en la simulación

#### HU-49 · Casos E-07 a E-12

Sprint 7 · **In progress** · Front 1 / Back 1

Como docente, quiero seis casos más, para cubrir situaciones frecuentes que los seis iniciales no
abordan.

**Criterios de aceptación**

- Hay casos de consumo de alcohol, trauma por desplazamiento, adolescente con autolesiones,
  conducta alimentaria restrictiva, violencia en la pareja y soledad en la vejez, cada uno con su
  consultorio, paciente, retrato y captura.
- Los casos con contenido sensible muestran el aviso correspondiente.
- E-07 carga sus texturas incrustadas con la política de contenido activa.
- Cada paciente se probó conversando con él.

**Tareas**

- [Closed] T01 · Escenas `public/scenes/e-07.json` a `e-12.json` y sus modelos
- [Closed] T02 · Siembra en la base de datos (migración `20261018030000_sembrar_escenarios_e07_e12`)
- [Closed] T03 · Retratos y capturas
- [In progress] T04 · Conversar con cada paciente y ajustar su prompt (incluye la prueba manual de E-07)

#### HU-50 · Límite de mensajes a la IA

Sprint 5 · **Done** · Front 1/2 / Back 1

Como responsable del proyecto, quiero limitar cuántos mensajes se envían a la IA por minuto, para
controlar el costo y evitar abusos (RNF-03.7).

**Criterios de aceptación**

- Cada llamada a la IA, también las del docente al probar un paciente, pasa por
  `reservar_peticion_ia`; el conteo vive en la base de datos porque Vercel reparte las peticiones
  entre instancias.
- Al pasar el límite, la ruta responde 429 con `Retry-After`; el estudiante ve cuánto esperar y
  reintenta sin perder su mensaje.
- Hay un tope de 150 intervenciones por práctica.

**Tareas**

- [Closed] T01 · Tabla `peticion_ia` y `reservar_peticion_ia` (migración `20261019010000_limite_peticiones_ia`)
- [Closed] T02 · Respuesta 429 en `/api/npc/chat` y aviso en el panel
- [Closed] T03 · Tope de intervenciones por práctica

### Interfaz

#### HU-51 · Rediseño visual «Nogal y salvia» y bandeja del docente

Sprint 7 · **In progress** · Front 5 / Back 0

Como docente y como estudiante, quiero una interfaz clara y coherente, para encontrar lo que tengo
que hacer sin aprender cada pantalla por separado.

**Criterios de aceptación**

- Hay un sistema visual propio documentado en `DESIGN.md`, con contraste AA comprobado por pruebas.
- El docente y el Administrador aterrizan en `/inicio`: lo pendiente de revisar, quién practica
  ahora y los códigos por vencer.
- La portada pone el código de acceso como acción principal, con barra fija en el celular.
- Los textos siguen la guía de redacción (`redaccion.test.ts`).
- Hay capturas de antes y después (`docs/rediseno/`).
- El prototipo de alta fidelidad está en Figma.

**Tareas**

- [Closed] T01 · Diagnóstico, flujos y textos (`docs/rediseno/fase-1` y `fase-2`)
- [Closed] T02 · Sistema visual y componentes
- [Closed] T03 · Portada, inicio de sesión y galería de casos
- [Closed] T04 · Bandeja del docente y revisión en cadena
- [Closed] T05 · Experiencia del estudiante y del HUD
- [In progress] T06 · Prototipo de alta fidelidad en Figma (faltan exportar 6 PNG y compartirlo)

#### HU-52 · Aviso de privacidad y consentimiento

Sprint 7 · **In progress** · Front 1 / Back 1/2

Como estudiante, quiero saber qué datos guarda la plataforma y aceptarlo antes de practicar, para
decidir con información (Ley 1581 de 2012).

**Criterios de aceptación**

- `/privacidad` explica qué se guarda (conversación, reflexión, métricas), quién lo ve, cuánto
  tiempo y que el texto se envía a Google Gemini.
- El estudiante acepta antes de su primera práctica; la casilla está siempre visible.
- El dictado por voz pide su propio consentimiento.
- Los datos marcados «Por confirmar» se completan y el texto pasa una revisión legal.

**Tareas**

- [Closed] T01 · Página de privacidad con aceptación (`lib/privacidad.ts`)
- [Closed] T02 · Consentimiento del dictado
- [New] T03 · Completar los datos «Por confirmar» y pedir revisión legal

#### HU-53 · Redacción, SEO y vista previa de enlaces

Sprint 6 · **Done** · Front 1 / Back 0

Como docente, quiero que el enlace que comparto con un estudiante se vea confiable, y que los
textos de la plataforma suenen igual en todas partes, para que el estudiante entienda qué tiene
que hacer.

**Criterios de aceptación**

- Hay una guía de voz y un glosario (`docs/guia-de-redaccion.md`) que vigila `redaccion.test.ts`.
- Los mensajes de error siguen el mismo patrón («No pudimos…»).
- Los enlaces compartidos muestran título e imagen propios; manifiesto con los colores de la marca,
  datos estructurados y `llms.txt`.
- Las imágenes para compartir pesan 70 % menos.

**Tareas**

- [Closed] T01 · Guía de redacción y glosario unificado
- [Closed] T02 · Manifiesto, vista previa de enlaces y datos estructurados (`seo.test.ts`)
- [Closed] T03 · Optimización del icono y las imágenes para compartir

### Calidad y operación

#### HU-54 · Seguridad de la IA y de la web (OWASP)

Sprint 6 · **Done** · Front 1 / Back 2

Como responsable del proyecto, quiero proteger la plataforma según OWASP Top 10 para LLM y para
web, para que nadie pueda manipular al paciente ni robar datos.

**Criterios de aceptación**

- El contexto de la IA se arma con lo que guardó el servidor, nunca con el historial que manda el
  navegador, y el prompt del paciente nunca llega al navegador.
- Una respuesta que copia 10 palabras seguidas de las instrucciones se descarta (OWASP LLM07);
  las frases citadas no cuentan.
- Política de contenido con _nonce_, HSTS y COOP; un XSS en línea queda bloqueado
  (`csp.spec.ts`).
- `pnpm audit` sin vulnerabilidades.
- Hallazgos y correcciones documentados en `docs/auditoria-seguridad.md`.

**Tareas**

- [Closed] T01 · Contexto armado en el servidor y tope por práctica
- [Closed] T02 · Filtro de fuga del prompt y reglas endurecidas
- [Closed] T03 · Política de contenido, HSTS y COOP
- [Closed] T04 · Actualizar dependencias (Next 16.4.3) y `pnpm audit:deps`
- [Closed] T05 · Informe de la auditoría

#### HU-55 · Integridad de los datos que ve el docente

Sprint 7 · **Done** · Front 1/2 / Back 3

Como docente, quiero confiar en que la transcripción y los números que reviso no fueron alterados
por el estudiante, para que mi retroalimentación se base en lo que de verdad pasó.

**Criterios de aceptación**

- El navegador no puede insertar mensajes: el intercambio lo guarda `/api/npc/chat` con
  `guardar_intercambio`, que solo ejecuta `service_role`.
- Intervenciones, duración y tokens los calcula la base de datos; del navegador solo se acepta lo
  que solo él mide (latencia percibida, proximidad), acotado.
- `usuario` solo expone `id, nombre, rol`; las funciones de rol leen la tabla, no el token.
- Toda tabla nueva queda cerrada por defecto y toda función `security definer` tiene
  `search_path` fijo y `revoke` a `public, anon` (`seguridad.test.ts`).
- Las migraciones que quitan permisos se aplican después de desplegar (staging y producción
  comparten la base).
- Cambiar la contraseña pide la actual.

**Tareas**

- [Closed] T01 · El servidor guarda la conversación y la base calcula las métricas (migración `20261029010000`)
- [Closed] T02 · Permisos de cuentas por la tabla y perfil leído en el servidor (migración `20261029020000`)
- [Closed] T03 · Cerrar la escritura del cliente (migración `20261029030000`, después de desplegar)
- [Closed] T04 · Tablas cerradas por defecto (migración `20261031010000`)
- [Closed] T05 · Cambio de contraseña con la contraseña actual
- [In progress] T06 · Aplicar la migración `20261107010000_revision_7_noviembre`

#### HU-56 · Observabilidad y salud del servicio

Sprint 7 · **Done** · Front 1/2 / Back 1

Como responsable del proyecto, quiero saber cuándo falla la plataforma y por qué, para corregirlo
antes de que lo note un estudiante.

**Criterios de aceptación**

- `/api/salud` responde sin sesión; con `?profunda=1` comprueba también la base de datos.
- El servidor registra eventos con `log('area.evento', …)` sin correos, tokens ni texto de la
  conversación, e incluye el id de petición en las rutas que escriben datos.
- `/api/telemetria` solo acepta peticiones del mismo origen y de tamaño acotado.
- Hay alertas en Vercel o un monitor externo sobre `/api/salud` (`docs/observabilidad.md`).

**Tareas**

- [Closed] T01 · Ruta de salud e id de petición
- [Closed] T02 · Telemetría del navegador acotada
- [Closed] T03 · Crear las alertas en Vercel o el monitor externo (UptimeRobot sobre `/api/salud?profunda=1`, 8 de noviembre)

#### HU-57 · Integración continua y mantenimiento de dependencias

Sprint 7 · **Done** · Front 0 / Back 1

Como responsable del proyecto, quiero que cada cambio se compruebe solo antes de llegar a
producción, para no romper lo que ya funciona.

**Criterios de aceptación**

- GitHub Actions corre lint, tipos, formato y pruebas en cada PR.
- Dependabot propone actualizaciones semanales agrupadas.
- `main` está protegida: solo entra por PR con el check en verde, sin push forzado ni borrado.

**Tareas**

- [Closed] T01 · Flujo de calidad en GitHub Actions (`.github/workflows/calidad.yml`)
- [Closed] T02 · Dependabot (`.github/dependabot.yml`)
- [Closed] T03 · Protección de la rama `main`
- [Closed] T04 · Borrar las ramas ya fusionadas

#### HU-58 · Robustez ante fallos de red y de la IA

Sprint 7 · **Done** · Front 2 / Back 1

Como estudiante, quiero que un corte de red o una falla de la IA no me haga perder la práctica ni
me confunda, para seguir con la entrevista cuando se recupere.

**Criterios de aceptación**

- Si `guardar_intercambio` falla, la ruta responde 503 y el mensaje no se da por guardado.
- Reintentar no duplica el intercambio ni vuelve a llamar a la IA si ya quedó guardado.
- Una respuesta que llega después de salir de la práctica se descarta; un 409 dice «La práctica
  ya terminó».
- En el panel, un corte de red muestra un aviso y no la página de error.
- Sin WebGL hay un aviso propio; tras 45 s de carga sin avance se ofrece «Recargar».
- El cierre reintenta guardar las métricas ante fallos pasajeros.

**Tareas**

- [Closed] T01 · Reintento idempotente del chat y 503 al fallar el guardado
- [Closed] T02 · Transiciones del panel sin perder la página (`sinPerderElPanel`)
- [Closed] T03 · Avisos sin WebGL y de carga lenta
- [Closed] T04 · Reintentos al guardar las métricas de cierre

#### HU-59 · Medición de rendimiento con GPU real

Sprint 7 · **Done** · Front 1 / Back 0

Como responsable del proyecto, quiero medir el rendimiento de la simulación en producción con un
equipo real, para reportar cifras verificables en el documento de grado.

**Criterios de aceptación**

- 75 FPS sostenidos en E-01, E-04 y E-08 durante diez minutos de conversación.
- Core Web Vitals y Lighthouse medidos y documentados (`docs/auditoria-rendimiento.md`).
- La medición se puede repetir (`e2e/medicion-rendimiento.spec.ts`).

**Tareas**

- [Closed] T01 · Prueba de medición repetible
- [Closed] T02 · Medición contra producción y registro en `docs/performance.md`

---

## Resumen de lo que se subiría

| Qué                    | Cantidad                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Historias actualizadas | 29 (26 a `Done`, HU-24 y HU-29 a `In progress`, HU-25 a `Ready for test`)            |
| Tareas actualizadas    | 58 (de `New` o `Ready for test` a `Closed` o `In progress`)                          |
| Historias nuevas       | 29 (HU-31 a HU-59)                                                                   |
| Tareas nuevas          | 109 (108 de las historias nuevas y la T07 de HU-25)                                  |
| Sprints                | Sprint 7 creado; 3, 5 y 6 cerrados (el 4 sigue abierto mientras HU-32 esté en curso) |

## Cómo se subiría

Un script en node (`scripts/taiga.mjs`, fuera de git si prefieres) que usa `TAIGA_TOKEN` de
`.env.local` y la API de `api.taiga.io`:

1. Primero, en **modo de prueba**, lee el proyecto y muestra qué haría sin cambiar nada.
2. Luego crea el Sprint 7, las historias y sus tareas, y actualiza los estados. Si una historia
   con el mismo título ya existe, la actualiza en vez de duplicarla, así que se puede volver a
   correr sin problema.
3. Al final cierra los sprints 3 a 6 y descarga otra exportación para compararla con este borrador.
