# El paciente responde con el orquestador de NPC

El **orquestador de NPC** es un servicio de Juan José Moreno (FastAPI en Railway, con su propia
base de datos) que simula al paciente: arma su prompt, recalcula una severidad emocional en cada
turno y cierra la conversación por su cuenta si el paciente entra en crisis o recibe un trato
inapropiado. PsySim lo usa como **proveedor principal del paciente**, con Gemini de respaldo.

PsySim sigue siendo la fuente de verdad: la transcripción que revisa el docente, los límites y los
permisos viven en su base de datos. El orquestador es el motor que responde.

```
Navegador ──▶ /api/npc/chat (PsySim, servidor) ──▶ orquestador de NPC ──▶ su proveedor de IA
   ▲                 │  └─ si el orquestador falla ─▶ Gemini (respaldo)
   └── SSE propio ◀──┘  guarda el intercambio en la base de PsySim
```

El navegador nunca habla con el orquestador: no recibe su URL, sus tokens ni sus identificadores,
y no hace falta pedir CORS.

## 1. Puesta en marcha

En este orden (staging y producción comparten la base de datos):

1. **Aplicar la migración** `supabase/migrations/20261111010000_orquestador_npc.sql`. Solo añade
   tablas y funciones: el código ya desplegado sigue funcionando.

   ```bash
   node --env-file=.env.local scripts/aplicar-migracion.mjs supabase/migrations/20261111010000_orquestador_npc.sql
   ```

2. **Desplegar el código.** Sin más cambios, `IA_PROVEEDOR` vale `gemini` y todo funciona como
   antes.
3. **Configurar las variables** (solo servidor; en `.env.local` y en Vercel para staging y
   producción):

   | Variable                 | Qué es                                                                                             |
   | ------------------------ | -------------------------------------------------------------------------------------------------- |
   | `ORQUESTADOR_URL`        | `https://ai-npc-orchestrator-production.up.railway.app`                                            |
   | `ORQUESTADOR_CORREO`     | Cuenta con rol `teacher` en el orquestador (la de la universidad del autor)                        |
   | `ORQUESTADOR_CONTRASENA` | Su contraseña. Si la cuenta se creó con Google, ponerle una antes con `POST /auth/forgot-password` |
   | `ORQUESTADOR_CUENTAS`    | Opcional. Grupo de cuentas `student`: lista JSON en una línea, `[{"correo":"…","contrasena":"…"}]` |
   | `IA_PROVEEDOR`           | `orquestador` para activarlo; `gemini` (por defecto) lo desactiva. Es el interruptor de emergencia |

4. **Sincronizar los casos oficiales** (opcional: cada caso se sincroniza solo la primera vez que
   se practica).

   ```bash
   pnpm orquestador:sincronizar --simular   # muestra qué enviaría, sin llamar al orquestador
   pnpm orquestador:sincronizar             # crea o actualiza los 12 casos
   ```

5. **Poner `IA_PROVEEDOR=orquestador`** y volver a desplegar.

Antes de activarlo con estudiantes, completa los datos pendientes del proveedor en el aviso y
actualiza el consentimiento informado del estudio (sección 10).

## 2. Cuentas del orquestador

El orquestador tiene sus propios usuarios y dos reglas que definen todo el diseño:

- Solo el **dueño** de una sesión escribe mensajes en ella.
- Cada usuario envía como máximo **10 mensajes por minuto**.

PsySim usa dos tipos de cuenta, siempre desde el servidor:

- **Cuenta `teacher`** (`ORQUESTADOR_CORREO`): crea perfiles, escenarios y sesiones, y las cierra.
- **Grupo de cuentas `student`** (`ORQUESTADOR_CUENTAS`): son las dueñas de las sesiones. La
  cuenta `teacher` crea cada sesión a nombre de una del grupo (`user_id`) y el servidor conversa
  iniciando sesión como esa cuenta.

Cada práctica queda **fija a una cuenta**: al comenzar, la base de datos elige la que tiene menos
prácticas activas (`asignar_cuenta_orquestador`, atómica). Los tokens se guardan en la memoria del
proceso, por cuenta y con su vencimiento; nunca en la base de datos. En las tablas y en los
registros una cuenta se identifica con una huella de su correo, no con el correo.

**Modo de una sola cuenta.** Con el grupo vacío, la cuenta `teacher` es dueña de todas las
sesiones y conversa en todas. Alcanza para desarrollo y pruebas; con una clase entera, toda la
plataforma comparte sus 10 mensajes por minuto y habrá esperas.

### Cuántas cuentas hacen falta

Un estudiante envía unos 3 mensajes por minuto (un turno cada 15–20 s). PsySim usa 9 de los 10
mensajes por minuto de cada cuenta (uno de margen), así que **una cuenta atiende unas 3 prácticas
simultáneas sin esperas**:

| Estudiantes practicando a la vez | Cuentas del grupo |
| -------------------------------- | ----------------- |
| hasta 3                          | 1                 |
| 10                               | 4                 |
| 20                               | 7                 |
| 30                               | 10                |

Con menos cuentas no se rompe nada: los turnos esperan su cupo (sección 4).

### Cómo añadir cuentas al grupo

1. Registrar cada cuenta con `POST /auth/signup` (`email`, `password` de 6 o más caracteres,
   `full_name`). Sirven alias del mismo buzón (`usuario+psysim1@gmail.com`).
2. Confirmar el enlace que llega al correo, si el orquestador lo pide.
3. Añadirlas a `ORQUESTADOR_CUENTAS` (máximo 40) y volver a desplegar.

Las prácticas nuevas empiezan a repartirse entre ellas sin tocar código; las que ya estaban en
curso siguen con su cuenta. Si una cuenta se quita de la variable, sus prácticas en curso pasan a
Gemini. **Crear cuentas crea usuarios en la base de Juan José**: hacerlo solo con su conocimiento.

## 3. Casos: perfil y escenario

Cada caso de PsySim (E-01 a E-12 y los propios de cada docente) tiene en el orquestador un
**perfil** (el paciente) y un **escenario** (su situación). PsySim guarda sus id en
`orquestador_caso` y una huella de lo que envió: si nada cambió, no vuelve a llamar.

- Al crear o editar un caso se sincroniza después de responderle al docente. Si el orquestador no
  contesta, el caso se guarda igual y se sincroniza cuando empiece su primera práctica.
- El nombre lleva el prefijo **`-3D-`** que pidió Juan José: `-3D- Marta Lucía (E-01)` y
  `-3D- E-01 · Duelo y pérdida`.
- El `context` del escenario describe la situación, el paciente y los ajustes del docente. El
  orquestador usa ese contexto al componer su propio prompt. Las reglas de Gemini, incluida su
  etiqueta de emoción, se añaden solo cuando PsySim llama directamente a Gemini.
- Los campos del constructor guiado van además a `traits` (edad, ocupación, personalidad, estilo,
  síntomas) y a `behavior.triggers` / `regulators` («se cierra si…», «se abre si…»), que el
  orquestador guarda aunque todavía no los usa.
- Si el docente ajustó el prompt al asignar la práctica, esa práctica usa un **escenario
  variante** (`… · ajuste 1a2b3c4d`) con el mismo perfil.
- **Si desaparecen** (los datos de prueba se pueden borrar): un 404 al actualizar o al abrir la
  sesión los vuelve a crear solo. Para recrear todos de una vez: `pnpm orquestador:sincronizar
--recrear`.

### Severidad inicial y rango de comportamiento

El orquestador mueve la severidad del paciente dentro de `[behavior_min, behavior_max]`; 5 es la
zona de cierre automático. Se deducen de la dificultad y del riesgo del caso
(`src/lib/orquestador/mapeo.ts`):

| Dificultad | Severidad inicial | Rango (sin riesgo) |
| ---------- | ----------------- | ------------------ |
| Básico     | 2                 | 0 – 4              |
| Intermedio | 3                 | 1 – 4,5            |
| Avanzado   | 3                 | 1 – 5              |

- **Riesgo** (campo del constructor o línea «Riesgo:» del prompt): ideación activa, autolesión o
  riesgo para terceros suman 1 a la severidad inicial y amplían el rango hasta 5. La ideación
  pasiva solo añade su bandera en `risk_flags`.
- **Casos cotidianos** empiezan un punto más tranquilos, pero nunca por debajo de 2.
- Ninguna práctica empieza por encima de 4.
- **El piso queda al menos 2 puntos por debajo de la severidad inicial** (y nunca por debajo de 0).
  El orquestador cierra la sesión cuando la severidad se queda en un límite, también en el
  inferior: con un punto de margen, E-08 tocó su piso en 4 turnos empáticos (unos 0,3 por turno) y
  E-05, E-06 y E-12 empezaban ya en él. Con 2 puntos hacen falta unos 7 turnos calmantes. El
  límite superior de la dificultad se conserva cuando ya queda a 2 puntos (E-09: 4, rango 2 – 5).

Así quedan los casos oficiales (`pnpm orquestador:sincronizar --simular`):

| Casos                  | Severidad inicial | Rango   |
| ---------------------- | ----------------- | ------- |
| E-01, E-05, E-06, E-12 | 2                 | 0 – 4   |
| E-02, E-03, E-07, E-10 | 3                 | 1 – 4,5 |
| E-04, E-08, E-11       | 3                 | 1 – 5   |
| E-09                   | 4                 | 2 – 5   |

Si esta tabla cambia, se sube `VERSION_MAPEO` y todos los casos se vuelven a sincronizar solos.

## 4. Un turno de conversación

`POST /api/npc/chat` comprueba la cuenta y la pertenencia de la práctica con RLS. La base
recupera el intercambio si ese identificador ya está guardado. Para un turno nuevo, el servidor
reserva la práctica antes de leer el historial, aplica los límites y llama al proveedor
(`src/lib/ia/turno.ts`). El guardado comprueba la marca de reserva y registra juntos el
identificador del turno y los dos mensajes. Si la reserva falla, el navegador puede reintentar.

### Tiempos

La función de Vercel tiene `maxDuration` de 60 s y la petición un plazo propio de 55 s, para
responder siempre con un error controlado:

| Tiempo     | Para qué                                                                  |
| ---------- | ------------------------------------------------------------------------- |
| hasta 20 s | Esperar cupo en el turnero de la cuenta                                   |
| hasta 25 s | Que el orquestador empiece a responder (su primer turno tarda hasta 20 s) |
| 12 s       | Silencio máximo entre dos fragmentos                                      |
| 12 s       | Reserva para que responda Gemini si el orquestador falla                  |
| 65 s       | Lo que espera el navegador antes de rendirse                              |

### El límite de 10 mensajes por minuto

1. **Turnero en el servidor** (`reservar_turno_orquestador`): antes de cada llamada reserva un
   cupo de la cuenta en la ventana del último minuto (9 de 10). La reserva bloquea por cuenta, así
   que varias funciones de Vercel a la vez no pasan del cupo. Si no hay, devuelve cuánto falta y
   el servidor **espera** dentro de la petición.
2. **Mientras espera**, el estudiante ve al paciente pensando, sin mensajes de error. Si la espera
   pasa de 10 s aparece un aviso sobrio con cuenta regresiva («Marta necesita un momento más.
   Responderá en unos 8 s.»).
3. **Si la espera no cabe** en la petición, responde 429 con `Retry-After` y «El paciente necesita
   unos segundos. Inténtalo en X s». El mensaje queda en pantalla para reintentarlo.
4. **Un 429 real del orquestador** (otro cliente usó la cuenta) se trata igual: se espera lo que
   diga `Retry-After` (o 5 s) y se reintenta. **Nunca activa Gemini.**

Este turnero no reemplaza al límite por estudiante: se comprueban los dos.

### Errores y reintentos

| Lo que pasa                             | Qué hace PsySim                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| 401                                     | Inicia sesión otra vez y repite una vez; si sigue, alerta en los registros y Gemini    |
| 429                                     | Espera y reintenta; si no cabe, 429 al estudiante                                      |
| 502 o `error` con `discarded: true`     | El turno se descartó allá: reintenta una vez                                           |
| 500 o `error` con `discarded: false`    | Lee `GET /history` antes de reenviar, para no duplicar el turno                        |
| No responde, se corta o tarda demasiado | Gemini                                                                                 |
| 400, 403, 422                           | Error de PsySim o de sus datos: 502 al estudiante y registro; no se esconde con Gemini |
| 404 del perfil o del escenario          | Los crea de nuevo y sigue                                                              |
| 404 de la sesión                        | Sin conversación: abre otra. Con conversación: Gemini                                  |

**Conciliación.** PsySim guarda un intercambio solo después de recibir la respuesta. Si un turno
tuvo un resultado incierto (o el navegador reintenta), se compara el historial del orquestador con
los intercambios guardados: si allá hay uno de más con ese mismo mensaje ya respondido, se usa esa
respuesta en lugar de enviar el mensaje otra vez.

## 5. Gemini como respaldo

Gemini responde **solo ante fallos reales** del orquestador: no contesta (red, caída, tiempo
agotado), un 5xx que se repite tras el reintento o un 401 que sigue después de volver a iniciar
sesión.

Como el orquestador arma el contexto con **su** historial, una práctica que pasa a Gemini **se
queda en Gemini hasta terminar** (`sesion_ia.proveedor`, con el motivo y la hora). Por la misma
razón pasan a Gemini:

- las prácticas en las que el estudiante usa **«Ensayar otra respuesta»** (el orquestador no puede
  olvidar turnos);
- las respuestas del orquestador que PsySim rechaza (copiaban las instrucciones o venían vacías):
  allá quedaron guardadas y en PsySim no.

También pasan a Gemini las prácticas cuya sesión **cerró el orquestador sin que la práctica deba
terminar**: un cierre `success` (el paciente se calmó y la severidad se quedó en el piso), un
`should_close` sin `closing_kind` o con un valor desconocido, y un 400 «sesión ya cerrada» (ver
sección 8). El motivo queda en `sesion_ia.cambio_motivo` (`cierre_orquestador`, `cierre_sin_motivo`,
`cierre_desconocido`) y en `/admin/ia`. Es una red de seguridad: con los rangos de la sección 3 no
debería ser lo habitual.

El laboratorio y el chat de prueba del constructor de casos usan siempre Gemini.

**Volver a Gemini en una emergencia:** poner `IA_PROVEEDOR=gemini` en Vercel y volver a desplegar.
Las prácticas nuevas usan Gemini y las que estaban en el orquestador pasan a Gemini en su
siguiente turno (y ya no vuelven). No hace falta tocar la base de datos.

## 6. Respuesta por partes

Con `por_partes: true`, la ruta responde Server-Sent Events propios (no reenvía los del
orquestador tal cual): el nombre del evento es el tipo y `data` lleva el resto en JSON. Es el
mismo protocolo con los dos proveedores (con Gemini se usa `streamText`).

| Evento      | Datos                           | Qué hace el navegador                               |
| ----------- | ------------------------------- | --------------------------------------------------- |
| `espera`    | `segundos`                      | Sabe que el servidor espera cupo: no se colgó       |
| `emocion`   | `emocion`, `intensidad`         | Aplica la emoción cuando llega una etiqueta         |
| `fragmento` | `texto`                         | Añade texto a la burbuja                            |
| `reinicio`  | —                               | Borra lo mostrado: otro intento responde desde cero |
| `fin`       | `respuesta` (la misma del JSON) | Reemplaza el texto por el guardado                  |
| `error`     | `status`, `error`, `espera_s`   | Quita lo que llegó y deja reintentar                |

Antes de reenviar cada fragmento, el servidor filtra las etiquetas de emoción conocidas y el
prefijo con el nombre. Si la respuesta copia las instrucciones, corta con un evento `error`.
El texto que se guarda es el de `fin`, calculado sobre la respuesta completa. Si el navegador se
desconecta a mitad, el turno termina y se guarda igual.

Sin `por_partes` la ruta responde un solo JSON, como antes. Los rechazos anteriores al turno (401,
404, 409, 429 del estudiante…) son siempre un JSON con su código.

## 7. Lenguaje no verbal: emoción y severidad

Gemini entrega la emoción en la etiqueta `[emoción intensidad]`. En las prácticas nuevas con
el orquestador, PsySim calcula la emoción y su intensidad al terminar el turno con la severidad
que devuelve el servicio (0 a 5). `src/lib/orquestador/severidad.ts` también interpreta las
etiquetas que todavía puedan llegar de sesiones abiertas con escenarios anteriores.

- Con etiqueta: severidad ≥ 4 sube un punto la intensidad; severidad < 1,5 la baja un punto.
- Sin etiqueta, el trato inapropiado se expresa como molestia. Con severidad ≥ 4 el paciente se
  muestra abrumado. Una bajada de 0,5 o más se expresa como alivio y una subida como ansiedad.
  Con cambios pequeños conserva la emoción anterior cuando corresponde. Si no hay una emoción que
  conservar, se usa triste a partir de 2,5 y neutral por debajo. La severidad baja reduce la intensidad
  sin asumir que el paciente está tranquilo.

Cuántas respuestas llegaron sin etiqueta se ve en la vista del Administrador («Emoción deducida»).

## 8. Cierre automático

El orquestador cierra su sesión (`should_close: true`) cuando la severidad se queda en un límite
del rango por varios turnos seguidos o hay maltrato reiterado. El límite puede ser el **inferior**
(el paciente se calmó). Una sesión cerrada no se reabre: los mensajes nuevos reciben 400 «sesión
ya cerrada», y una sesión nueva empezaría sin el historial. Qué hace PsySim según `closing_kind`
(`src/lib/orquestador/cierre.ts`):

| `closing_kind` del orquestador | Estado allá  | Qué pasa en PsySim                                     |
| ------------------------------ | ------------ | ------------------------------------------------------ |
| `crisis`                       | `terminated` | La práctica termina con este turno (`crisis`)          |
| `inappropriate`                | `terminated` | La práctica termina con este turno (`inapropiada`)     |
| `success`                      | `completed`  | Se entrega la respuesta y la práctica sigue con Gemini |
| ausente, `null` o desconocido  | —            | Igual que `success`, y queda en el registro (`warn`)   |

Lo que no se reconoce nunca se convierte en un motivo clínico. El camino del stream, el de
recuperación (`recuperar()`, que solo ve el estado de la sesión: `completed` = `success`;
`terminated` = crisis, o inapropiada si el turno trae `abuse` o `repeat_abuse`) y el barrido de
cierres llegan a la misma conclusión con los mismos datos. Una bandera `risk` sola no cierra nada.

Cuando la práctica sigue tras un cierre ajeno, la sesión se marca como cerrada allá
(`cerrada_en_orquestador`) para no volver a cerrarla con otro motivo, y se registra un evento en
`orquestador_evento`.

Si el cierre es por crisis o trato inapropiado, la respuesta de ese turno es la última:

- El servidor guarda el motivo (`crisis` o `inapropiada`) y no acepta más intervenciones (409).
- En el navegador, cuando la respuesta termina de mostrarse, el campo de texto se reemplaza por un
  aviso sobrio y la práctica se termina sola por el mismo camino de «Terminar práctica» (con sus
  métricas). «Continuar» lleva a los resultados.
- El texto no usa la palabra «crisis», no atribuye un error y recuerda que es una simulación
  (`src/lib/conversacion/cierre.ts`).
- El **docente** ve en la transcripción el motivo («Cierre automático: el paciente entró en
  crisis») y la **severidad de cada respuesta** del paciente. El estudiante no ve la severidad.

## 9. Al terminar la práctica

Una práctica termina por uno de estos caminos (los cuatro guardan las métricas, que calcula la base
de datos):

1. El estudiante pulsa «Terminar práctica».
2. **Se cumplen el tiempo de la consulta y su margen de cierre** (ver «Tiempo de consulta», abajo).
3. Diez minutos sin actividad (queda `interrumpida`).
4. Un cierre del paciente por crisis o trato inapropiado (sección 8).

Después de responderle al estudiante, PsySim reporta al orquestador la duración que calculó su
base de datos (`PATCH /time`, en tramos de 600 s como máximo, con la cuenta dueña) y cierra la
sesión (`PATCH /end`, con la cuenta `teacher`). El `closing_kind` refleja lo que pasó en PsySim:
`crisis` o `inappropriate` si el paciente cerró la consulta, `success` si la práctica terminó
(también por tiempo) y ninguno si quedó interrumpida (allá queda `completed`). Si el orquestador ya
había cerrado la sesión por su cuenta, no se vuelve a cerrar. Un 4xx por sesión ya cerrada o
inexistente no deja la práctica pendiente para siempre. Las prácticas que terminan por otro camino
(el barrido de inactividad, una pestaña cerrada) se cierran allá la próxima vez que alguien empieza
una práctica.

### Tiempo de consulta

Siguiendo el estándar de diseño de simulación de INACSL (marco de tiempo y punto final planeados y
conocidos por quien participa), cada práctica tiene una duración de consulta. El encuadre del tiempo
y el cierre de la entrevista son parte de lo que practica el estudiante.

- **Duración:** el docente la elige al asignar (10, 15, 20 o 30 minutos; 15 por defecto). Se
  guarda en `asignacion.duracion_minutos` y `canjear_codigo` la copia a `sesion.duracion_minutos`.
  El modo presencial usa la misma asignación.
- **Inicio:** con la primera intervención guardada del estudiante (`sesion.consulta_inicio`, que
  anota el trigger `mensaje_registrar_actividad` con la hora de la base de datos), no al abrir las
  instrucciones.
- **Cálculo:** `tiempo_de_consulta(sesion)` devuelve la duración y los segundos transcurridos con
  `now()`. El navegador recibe ese dato al abrir la práctica y con cada respuesta, y solo lo
  muestra (avanza con su reloj monotónico). El reloj del navegador nunca decide nada.
- **Preparación previa:** las instrucciones del caso dicen cuánto dura la consulta, que se avisa a
  los 3 minutos del final y que el estudiante la cierra antes de pulsar «Terminar práctica».
- **Durante la práctica:** el HUD muestra los minutos que quedan, sin segundos ni rojo. A los 3
  minutos del final: «Quedan 3 minutos de consulta». Al cumplirse: «Es momento de cerrar la
  consulta». El lector de pantalla solo anuncia esos cambios.
- **Margen y fin:** tras cumplirse el tiempo hay 5 minutos más para cerrar. Pasado el margen,
  `/api/npc/chat` responde 409 con `fin: 'tiempo'` (sin llamar a la IA ni gastar el límite por
  minuto) y el navegador, tras confirmarlo con el servidor (`consultarTiempo`), termina la práctica
  por el camino de «Terminar práctica». El estudiante lee «Se cumplió el tiempo de la consulta» y
  sigue a los resultados.
- **Lo que ve el docente:** al cerrar, el servidor compara el inicio de la consulta y el fin de la
  práctica (horas de la base de datos) y, si pasó el margen, anota `sesion.fin_motivo = 'tiempo'`.
  La transcripción dice «Terminó al cumplirse el tiempo de la consulta». Es un dato neutro, no una
  falta.
- **El paciente nota el tiempo (solo con Gemini):** en el primer turno con el tiempo ya cumplido,
  el servidor añade a las instrucciones del sistema de ese turno una nota de escena: el paciente
  puede notarlo una vez («¿ya se nos acabó el tiempo por hoy?») si el estudiante no ha empezado a
  cerrar. No va en el mensaje del estudiante ni en el historial, y el filtro de fuga la trata como
  instrucción. **Con el orquestador no se hace:** su único canal por turno es el mensaje del
  estudiante, y escribir ahí una instrucción ensuciaría su historial y la transcripción.
- **Cierre de la consulta.** Gemini recibe la indicación de seguir disponible hasta que el
  estudiante cierre. Si el orquestador se cierra porque el paciente se calmó, PsySim continúa
  la conversación con Gemini.

**PsySim no usa `/evaluation/*`.** El orquestador calcula una evaluación automática al cerrar la
sesión: no se lee, no se guarda y no se muestra. PsySim no evalúa al estudiante.

## 10. Qué sale de PsySim (privacidad)

- Al orquestador viajan el **contexto del caso**, los datos del paciente ficticio y
  **lo que escribe el estudiante** en la conversación. No viajan su nombre, su correo, su código
  ni ningún identificador suyo: las sesiones pertenecen a cuentas de servicio de PsySim.
- **El prompt del caso deja de ser secreto dentro del orquestador:** cualquier usuario de ese
  sistema puede leer perfiles y escenarios por su API. Es una compensación aceptada; el prompt
  sigue sin llegar nunca al navegador de PsySim.
- El orquestador reenvía la conversación a su propio proveedor de IA y la guarda en su base de
  datos, fuera del control de PsySim.
- El aviso de privacidad (`/privacidad`) y las instrucciones indican que el orquestador y su
  proveedor pueden procesar la conversación y que Gemini puede responder directamente o como
  respaldo. Antes de usarlo con estudiantes, confirma la identidad del proveedor que usa el
  orquestador, sus condiciones de conservación y eliminación, e incorpóralas al consentimiento
  informado del estudio.

## 11. Tope de prácticas simultáneas

Desactivado por defecto. Lo activa y ajusta el Administrador en **Paciente con IA**. Se aplica
**por cuenta del orquestador**, no por docente (dos docentes pueden tener clase a la vez y
compartir cuenta). Valor sugerido: 3 o 4.

Con el tope lleno, el estudiante que pulsa «Empezar la práctica» ve «El consultorio está ocupado.
Hay N prácticas en curso; inténtalo en unos minutos» y su práctica no comienza: puede volver a
intentarlo desde esa misma pantalla. Una práctica **deja de ocupar cupo** al terminar o tras **15 minutos sin actividad**:
PsySim interrumpe las que llevan 10 minutos inactivas y el barrido pasa cada 5.

## 12. Vista del Administrador

`/admin/ia` muestra, calculado por la base de datos (`admin_metricas_ia`): respuestas por
proveedor con latencia media y p95, tokens y severidad media; prácticas que pasaron a Gemini y por
qué; errores del orquestador por tipo; esperas del turnero, y uso de cada cuenta (prácticas, en
curso, mensajes del último minuto). Las métricas internas del orquestador (`/admin/metrics/*`)
solo responden a su rol `admin`, que PsySim no tiene.

## 13. Tablas (ninguna visible para el navegador)

`sesion_ia` (proveedor, cuenta y sesión del orquestador de cada práctica, severidad y cierre),
`mensaje_ia` (proveedor, modelo y severidad de cada respuesta), `orquestador_caso`,
`orquestador_turno` (turnero), `orquestador_evento` (errores, esperas, cambios y cierres) y
`ajuste_plataforma` (tope). No tienen políticas ni permisos para `authenticated`: las lee y las
escribe el servidor con la clave secreta, después de verificar la práctica con RLS.
`guardar_intercambio` se conserva para el código anterior; el nuevo usa `guardar_intercambio_ia`.

## 14. Prueba con el servicio real

Se probó E-01, «Duelo y pérdida», con tres intervenciones ficticias enviadas desde PsySim. Antes
del ajuste, el historial del orquestador incluía `[neutral 2]` y `[triste 2]`, aunque PsySim ya
los filtraba al mostrar y guardar el diálogo. Con el contexto actualizado, el orquestador devolvió
los tres turnos sin etiquetas. PsySim recibió severidad y métricas de tokens, guardó las respuestas
y el orquestador confirmó el cierre con estado `completed`. En la última corrida, el primer
fragmento llegó en 5,2–6,9 s y los turnos completos tardaron 6,9–8,6 s.

Queda por comprobar en el servicio:

- Longitud máxima del `context`.
- Que `behavior_max` no cierre prácticas normales (ajustar la tabla de la sección 3 si pasa).
- Sesión creada por la cuenta `teacher` a nombre de una cuenta del grupo (`user_id`).
- Esperas reales con 4, 8 y 12 prácticas simultáneas en el modo de una sola cuenta.
