# Rediseño UI/UX · Fase 2, paso 12: flujos, estructura y copy

Fecha: 17/10/2026 · Rama: `feat/rediseno-ui-ux` · Autoría: Wren (Intent), con las skills
`/articulate` (voz, tono y microcopy) y `/wireframe` (estructura de pantallas, en modo
«especificación en markdown», sin artefacto HTML).

Insumos: `PRODUCT.md`, `docs/rediseno/fase-1-diagnostico.md`, `docs/simulacion-a-distancia.md`,
`.impeccable/surfaces/src-app-page-tsx.md` (contrato «Nogal y salvia») y el código actual de las
pantallas. Todo el texto describe el sistema **real**, sin cambios en Supabase:

- El código de acceso es de un solo uso, solo sirve con la cuenta del estudiante y vence (1, 3, 7
  o 30 días).
- Al canjearlo se crea la práctica. Si pasan 10 minutos sin actividad, se cierra sola: también si
  el estudiante está leyendo las instrucciones, si sale a «Mis prácticas» o si canjea y no empieza.
  Mientras siga abierta, volver a usar el mismo código (o «Continuar») lleva a la misma práctica.
  El plazo para volver se calcula en el cliente: `ultima_actividad + 10 min`.
- El docente no ve el chat en vivo. Lee la conversación cuando la práctica termina.
- La retroalimentación publicada se puede seguir editando. El estudiante ve «Actualizada el…»
  cuando `actualizadoEn > publicadaEn`.
- El paciente es una IA (Google Gemini) que puede equivocarse. Google procesa la conversación.

**Convenciones del copy deck.** `{variable}` se reemplaza al renderizar. `{hora}` usa
`h:mm a. m./p. m.` (es-CO, America/Bogota). `{fecha}` usa `formatearFechaHora` («30 sept 2026,
3:05 p. m.»). Las claves terminadas en `.uno` / `.otros` son variantes de plural: nunca se
concatenan cadenas. **[VALIDAR]** marca lo que el autor debe confirmar con su director o con la
universidad antes de publicar.

---

## 1. Voz y tono

PsySim habla como **una supervisora clínica de confianza**: sabe lo que pasa, lo dice antes de que
ocurra y no añade presión. La voz no cambia; el tono se ajusta a cada momento (ver la tabla 1.2).

### 1.1 Reglas

**R1. Equivocarse sale barato.** Es una práctica formativa. Se habla de practicar, no de evaluar.
La nota existe, pero no protagoniza.

| Sí                                                                        | No                                                 |
| ------------------------------------------------------------------------- | -------------------------------------------------- |
| «Competencia que practicarás: escucha activa»                             | «Competencia a evaluar»                            |
| «Equivocarte aquí es parte de practicar.»                                 | «Esta sesión queda registrada para tu evaluación.» |
| «Comentarios de tu docente» (primero) · «Nota de esta práctica» (al lado) | Nota gigante arriba de todo                        |

**R2. Ninguna regla invisible.** Lo que puede hacer perder la práctica, el código o la nota se
dice antes, con la consecuencia y la hora concreta.

| Sí                                                                                                             | No                                |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| «Si sales, tienes hasta las 3:45 p. m. para volver. Después la práctica se cierra y el código deja de servir.» | «La sesión sigue en curso.»       |
| «El tiempo sin actividad cuenta también mientras lees estas instrucciones.»                                    | «El tiempo empieza al confirmar.» |

**R3. Transparencia sobre la IA.** El paciente es una IA, puede equivocarse, y se dice quién lee
la conversación y quién la procesa.

| Sí                                                                                | No                                  |
| --------------------------------------------------------------------------------- | ----------------------------------- |
| «Paciente simulado con IA (Google Gemini). Puede equivocarse o salirse del caso.» | «Paciente virtual inteligente»      |
| «Tu docente leerá la conversación cuando termines. No la ve en vivo.»             | «La conversación queda registrada.» |

**R4. El verbo dice lo que pasa.** Los botones nombran la acción y su objeto. Las acciones
destructivas nombran la consecuencia.

| Sí                                                                                | No                                                         |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| «Terminar práctica» · «Usar el código y entrar» · «Publicar y abrir la siguiente» | «Confirmar» · «Aceptar» · «Entendido · Iniciar simulación» |
| «Eliminar estudiante y sus prácticas»                                             | «Sí»                                                       |

**R5. Español de Colombia, tuteo y sin género gramatical forzado.** Se tutea al estudiante y al
docente. Se evitan los adjetivos y participios que marcan género sobre la persona.

| Sí                                          | No                            |
| ------------------------------------------- | ----------------------------- |
| «Te damos la bienvenida» / «Hola, {nombre}» | «Bienvenido de nuevo»         |
| «Entra cuando quieras»                      | «Entra cuando estés listo»    |
| «Registramos a {nombre}»                    | «{nombre} quedó registrado»   |
| «computador», «celular», «correo»           | «ordenador», «móvil», «email» |

**R6. Corto, concreto y sin jerga técnica.** Una idea por frase, menos de 25 palabras y voz activa.
No se usan términos de ingeniería en la interfaz.

| Sí                                                      | No                                            |
| ------------------------------------------------------- | --------------------------------------------- |
| «Comportamiento del paciente»                           | «Prompt del sistema», «modelo de lenguaje»    |
| «El paciente no responde. Tu último mensaje se guardó.» | «Error de comunicación con el servicio de IA» |

**R7. Calma ante lo sensible.** El contenido clínico se anuncia con hechos, sin dramatismo y con
una salida real. Los errores no culpan a nadie y siempre ofrecen el paso siguiente.

| Sí                                                                  | No                                   |
| ------------------------------------------------------------------- | ------------------------------------ |
| «Este caso explora pensamientos de muerte (sin plan ni intención).» | «ADVERTENCIA: contenido perturbador» |
| «Ese código no es para la cuenta con la que entraste.»              | «Código inválido.»                   |

### 1.2 Tono por momento

| Momento                       | Tono                             | Ejemplo                                                               |
| ----------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| Llegada y bienvenida          | Cálido y directo                 | «Practica la entrevista clínica con un paciente que responde.»        |
| Antes de empezar              | Claro, sereno, honesto           | «Antes de empezar, cinco cosas que conviene saber.»                   |
| En la conversación            | Invisible: la interfaz se retira | «Escuchando» · «Pensando…»                                            |
| Aviso de inactividad o salida | Directo, sin alarma              | «¿Sigues ahí? La práctica se cierra en 42 s.»                         |
| Cierre de la práctica         | Reconocimiento breve             | «Práctica terminada. Ahora le toca a tu docente.»                     |
| Errores                       | Concreto, con salida             | «No pudimos comprobar el código. No se ha usado: inténtalo de nuevo.» |
| Acción destructiva            | Serio y explícito                | «Se borrarán sus 3 prácticas con las conversaciones.»                 |
| Docente trabajando            | Eficiente, sin relleno           | «3 por revisar · la más antigua desde ayer»                           |

### 1.3 Glosario definitivo

| Término                                  | Uso                                                                                                                   | Nunca decir                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Caso**                                 | Situación clínica con su paciente. Puede ser un _escenario predefinido_ (E-01 a E-06) o un _caso propio_ del docente. | escenario (suelto), plantilla, configuración         |
| **Escenario predefinido**                | Solo para los seis casos del catálogo, con su código E-0X.                                                            | escenario oficial, demo                              |
| **Mis casos / caso propio**              | Casos que crea o guarda el docente.                                                                                   | configuraciones guardadas, mis prompts               |
| **Paciente**                             | La persona simulada del caso. En la primera mención en cada pantalla del estudiante: «paciente simulado con IA».      | NPC, bot, avatar, agente, personaje                  |
| **Comportamiento del paciente**          | El texto con el que el docente indica cómo actúa el paciente.                                                         | prompt, prompt del sistema, instrucciones del modelo |
| **Práctica asignada**                    | Lo que el docente asigna: un caso para un estudiante, con su código.                                                  | asignación (en la UI), invitación                    |
| **Código de acceso**                     | Clave de un solo uso de la práctica asignada (`abc-defg-hij`).                                                        | token, contraseña, PIN                               |
| **Usar el código**                       | Lo que hace el estudiante con el código.                                                                              | canjear, redimir, unirse                             |
| **Práctica**                             | Lo que hace el estudiante, de principio a fin. En la UI sustituye a «sesión».                                         | sesión, simulación (como sinónimo), intento          |
| **Simulación**                           | Solo el consultorio 3D, el lugar donde ocurre la práctica.                                                            | — (no usarla para la práctica)                       |
| **Plazo para volver**                    | Hora límite para retomar una práctica abierta: última actividad + 10 min.                                             | tiempo restante, timeout                             |
| **Inactividad**                          | 10 minutos sin mover el ratón, tocar ni escribir.                                                                     | timeout, expiración de sesión                        |
| **Terminar práctica**                    | Acción del estudiante que cierra la práctica sin vuelta atrás.                                                        | finalizar sesión, salir (son cosas distintas)        |
| **Salir**                                | Dejar la simulación sin terminar. La práctica sigue abierta hasta el plazo.                                           | pausar, guardar y salir                              |
| **Cerrar sesión**                        | Solo para la cuenta (log out).                                                                                        | salir (ambiguo)                                      |
| **Retroalimentación**                    | Comentario general, comentarios sobre frases y nota que publica el docente.                                           | evaluación, calificación (como sinónimo), feedback   |
| **Comentario**                           | Nota del docente sobre una frase concreta del estudiante.                                                             | anotación (en la UI), marca                          |
| **Nota**                                 | Valor de 0,0 a 5,0. Siempre con coma decimal.                                                                         | calificación, puntaje, score                         |
| **Borrador**                             | Retroalimentación guardada que el estudiante aún no ve.                                                               | pendiente (ambiguo)                                  |
| **Publicar**                             | Hacer visible la retroalimentación al estudiante.                                                                     | enviar, guardar                                      |
| **Revisar / Revisiones**                 | Trabajo del docente sobre las prácticas terminadas.                                                                   | evaluar, calificar                                   |
| **Ambiente emocional**                   | La luz y el sonido que cambian con el ánimo del paciente.                                                             | velo emocional, indicador de desempeño               |
| **Competencia que practicarás**          | La competencia central del caso.                                                                                      | competencia a evaluar                                |
| **Docente / Estudiante / Administrador** | Roles. Docente y estudiante no llevan género.                                                                         | profesor/alumno, usuario, superadmin                 |
| **Herramientas de desarrollo**           | Antiguo «Laboratorio». Solo administrador, en el menú de cuenta.                                                      | Laboratorio, prototipos (en el menú principal)       |
| **Computador**                           | Equipo con teclado y ratón, necesario para la simulación.                                                             | ordenador, PC, desktop                               |

---

## 2. Estados por rol

Se calculan en el cliente con una función pura (ampliación de `src/lib/sesiones/estados.ts`). Los
campos son los que ya existen: `sesion.estado` (`en_curso` · `finalizada` · `interrumpida`),
`comenzada`, `inicio`, `ultima_actividad`, número de mensajes del estudiante, `retroalimentacion`
(`null` · borrador con `publicadaEn = null` · publicada) con `actualizadoEn`, y `asignacion.estado`
(`pendiente` · `usada` · `anulada` · `vencida`) con `expiraEn`. La regla es la misma para los dos
roles; lo que cambia es la voz.

`plazo = ultima_actividad + 10 min`. Si `ahora > plazo` y la práctica sigue `en_curso` (el barrido
aún no pasa), se muestra el estado «cerrándose» en lugar de ofrecer «Continuar».

### 2.1 Práctica

| Condición                                                      | Clave                  | Estudiante: etiqueta · descripción                                                                                                 | Docente: etiqueta · descripción                                                                      | Tono      |
| -------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------- |
| `en_curso`, `!comenzada`, `ahora ≤ plazo`                      | `sin_empezar`          | **Abierta, sin empezar** · «Vuelve antes de las {hora} para empezar. Después se cierra y el código deja de servir.»                | **Abrió la práctica** · «Usó el código a las {hora}. Si no hay actividad en 10 min, se cierra sola.» | en curso  |
| `en_curso`, `comenzada`, `ahora ≤ plazo`                       | `practicando`          | **En curso** · «Vuelve antes de las {hora} para continuar donde ibas.»                                                             | **Practicando ahora** · «Desde las {hora}. Podrás leer la conversación cuando termine.»              | en curso  |
| `en_curso`, `ahora > plazo`                                    | `cerrandose`           | **Cerrándose por inactividad** · «Pasaron 10 minutos sin actividad. En un momento aparecerá como cerrada.»                         | **Cerrándose por inactividad** · «Sin actividad desde las {hora}.»                                   | neutro    |
| `finalizada`, sin retro publicada                              | `esperando`            | **Esperando retroalimentación** · «Tu docente leerá la conversación y te dejará sus comentarios.»                                  | **Por revisar** · «Terminó el {fecha}.»                                                              | pendiente |
| `interrumpida`, `comenzada`, mensajes > 0, sin retro publicada | `esperando_incompleta` | **Esperando retroalimentación** · «Se cerró antes de terminar. Tu docente revisará lo que alcanzaste a conversar.»                 | **Por revisar · sin terminar** · «Se cerró por inactividad o la cerraste tú.»                        | pendiente |
| `interrumpida`, sin mensajes (comenzada o no)                  | `sin_conversacion`     | **Sin conversación** · «La práctica se cerró antes de que conversaras. Si aún debes hacerla, pídele un código nuevo a tu docente.» | **Sin conversación** · «Se cerró sin mensajes. Puedes asignarle otra práctica.»                      | neutro    |
| retro guardada, `publicadaEn = null` (solo docente)            | `borrador`             | (el estudiante ve `esperando`)                                                                                                     | **Borrador guardado** · «Solo tú lo ves. Guardado el {fecha}.»                                       | pendiente |
| retro publicada, `actualizadoEn ≤ publicadaEn`                 | `publicada`            | **Retroalimentación lista** · «Publicada el {fecha}.»                                                                              | **Publicada** · «El {fecha}.»                                                                        | listo     |
| retro publicada, `actualizadoEn > publicadaEn`                 | `actualizada`          | **Retroalimentación lista** · «Actualizada el {fecha}.»                                                                            | **Publicada · editada** · «Editada el {fecha}. {nombre} ve la versión nueva.»                        | listo     |

Decisión: `sin_conversacion` **no entra** en «Por revisar» (no hay nada que leer). En Revisiones
aparece con su propio filtro. Para el informe impreso se conserva `estadoCortoSesion`
(«Finalizada», «Interrumpida», «No comenzada», «En curso»).

### 2.2 Código de acceso (solo docente)

| Condición                          | Clave        | Etiqueta · descripción                                                     |
| ---------------------------------- | ------------ | -------------------------------------------------------------------------- |
| `pendiente`, vence en más de 48 h  | `sin_usar`   | **Sin usar** · «Vence el {fecha}.»                                         |
| `pendiente`, vence en 48 h o menos | `por_vencer` | **Vence pronto** · «Vence hoy a las {hora}» / «Vence mañana a las {hora}». |
| `usada`                            | `usado`      | **Usado** · «Lo usó el {fecha}.» (si se conoce la sesión)                  |
| `anulada`                          | `anulado`    | **Anulado** · «Ya no sirve.»                                               |
| `vencida`                          | `vencido`    | **Vencido** · «Venció el {fecha} sin usarse.»                              |

El umbral de 48 h para «Códigos por vencer» es una suposición de diseño: hay que validarlo con
docentes.

---

## 3. Flujos redefinidos

### 3.1 Estudiante: de WhatsApp a la relectura

| #   | Pantalla                                                                      | Decisión del sistema o de la persona                                                                                                                    | Texto clave                                                                                                                            |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Mensaje de WhatsApp o correo del docente (en el celular)                      | —                                                                                                                                                       | «Ábrelo en un computador con teclado y ratón… El código es de un solo uso y vence el {fecha}.»                                         |
| 2   | `/unirse/{código}` sin sesión → `/login?siguiente=…`                          | El proxy exige iniciar sesión.                                                                                                                          | Banner: «Entra para abrir tu práctica.» · Botón principal: «Continuar con Google»                                                      |
| 3   | Google → `/auth/callback`                                                     | Correo no registrado → `/acceso-denegado`.                                                                                                              | «Tu cuenta no está registrada en PsySim.»                                                                                              |
| 4   | `/unirse/{código}`: **comprobación del dispositivo, antes de usar el código** | Computador = puntero fino + hover + ancho ≥ 1024 px. Si no lo es, no se usa el código.                                                                  | Celular: «Ábrelo en tu computador. Tu código sigue sin usar.» → «Copiar enlace» · «Enviármelo por correo» (mailto a su propio correo). |
| 4b  | `/unirse` en computador                                                       | La persona decide entrar.                                                                                                                               | «Usar el código y entrar» + tres avisos: un solo uso · 10 min sin actividad · se abre en este computador.                              |
| 5   | Usar el código (RPC `canjear_codigo`)                                         | `ok` → simulación. `en curso` → la misma práctica. `usado`, `vencido`, `anulado` o `invalido` → error con salida.                                       | «Ya tenías esta práctica abierta: te llevamos a ella.»                                                                                 |
| 6   | `/simulacion`: **preparación** (carga del consultorio)                        | El reloj de inactividad del cliente aún no corre.                                                                                                       | «Preparando el consultorio de {paciente}…» + consejos: auriculares opcionales, lugar tranquilo, controles.                             |
| 7   | **Instrucciones del caso** (sobre la escena bloqueada)                        | Aviso de contenido según el caso. Casilla de privacidad (si no se aceptó antes en este navegador). La persona elige «Empezar la práctica» o «Ahora no». | «Antes de empezar» (5 reglas). «Ahora no» → «Tienes hasta las {hora} para volver.»                                                     |
| 8   | Simulación: explorar → conversar                                              | Tecla E, clic sobre el paciente o «Ir directo a la conversación».                                                                                       | «Acércate a {paciente} y presiona E para hablar.»                                                                                      |
| 9a  | **Terminar práctica** (HUD)                                                   | Confirmación. Deshabilitado mientras el paciente responde.                                                                                              | «¿Terminar la práctica? No se puede reanudar.»                                                                                         |
| 9b  | **Salir** (HUD)                                                               | Confirmación honesta con el plazo.                                                                                                                      | «La práctica queda abierta hasta las {hora}.»                                                                                          |
| 9c  | **Inactividad**                                                               | Aviso a los 9 min y cierre a los 10.                                                                                                                    | «¿Sigues ahí? La práctica se cierra en {s} s.»                                                                                         |
| 10  | **Cierre** (inmediato, sin métricas técnicas)                                 | Variante: terminada / cerrada por inactividad / cerrada antes de empezar.                                                                               | «Qué pasa ahora» (3 pasos) + reflexión que no se guarda.                                                                               |
| 11  | `/practicas` (**Mis prácticas**), estado «Esperando retroalimentación»        | Sin notificaciones: no se prometen avisos.                                                                                                              | «Tu docente aún no publica la retroalimentación. Vuelve aquí para verla.»                                                              |
| 12  | `/practicas/{id}`: **relectura**                                              | Retro publicada → comentario general, comentarios sobre frases y nota al lado. Si se editó → «Actualizada el…».                                         | «Pulsa una frase subrayada para leer el comentario.»                                                                                   |

Caminos que ahora convergen:

- **Llega en el celular:** se detiene en el paso 4 sin gastar el código y retoma desde el paso 4b
  en el computador.
- **Sale y vuelve:** Mis prácticas muestra «Abierta» con «Vuelve antes de las {hora}» →
  «Continuar la práctica». Si el plazo pasó, «Cerrándose…» y la salida es pedir un código nuevo.
- **Abre `/simulacion` o «Continuar» en el celular:** no se monta la escena. Aviso «Se abre en tu
  computador» con el plazo.

### 3.2 Docente

| #   | Pantalla                                                             | Decisión                                                                                          | Texto clave                                                                          |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | `/login` → «Entrar con correo y contraseña» (o Google)               | —                                                                                                 | «Soy docente»                                                                        |
| 2   | `/inicio`: **bandeja**                                               | ¿Qué atiendo primero? Por revisar (la más antigua arriba), practicando ahora, códigos por vencer. | Acción principal: «Asignar práctica»                                                 |
| 3   | `/configuracion`: **Asignar práctica**                               | Caso → comportamiento del paciente (opcional, plegado) → estudiante y vigencia.                   | «Generar código»                                                                     |
| 4   | Diálogo «Código listo»                                               | Compartir por WhatsApp, Gmail o la app de correo, o copiar.                                       | «Código listo para {nombre}» · «Asignar otra práctica»                               |
| 5   | Seguir: bandeja «Practicando ahora» o la ficha (se actualizan solas) | Si una práctica quedó abierta y el estudiante se fue, normalmente se cierra sola.                 | «Podrás leer la conversación cuando termine.»                                        |
| 6   | Bandeja → «Revisar» → `/sesiones/{id}`                               | Seleccionar una frase → «Comentar selección». Comentario general y nota.                          | «Selecciona una frase de {nombre} para comentarla.»                                  |
| 7   | **Publicar y abrir la siguiente**                                    | Confirmación en línea. Si no quedan pendientes: «Publicar» y vuelve a la bandeja.                 | «{nombre} verá la nota, el comentario general y tus {n} comentarios.»                |
| 8   | Editar después de publicar                                           | Aviso permanente sobre el formulario.                                                             | «Ya está publicada. Lo que guardes lo verá {nombre} con la marca «Actualizada el…».» |
| 9   | `/estudiantes/{id}`: **ficha**                                       | Asignar práctica, compartir o anular códigos sin usar, imprimir.                                  | «Compartir código» junto a cada código sin usar.                                     |
| 10  | `/estudiantes/{id}/notas`                                            | Imprimir o guardar como PDF.                                                                      | «En el diálogo de impresión elige «Guardar como PDF».»                               |

### 3.3 Administrador

| #   | Pantalla                                                         | Decisión                                               | Texto clave                                                             |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| 1   | Login → `/inicio` (la misma bandeja del docente)                 | Franja de Administración arriba.                       | «Administración · {n} cuentas de docentes activas · Gestionar docentes» |
| 2   | `/admin`: **Docentes**                                           | Crear una cuenta con Google o con contraseña temporal. | «Nuevo docente»                                                         |
| 3   | Credenciales                                                     | Enviarlas por un canal seguro.                         | «Envíale estos datos por un medio seguro.»                              |
| 4   | Menú de cuenta → **Herramientas de desarrollo** (`/laboratorio`) | Fuera de la navegación principal.                      | «Herramientas de desarrollo · solo administración»                      |

### 3.4 Visitante (estudiante sin código, docente nuevo, jurado)

| #   | Pantalla                                   | Decisión                                                                        | Texto clave                                                    |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `/`, primera pantalla                      | Dos puertas: estudiante (código o Google) y docente («Soy docente»).            | «Practica la entrevista clínica con un paciente que responde.» |
| 2a  | Estudiante escribe el código en la landing | → `/unirse/{código}` → login → paso 4 del flujo del estudiante.                 | «Tengo un código»                                              |
| 2b  | Estudiante sin código                      | → Google → Mis prácticas (estado vacío).                                        | «Continuar con Google»                                         |
| 3   | Jurado                                     | Recorre el ciclo, los casos, la revisión de ejemplo y la ficha técnica plegada. | «Ficha técnica del proyecto»                                   |
| 4   | Cualquiera                                 | `/privacidad` desde el pie y desde las instrucciones.                           | «Cómo usamos tus datos»                                        |

---

## 4. Wireframes en texto (rung: full-page, especificación)

Son especificaciones de estructura, no de estilo. Se discute qué hay, dónde está y qué pesa más.
El color, la tipografía y el material pertenecen al contrato visual «Nogal y salvia». Cada pantalla
indica su trabajo, sus regiones en orden de lectura (cada una con un solo trabajo), la jerarquía
(prueba de 5 s) y sus acciones (principal · secundaria · salida).

### 4.1 Landing `/`

**Trabajo:** que en 5 s se entienda qué es y para quién, y que cada visitante tome su puerta.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [PsySim]   Cómo funciona · Casos · Privacidad              [Soy docente]  │ ← nav (franja nogal)
├──────────────────────────────────┬────────────────────────────────────────┤
│ Consultorio de práctica para     │   ╭──────── vano en arco ────────╮    │
│ estudiantes de Psicología        │   │  consultorio 3D (captura)    │    │
│ H1 Practica la entrevista        │   │  paciente                     │    │
│    clínica con un paciente       │   │  «Buenas... no sé muy bien   │    │
│    que responde.                 │   │   por dónde empezar.»         │    │
│ Subtítulo (1 frase)              │   │  Marta Lucía, 58 · E-01       │    │
│ ┌ Tengo un código ─────────────┐ │   ╰───────────────────────────────╯    │
│ │ [abc-defg-hij      ] [Entrar]│ │                                        │
│ └──────────────────────────────┘ │                                        │
│ ── o ──  [G Continuar con Google]│                                        │
│ ayuda: correo @correounivalle    │                                        │
├──────────────────────────────────┴────────────────────────────────────────┤
│ Un proyecto de grado de la Universidad del Valle  [logo Univalle]         │ ← respaldo
└───────────────────────────────────────────────────────────────────────────┘
```

Secciones, en orden:

1. **Cómo funciona una práctica:** el ciclo real en 5 pasos numerados (registro fechado por
   etapas). Sin cifras.
2. **Seis casos para empezar:** una galería con código, título, nivel, «Competencia que
   practicarás» y la frase de apertura. Al pulsar un caso se abre el detalle con su resumen.
3. **La revisión, frase por frase:** un fragmento de conversación con dos subrayados y sus
   comentarios en llamadas con línea guía, etiquetado «Ejemplo ilustrativo».
4. **Lo que conviene saber:** preguntas frecuentes honestas (IA, quién lee, celular, instalación,
   reemplazo de la práctica real, equivocarse).
5. **Para docentes:** una banda corta con «Ingresar como docente».
6. **Ficha técnica del proyecto:** un `<details>` plegado para el jurado (autoría, institución,
   tecnología, alcance y limitaciones).
7. **Pie:** respaldo de Univalle, Privacidad y «Trabajo de grado · Cali · 2026».

**Jerarquía:** H1 → bloque de acción (código + Google) → consultorio. «Soy docente» es visible,
pero secundario.
**Acciones:** principal «Entrar» (con código) o «Continuar con Google» · secundaria «Soy docente» ·
en móvil, barra fija abajo con «Tengo un código» (enfoca el campo).

### 4.2 Login `/login`

**Trabajo:** entrar con la cuenta correcta en un paso.

Regiones:

1. **Panel de marca** (solo en escritorio, a la izquierda): consultorio y frase de apertura
   rotativa. En móvil se oculta.
2. **Contexto:** solo cuando `siguiente` es `/unirse/…`: «Entra para abrir tu práctica».
3. **Título:** «Entra a PsySim» y una frase de apoyo.
4. **Google** (principal) con su ayuda: «Estudiantes: tu correo @correounivalle.edu.co».
5. **Disclosure** «Soy docente: entrar con correo y contraseña». Plegado por defecto; se abre solo
   si llega `?docente=1` desde «Soy docente».
6. **Ayuda de cuentas** y «Volver al inicio». Pie con Privacidad.

**Jerarquía:** botón de Google > título > disclosure del docente.
**Acciones:** principal «Continuar con Google» · secundaria «Entrar» (formulario) · salida
«Volver al inicio».

### 4.3 `/unirse/{código}`: escritorio y móvil

**Trabajo:** proteger el código. Solo se usa en un computador y después de entender las reglas.

**Escritorio**, en una tarjeta centrada sobre una barra superior mínima:

1. Título: «Tu docente te asignó una práctica».
2. Código en grande, editable (campo prellenado).
3. «Antes de entrar» con 3 líneas: un solo uso · se cierra tras 10 min sin actividad · se abre en
   este computador con teclado y ratón.
4. Acción principal «Usar el código y entrar». Salida «Ahora no, ir a Mis prácticas».
5. Zona de error en línea, bajo el campo.

El estudiante no puede leer `asignacion` (RLS), así que antes de usar el código no se muestra el
nombre del caso. Es deliberado.

**Móvil** (no se llama a `canjear_codigo`):

1. Título: «Ábrelo en tu computador».
2. Explicación: «La simulación necesita teclado y ratón. Tu código sigue sin usar.»
3. Código y enlace visibles.
4. Acciones: principal «Copiar enlace» · secundaria «Enviármelo por correo» (mailto a `{correo}`
   con el enlace) · terciaria, enlace discreto «Estoy en un computador con teclado y ratón» que
   abre una confirmación (para portátiles táctiles mal detectados).
5. Pie: «Mientras tanto, puedes ver tus prácticas anteriores» → Mis prácticas.

### 4.4 Mis prácticas `/practicas` (estudiante, sin menú lateral)

**Trabajo:** decir en qué punto está cada práctica y qué hacer ahora.

```
┌ PsySim · Mis prácticas ────────────────────────────── [Ana ▾] ┐ ← barra superior
│ H1 Mis prácticas   «Hola, Ana.»                                 │
│ ┌ Usar un código ────────────────────────────────────────────┐ │ ← solo si no hay abierta
│ │ [abc-defg-hij        ] [Usar el código y entrar]          │ │   (en móvil: aviso computador)
│ └────────────────────────────────────────────────────────────┘ │
│ ▌Abierta ahora                                                  │ ← solo si existe
│  E-02 Ansiedad generalizada · En curso                          │
│  Vuelve antes de las 3:45 p. m.            [Continuar práctica] │
│ Esperando retroalimentación (2)                                 │
│  E-05 Conflicto de pareja · terminó el 12 oct …       Ver →     │
│ Con retroalimentación (3)          Promedio de tus notas: 4,2   │
│  E-01 Duelo y pérdida · Actualizada el 14 oct …  4,5  Leer →    │
│ Sin conversación (1)                                            │
└─────────────────────────────────────────────────────────────────┘
```

- **Abierta ahora** va primero y es la única con acción principal. Si existe, el formulario de
  código baja a una línea («¿Tienes otro código?»).
- Se ocultan los grupos vacíos. Si no hay ninguna práctica, aparece el estado vacío de primer uso.
- Menú de cuenta del estudiante: nombre, correo, Privacidad y Cerrar sesión. Sin «Cambiar
  contraseña», porque entra con Google.

**Acciones:** principal «Continuar práctica» o, si no hay abierta, «Usar el código y entrar» ·
secundaria «Leer retroalimentación» por fila.

### 4.5 Instrucciones del caso (diálogo sobre la escena bloqueada)

**Trabajo:** que la persona entienda el caso y las reglas, y entre por decisión propia o se vaya
sin sorpresas.

Regiones (cuerpo con scroll, cabecera y pie fijos):

1. **Cabecera:** «Instrucciones del caso» · `E-0X` título · tipo y nivel.
2. **Aviso de contenido** (según el caso; callout neutro, sin rojo): de qué trata y, en E-01, E-03
   y E-04, los recursos de apoyo.
3. **Competencia que practicarás** (destacada).
4. **El caso:** descripción y entorno.
5. **Paciente:** avatar, nombre, edad y «Lo que sabes antes de entrar».
6. **Antes de empezar:** las 5 reglas numeradas y siempre desplegadas (ya no se pliegan):
   IA · quién lee · 10 min · un solo uso · terminar.
7. **Controles** (plegable si ya hizo una práctica): WASD/flechas, ratón, E y Esc.
8. **Tus datos:** nombre y código (una línea, sin destacar).
9. **Privacidad:** casilla «Leí el aviso de privacidad…» con enlace a `/privacidad` (nueva
   pestaña). Si ya se aceptó en este navegador, se muestra «Aceptaste el aviso de privacidad el
   {fecha}» y la casilla no aparece.
10. **Pie:** principal «Empezar la práctica» (deshabilitado hasta marcar la casilla, con la ayuda
    visible «Marca la casilla de privacidad para empezar») · salida «Ahora no».

Comportamiento: el foco inicial va al cuerpo. Escape equivale a «Ahora no» (ya no queda un modal
sin salida). El aviso de inactividad debe quedar **por encima** de este diálogo (z-index); hay que
verificarlo (P1-1).

**«Ahora no»** abre una confirmación pequeña: «Tienes hasta las {hora} para volver» →
«Ir a Mis prácticas» / «Seguir leyendo».

### 4.6 HUD y panel de conversación

**Trabajo:** que el paciente sea el centro. La interfaz informa poco y se retira al conversar.

**Explorando** (escena a pantalla completa):

- Arriba a la izquierda, **tarjeta del caso**: `E-0X` título · paciente, edad · tiempo de práctica
  (pequeño). Sin nombre ni código del estudiante.
- Arriba a la derecha, **controles** en este orden: Sonido (icono) · Ambiente emocional (icono con
  interruptor en su menú) · Controles (icono «?») · «Terminar práctica» · «Salir».
- Centro: mira y pista «Presiona E para hablar con {nombre}».
- Abajo: tarjeta «Explora el consultorio» con «Comenzar a explorar», «Conversar con {nombre}»
  (si está cerca) e «Ir directo a la conversación» (alternativa sin ratón ni 3D, P1-7).
- Arriba al centro: «Presiona F11 para pantalla completa» (10 s).

**Conversando** (modo reducido):

- La tarjeta del caso se reduce a una píldora: `E-0X` · tiempo.
- Los controles se agrupan en un solo menú «⋯» más «Terminar práctica» visible. «Salir» pasa al
  menú.
- Panel inferior, ancho de lectura de unos 720 px y alto hasta el 46 % del viewport:
  - Cabecera: nombre del paciente · estado («Escuchando», «Pensando…», «Respondiendo», «Sin
    conexión») · etiqueta «IA» con tooltip · «Volver a explorar».
  - Historial (`role="log"`) con el estado vacío.
  - Error en línea con «Reintentar» / «Terminar práctica».
  - Campo, ayuda de teclado y botón Enviar con icono.
- Ambiente emocional: velo sutil, sin rojo ni latido. Un interruptor lo apaga (se guarda en
  localStorage). Con «reducir movimiento», sin transiciones.

### 4.7 Confirmación de «Salir»

Diálogo `alertdialog` pequeño:

1. Título «¿Salir de la práctica?».
2. Cuerpo en 2 frases con la hora concreta del plazo.
3. Lista de 2 puntos: si vuelves antes · si no vuelves.
4. Acciones: principal «Seguir practicando» (foco por defecto) · secundaria «Salir a Mis
   prácticas».

Antes de abrirlo se libera el Pointer Lock.

### 4.8 Cierre de la práctica

**Trabajo:** cerrar con calma y explicar qué sigue. Aparece en cuanto responde `finalizarSesion`,
sin esperar a nada más.

Regiones:

1. Icono de estado (check o reloj de arena, neutro).
2. Título según la variante.
3. Línea de contexto: `E-0X` título · duración · {n} intervenciones. Se quita la latencia media
   del paciente.
4. **Qué pasa ahora:** 3 pasos numerados.
5. **Para ti, mientras esperas:** 2 preguntas de reflexión. _(Actualizado el 25-oct-2026: el
   campo ya no está aquí; se escribe en la pantalla de resultados, es opcional, se guarda y la
   lee el docente. Ver `docs/auditoria-ux.md`, R3.)_
6. Acciones: principal «Ir a Mis prácticas» · secundaria «Releer la conversación»
   (`/practicas/{id}`).

Variante «cerrada antes de empezar»: sin bloque de reflexión, con «Copiar mensaje para mi docente».

### 4.9 Inicio-bandeja del docente `/inicio`

**Trabajo:** que el docente abra la primera práctica pendiente en menos de 10 s y con 1 clic (H6).

```
┌ menú lateral ┬──────────────────────────────────────────────────────────┐
│ PsySim       │ [Administración · 4 docentes activos · Gestionar →]       │ ← solo admin
│ [Asignar     │ H1 Hola, Marta                     [Asignar práctica]     │
│  práctica]   │ «3 por revisar · 1 practicando ahora · 2 códigos vencen» │
│ Inicio       │ ┌ Por revisar (3) ──────────────┐ ┌ Practicando ahora (1) ┐│
│ Revisiones   │ │ Ana P. · E-05 · terminó ayer  │ │ Luis R. · E-02        ││
│ Estudiantes  │ │ 6 intervenciones   [Revisar]  │ │ desde las 2:10 p. m.  ││
│ Casos        │ │ …                             │ └───────────────────────┘│
│ ──────────── │ │ Ver todas en Revisiones →     │ ┌ Códigos por vencer (2)┐│
│ [cuenta ▾]   │ └───────────────────────────────┘ │ abc-defg-hij · Sara M.││
│              │                                   │ vence hoy 5:00 p. m.  ││
│              │                                   │ [Compartir] [Anular]  ││
└──────────────┴───────────────────────────────────┴───────────────────────┘
```

- «Por revisar» ocupa dos tercios: es el trabajo principal. Orden: la más antigua primero. Máximo
  5 filas y el enlace a Revisiones. Los borradores se muestran con su etiqueta, después de las que
  no tienen ninguno.
- «Practicando ahora» se actualiza sola (`RefrescoAutomatico`) e incluye «Abrió la práctica».
- «Códigos por vencer» (≤ 48 h) con «Compartir» (reenvía el mensaje) y «Anular».
- Navegación lateral: botón «Asignar práctica» arriba, luego Inicio · Revisiones · Estudiantes ·
  Casos. Para el administrador se añade el grupo «Administración» con Docentes. Menú de cuenta:
  nombre, Página de inicio, Privacidad, Cambiar contraseña, [admin] Herramientas de desarrollo y
  Cerrar sesión.

**Acciones:** principal «Revisar» (la primera fila) · secundaria «Asignar práctica».

### 4.10 Revisiones `/sesiones`

**Trabajo:** encontrar cualquier práctica por estado o por estudiante.

Regiones:

1. H1 «Revisiones» y su descripción.
2. Pestañas con contador: Por revisar · Borradores · Publicadas · Sin conversación · Todas.
3. Buscador «Buscar por estudiante o caso».
4. Tabla con las columnas Estudiante, Caso, Terminó, Duración, Intervenciones, Estado, Nota y
   Acción. En móvil, la tabla pasa a filas apiladas para evitar el desborde horizontal (P1-11).
5. Estados vacíos por pestaña.

**Acción:** «Revisar» / «Ver revisión» por fila.

### 4.11 Revisión de la práctica `/sesiones/{id}`

**Trabajo:** comentar frases concretas, escribir la retroalimentación y publicar sin perder el
ritmo.

Regiones:

1. Migas: «Revisiones / {estudiante}» y el contador «{n} de {total} por revisar» con «Anterior» y
   «Siguiente».
2. Encabezado: `E-0X` título · estado · paciente · competencia · datos (estudiante, fecha,
   duración, intervenciones).
3. Columna izquierda (unos 3/5): **Conversación** con la instrucción de selección, la barra
   «Comentar selección» y los globos de comentario.
4. Columna derecha, fija (unos 2/5): **Retroalimentación**.
   - Aviso permanente si ya está publicada.
   - Comentario general y nota.
   - Acciones. Sin publicar: principal «Publicar y abrir la siguiente» (o «Publicar» si es la
     última) · secundaria «Guardar borrador». Ya publicada: «Guardar cambios».
   - Confirmación en línea.
   - Línea de estado: «Solo tú ves el borrador» o «Publicada el… · Editada el…».
5. **Comentarios en la conversación**, debajo del formulario: lista numerada enlazada con los
   subrayados.

**En curso:** en lugar de las columnas aparece «Practicando ahora» (o «Abrió la práctica») con la
explicación y, como acción rara, «Cerrar la práctica».

### 4.12 Ficha del estudiante `/estudiantes/{id}`

Regiones:

1. Migas «Estudiantes».
2. Encabezado: nombre · código · correo · forma de acceso. Acciones: principal «Asignar
   práctica» · secundarias «Imprimir notas» y «Editar» · «⋯» con «Eliminar estudiante».
3. Indicadores: Prácticas, Tiempo de práctica, Intervenciones, Nota promedio.
4. **Prácticas:** lista con los estados de la sección 2.1 y la acción por fila.
5. **Códigos de acceso:** los códigos sin usar llevan «Compartir código» (reusa el mensaje de la
   sección 5.12) y «Anular». El resto, solo su estado.

«Eliminar» sale de la vista principal y pasa al menú «⋯», con su confirmación.

### 4.13 Casos `/configuracion/casos`

**Trabajo:** biblioteca para conocer los casos y asignarlos.

Regiones:

1. H1 «Casos» y la acción «Crear caso».
2. **Escenarios predefinidos:** cuadrícula de 6 tarjetas (código, título, tipo, nivel, competencia
   y paciente) con «Asignar» y «Ver detalle».
3. **Mis casos:** tarjetas con «Asignar», «Editar» y «⋯ Eliminar». Si no hay ninguno, el estado
   vacío.
4. «Ver detalle» abre un panel lateral con el perfil clínico, la frase de apertura y las reglas
   fijas (el docente sí puede verlas).

«Asignar» → `/configuracion?caso={id}`.

### 4.14 Asignar práctica `/configuracion`

**Trabajo:** generar un código para un estudiante en el menor número de decisiones.

Regiones (asistente en una página, pasos numerados con su estado):

1. H1 «Asignar práctica» y su descripción.
2. **Paso 1, Caso:** buscador y selección. Predefinidos arriba y Mis casos debajo, compactos. Si
   llega `?caso`, el paso aparece resuelto con «Cambiar».
3. **Paso 2, Comportamiento del paciente (opcional):** plegado por defecto con la línea
   «Usa el comportamiento original del caso · Ajustar». Al desplegarlo: el perfil, las reglas
   fijas, el texto editable, «Restablecer original» y «Guardar como mi caso».
4. **Paso 3, Estudiante y plazo:** buscador o «Registrar estudiante» y las pastillas de vigencia.
5. **Barra fija de resumen:** «{caso} para {estudiante} · vence el {fecha}» y la acción principal
   «Generar código».
6. Diálogo «Código listo» (sección 5.12).

### 4.15 Panel de administración `/admin`

Regiones:

1. H1 «Docentes» y su descripción, con la acción «Nuevo docente».
2. Indicadores: Cuentas activas, Estudiantes, Prácticas, Por revisar.
3. Lista o tabla de docentes con estado, acceso, actividad y «⋯». En móvil, en tarjetas (P1-11).
4. Ficha `/admin/docentes/{id}`.

Laboratorio no aparece aquí: vive en el menú de cuenta.

### 4.16 Acceso denegado, 404 y error

- **Acceso denegado:** tarjeta centrada con icono neutro (no rojo), título, explicación por rol y
  acciones: principal «Entrar con otra cuenta» · secundaria «Ir a la página de inicio».
- **404:** título, una frase y las acciones «Ir a mi inicio» (según el rol; sin sesión, «Ir a la
  página de inicio») y «Volver».
- **Error de carga** (error boundary): título, frase, «Reintentar» y «Ir a mi inicio».

### 4.17 Privacidad `/privacidad`

Regiones:

1. Barra superior pública.
2. H1, versión y fecha.
3. **Resumen en 5 puntos** (lo esencial antes del detalle).
4. Índice con anclas.
5. Secciones numeradas (texto en la sección 5.17).
6. Marcadores **[VALIDAR]** visibles solo en el borrador, para quitarlos antes de publicar.
7. Pie.

Ancho de lectura de 65 a 75 caracteres.

---

## 5. Copy deck

Listo para pegar. Claves en `camelCase` por pantalla y componente.

### 5.0 Comunes

| Clave                            | Texto                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `comun.marca`                    | PsySim                                                                          |
| `comun.respaldo`                 | Un proyecto de grado de la Universidad del Valle                                |
| `comun.cargando`                 | Cargando…                                                                       |
| `comun.reintentar`               | Reintentar                                                                      |
| `comun.cancelar`                 | Cancelar                                                                        |
| `comun.volver`                   | Volver                                                                          |
| `comun.cerrar`                   | Cerrar                                                                          |
| `comun.listo`                    | Listo                                                                           |
| `comun.copiar.hecho`             | Copiado                                                                         |
| `comun.copiar.error`             | No pudimos copiar. Selecciona el texto y cópialo a mano.                        |
| `comun.nota.formato`             | {nota} de 5,0                                                                   |
| `comun.ia.etiqueta`              | IA                                                                              |
| `comun.ia.tooltip`               | Paciente simulado con IA (Google Gemini). Puede equivocarse o salirse del caso. |
| `comun.errorRed`                 | No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.                   |
| `comun.cuenta.menuAria`          | Cuenta de {nombre}                                                              |
| `comun.cuenta.inicioPublico`     | Página de inicio                                                                |
| `comun.cuenta.privacidad`        | Privacidad                                                                      |
| `comun.cuenta.cambiarContrasena` | Cambiar contraseña                                                              |
| `comun.cuenta.herramientas`      | Herramientas de desarrollo                                                      |
| `comun.cuenta.cerrarSesion`      | Cerrar sesión                                                                   |
| `comun.cuenta.cerrandoSesion`    | Cerrando sesión…                                                                |
| `comun.pie.privacidad`           | Privacidad                                                                      |
| `comun.pie.lineaProyecto`        | Trabajo de grado · Cali, Colombia · 2026                                        |
| `comun.pie.escuela`              | Escuela de Ingeniería de Sistemas y Computación                                 |

### 5.1 Estados (de la sección 2)

| Clave                                  | Texto                                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `estado.est.sinEmpezar`                | Abierta, sin empezar                                                                                      |
| `estado.est.sinEmpezar.desc`           | Vuelve antes de las {hora} para empezar. Después se cierra y el código deja de servir.                    |
| `estado.est.practicando`               | En curso                                                                                                  |
| `estado.est.practicando.desc`          | Vuelve antes de las {hora} para continuar donde ibas.                                                     |
| `estado.comun.cerrandose`              | Cerrándose por inactividad                                                                                |
| `estado.est.cerrandose.desc`           | Pasaron 10 minutos sin actividad. En un momento aparecerá como cerrada.                                   |
| `estado.est.esperando`                 | Esperando retroalimentación                                                                               |
| `estado.est.esperando.desc`            | Tu docente leerá la conversación y te dejará sus comentarios.                                             |
| `estado.est.esperandoIncompleta.desc`  | Se cerró antes de terminar. Tu docente revisará lo que alcanzaste a conversar.                            |
| `estado.comun.sinConversacion`         | Sin conversación                                                                                          |
| `estado.est.sinConversacion.desc`      | La práctica se cerró antes de que conversaras. Si aún debes hacerla, pídele un código nuevo a tu docente. |
| `estado.est.lista`                     | Retroalimentación lista                                                                                   |
| `estado.est.lista.publicada`           | Publicada el {fecha}                                                                                      |
| `estado.est.lista.actualizada`         | Actualizada el {fecha}                                                                                    |
| `estado.doc.abrio`                     | Abrió la práctica                                                                                         |
| `estado.doc.abrio.desc`                | Usó el código a las {hora}. Si no hay actividad en 10 min, se cierra sola.                                |
| `estado.doc.practicando`               | Practicando ahora                                                                                         |
| `estado.doc.practicando.desc`          | Desde las {hora}. Podrás leer la conversación cuando termine.                                             |
| `estado.doc.cerrandose.desc`           | Sin actividad desde las {hora}.                                                                           |
| `estado.doc.porRevisar`                | Por revisar                                                                                               |
| `estado.doc.porRevisar.desc`           | Terminó el {fecha}.                                                                                       |
| `estado.doc.porRevisarIncompleta`      | Por revisar · sin terminar                                                                                |
| `estado.doc.porRevisarIncompleta.desc` | Se cerró por inactividad o la cerraste tú.                                                                |
| `estado.doc.sinConversacion.desc`      | Se cerró sin mensajes. Puedes asignarle otra práctica.                                                    |
| `estado.doc.borrador`                  | Borrador guardado                                                                                         |
| `estado.doc.borrador.desc`             | Solo tú lo ves. Guardado el {fecha}.                                                                      |
| `estado.doc.publicada`                 | Publicada                                                                                                 |
| `estado.doc.publicada.desc`            | El {fecha}.                                                                                               |
| `estado.doc.editada`                   | Publicada · editada                                                                                       |
| `estado.doc.editada.desc`              | Editada el {fecha}. {nombre} ve la versión nueva.                                                         |
| `estado.codigo.sinUsar`                | Sin usar                                                                                                  |
| `estado.codigo.sinUsar.desc`           | Vence el {fecha}.                                                                                         |
| `estado.codigo.porVencer`              | Vence pronto                                                                                              |
| `estado.codigo.porVencer.hoy`          | Vence hoy a las {hora}                                                                                    |
| `estado.codigo.porVencer.manana`       | Vence mañana a las {hora}                                                                                 |
| `estado.codigo.usado`                  | Usado                                                                                                     |
| `estado.codigo.anulado`                | Anulado                                                                                                   |
| `estado.codigo.vencido`                | Vencido                                                                                                   |
| `estado.codigo.vencido.desc`           | Venció el {fecha} sin usarse.                                                                             |

### 5.2 Landing `/`

| Clave                                 | Texto                                                                                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `landing.meta.titulo`                 | PsySim · Practica la entrevista clínica con un paciente simulado                                                                                                                    |
| `landing.meta.descripcion`            | Consultorio 3D en el navegador donde estudiantes de Psicología practican la entrevista clínica con un paciente simulado con IA y reciben comentarios de su docente frase por frase. |
| `landing.nav.comoFunciona`            | Cómo funciona                                                                                                                                                                       |
| `landing.nav.casos`                   | Casos                                                                                                                                                                               |
| `landing.nav.privacidad`              | Privacidad                                                                                                                                                                          |
| `landing.nav.docente`                 | Soy docente                                                                                                                                                                         |
| `landing.hero.antetitulo`             | Consultorio de práctica para estudiantes de Psicología                                                                                                                              |
| `landing.hero.titulo`                 | Practica la entrevista clínica con un paciente que responde.                                                                                                                        |
| `landing.hero.subtitulo`              | Entra al consultorio 3D desde tu navegador, conversa por escrito con un paciente simulado con IA y recibe los comentarios de tu docente, frase por frase.                           |
| `landing.hero.codigo.etiqueta`        | Tengo un código                                                                                                                                                                     |
| `landing.hero.codigo.placeholder`     | abc-defg-hij                                                                                                                                                                        |
| `landing.hero.codigo.boton`           | Entrar                                                                                                                                                                              |
| `landing.hero.separador`              | o                                                                                                                                                                                   |
| `landing.hero.google`                 | Continuar con Google                                                                                                                                                                |
| `landing.hero.ayuda`                  | Usa tu correo @correounivalle.edu.co. Tu docente debe haberte registrado.                                                                                                           |
| `landing.hero.computador`             | La práctica se hace en un computador con teclado y ratón.                                                                                                                           |
| `landing.hero.figura.alt`             | Consultorio 3D con Marta Lucía, la paciente del caso E-01, sentada en un sillón                                                                                                     |
| `landing.hero.figura.cita`            | «Buenas... la verdad no sé muy bien por dónde empezar. Mi hija fue la que insistió en que viniera.»                                                                                 |
| `landing.hero.figura.pie`             | Marta Lucía, 58 años · E-01 Duelo y pérdida                                                                                                                                         |
| `landing.movil.cta`                   | Tengo un código                                                                                                                                                                     |
| `landing.ciclo.titulo`                | Cómo funciona una práctica                                                                                                                                                          |
| `landing.ciclo.paso1.titulo`          | Tu docente prepara el caso                                                                                                                                                          |
| `landing.ciclo.paso1.texto`           | Elige un caso, ajusta cómo actúa el paciente y te envía un código de un solo uso.                                                                                                   |
| `landing.ciclo.paso2.titulo`          | Abres el enlace en un computador                                                                                                                                                    |
| `landing.ciclo.paso2.texto`           | Entras con tu correo institucional. No hay nada que instalar.                                                                                                                       |
| `landing.ciclo.paso3.titulo`          | Lees el caso y las reglas                                                                                                                                                           |
| `landing.ciclo.paso3.texto`           | Sabes qué vas a practicar, de qué trata el caso y qué puede cerrar la práctica.                                                                                                     |
| `landing.ciclo.paso4.titulo`          | Conversas con el paciente                                                                                                                                                           |
| `landing.ciclo.paso4.texto`           | Recorres el consultorio y escribes como lo harías en consulta. El paciente responde y su rostro reacciona.                                                                          |
| `landing.ciclo.paso5.titulo`          | Tu docente te deja comentarios                                                                                                                                                      |
| `landing.ciclo.paso5.texto`           | Lee la conversación, comenta frases concretas y publica una retroalimentación con nota.                                                                                             |
| `landing.casos.titulo`                | Seis casos para empezar                                                                                                                                                             |
| `landing.casos.descripcion`           | De lo cotidiano a la crisis. Tu docente también puede crear los suyos.                                                                                                              |
| `landing.casos.competencia`           | Competencia que practicarás                                                                                                                                                         |
| `landing.casos.nivel`                 | Nivel {nivel}                                                                                                                                                                       |
| `landing.casos.apertura`              | Así empieza                                                                                                                                                                         |
| `landing.casos.verCaso`               | Ver el caso                                                                                                                                                                         |
| `landing.revision.titulo`             | La revisión, frase por frase                                                                                                                                                        |
| `landing.revision.texto`              | Tu docente subraya lo que dijiste y te explica por qué funcionó o qué cambiarías.                                                                                                   |
| `landing.revision.etiqueta`           | Ejemplo ilustrativo                                                                                                                                                                 |
| `landing.revision.ejemplo.paciente`   | No sé si esto sea algo importante, la verdad. Solo me siento muy cansada.                                                                                                           |
| `landing.revision.ejemplo.estudiante` | Entiendo. ¿Desde cuándo te sientes así? Cuéntame un poco más.                                                                                                                       |
| `landing.revision.ejemplo.comentario` | Buena pregunta abierta. Antes, valida lo que dijo: «Lo que sientes sí es importante».                                                                                               |
| `landing.faq.titulo`                  | Lo que conviene saber                                                                                                                                                               |
| `landing.faq.p1`                      | ¿Converso con una persona real?                                                                                                                                                     |
| `landing.faq.r1`                      | No. El paciente es una IA (Google Gemini) que sigue el caso que preparó tu docente. Puede equivocarse o salirse del papel.                                                          |
| `landing.faq.p2`                      | ¿Quién lee mi conversación?                                                                                                                                                         |
| `landing.faq.r2`                      | Tu docente, cuando terminas. No la ve en vivo. Google la procesa para generar las respuestas del paciente. Los detalles están en el aviso de privacidad.                            |
| `landing.faq.p3`                      | ¿Puedo hacerla en el celular?                                                                                                                                                       |
| `landing.faq.r3`                      | Puedes ver tus prácticas y tu retroalimentación en el celular. La simulación necesita un computador con teclado y ratón.                                                            |
| `landing.faq.p4`                      | ¿Tengo que instalar algo?                                                                                                                                                           |
| `landing.faq.r4`                      | No. Funciona en el navegador de un portátil de oficina, sin gafas de realidad virtual.                                                                                              |
| `landing.faq.p5`                      | ¿Reemplaza la práctica con personas?                                                                                                                                                |
| `landing.faq.r5`                      | No. Es un espacio para ensayar la entrevista antes de la práctica real, sin riesgo para nadie.                                                                                      |
| `landing.faq.p6`                      | ¿Y si me equivoco?                                                                                                                                                                  |
| `landing.faq.r6`                      | Para eso está. Es una práctica formativa: los comentarios de tu docente te ayudan a mejorar.                                                                                        |
| `landing.docente.titulo`              | Para docentes                                                                                                                                                                       |
| `landing.docente.texto`               | Asigna un caso con un código, sigue quién está practicando y revisa cada conversación frase por frase.                                                                              |
| `landing.docente.boton`               | Ingresar como docente                                                                                                                                                               |
| `landing.ficha.resumen`               | Ficha técnica del proyecto                                                                                                                                                          |
| `landing.ficha.autor`                 | Autor: Brayan Steven Narváez Valdés                                                                                                                                                 |
| `landing.ficha.director`              | Director: [nombre del director por confirmar] **[VALIDAR]**                                                                                                                         |
| `landing.ficha.institucion`           | Universidad del Valle · Escuela de Ingeniería de Sistemas y Computación · Trabajo de grado, 2026                                                                                    |
| `landing.ficha.interfaz`              | Interfaz: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui                                                                                                                           |
| `landing.ficha.3d`                    | Consultorio 3D: Three.js, React Three Fiber, Draco                                                                                                                                  |
| `landing.ficha.datos`                 | Datos y acceso: Supabase (PostgreSQL con RLS, Auth, Storage)                                                                                                                        |
| `landing.ficha.ia`                    | Paciente: Google Gemini mediante Vercel AI SDK, con reglas fijas de seguridad                                                                                                       |
| `landing.ficha.alcance`               | Alcance: práctica formativa de la entrevista clínica. No tiene validación clínica ni sustituye la supervisión docente.                                                              |
| `landing.ficha.accesibilidad`         | Meta de accesibilidad: WCAG 2.2 AA en las pantallas 2D.                                                                                                                             |

### 5.3 Login `/login`

| Clave                             | Texto                                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `login.meta.titulo`               | Entrar                                                                                                                              |
| `login.contexto.unirse`           | Entra para abrir tu práctica.                                                                                                       |
| `login.titulo`                    | Entra a PsySim                                                                                                                      |
| `login.subtitulo`                 | Practica, o prepara y revisa las prácticas de tus estudiantes.                                                                      |
| `login.google`                    | Continuar con Google                                                                                                                |
| `login.google.cargando`           | Abriendo Google…                                                                                                                    |
| `login.google.ayuda`              | Estudiantes: usa tu correo @correounivalle.edu.co. Tu docente debe haberte registrado.                                              |
| `login.docente.disclosure`        | Soy docente: entrar con correo y contraseña                                                                                         |
| `login.correo.etiqueta`           | Correo                                                                                                                              |
| `login.correo.placeholder`        | nombre@correounivalle.edu.co                                                                                                        |
| `login.contrasena.etiqueta`       | Contraseña                                                                                                                          |
| `login.contrasena.mostrar`        | Mostrar la contraseña                                                                                                               |
| `login.contrasena.ocultar`        | Ocultar la contraseña                                                                                                               |
| `login.boton`                     | Entrar                                                                                                                              |
| `login.boton.cargando`            | Entrando…                                                                                                                           |
| `login.ayuda.cuentas`             | ¿Sin cuenta u olvidaste tu contraseña? Las cuentas de estudiantes las crea su docente; las de docentes, el administrador de PsySim. |
| `login.volver`                    | Volver al inicio                                                                                                                    |
| `login.error.credenciales`        | El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.                                                             |
| `login.error.limite`              | Demasiados intentos. Espera unos minutos antes de volver a intentarlo.                                                              |
| `login.error.generico`            | No pudimos iniciar sesión. Inténtalo de nuevo.                                                                                      |
| `login.error.googleCancelado`     | Cancelaste el acceso con Google. Inténtalo cuando quieras.                                                                          |
| `login.error.googleFallo`         | No pudimos completar el acceso con Google. Inténtalo de nuevo.                                                                      |
| `login.error.googleDeshabilitado` | El acceso con Google aún no está activo. Si eres docente, entra con correo y contraseña; si eres estudiante, avísale a tu docente.  |
| `login.validacion.correo`         | Escribe un correo, por ejemplo nombre@correounivalle.edu.co.                                                                        |
| `login.validacion.contrasena`     | Escribe tu contraseña.                                                                                                              |

### 5.4 `/unirse/{código}`

| Clave                             | Texto                                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `unirse.meta.titulo`              | Tu práctica                                                                                                                       |
| `unirse.titulo`                   | Tu docente te asignó una práctica                                                                                                 |
| `unirse.codigo.etiqueta`          | Código de acceso                                                                                                                  |
| `unirse.antes.titulo`             | Antes de entrar                                                                                                                   |
| `unirse.antes.unUso`              | El código es de un solo uso y solo funciona con tu cuenta.                                                                        |
| `unirse.antes.inactividad`        | Al entrar, la práctica queda abierta. Si pasan 10 minutos sin actividad, se cierra sola, también mientras lees las instrucciones. |
| `unirse.antes.computador`         | Se abre en este computador. Necesitas teclado y ratón.                                                                            |
| `unirse.boton`                    | Usar el código y entrar                                                                                                           |
| `unirse.boton.cargando`           | Comprobando el código…                                                                                                            |
| `unirse.salida`                   | Ahora no, ir a Mis prácticas                                                                                                      |
| `unirse.movil.titulo`             | Ábrelo en tu computador                                                                                                           |
| `unirse.movil.texto`              | La simulación necesita teclado y ratón. Tu código sigue sin usar: ábrelo desde un computador.                                     |
| `unirse.movil.enlace.etiqueta`    | Enlace de tu práctica                                                                                                             |
| `unirse.movil.copiar`             | Copiar enlace                                                                                                                     |
| `unirse.movil.copiado`            | Enlace copiado. Pégalo en el navegador de tu computador.                                                                          |
| `unirse.movil.correo`             | Enviármelo por correo                                                                                                             |
| `unirse.movil.correo.asunto`      | Mi práctica en PsySim                                                                                                             |
| `unirse.movil.correo.cuerpo`      | Abre este enlace en un computador con teclado y ratón:\n{enlace}\n\nCódigo: {codigo} (un solo uso).                               |
| `unirse.movil.override`           | Estoy en un computador con teclado y ratón                                                                                        |
| `unirse.movil.override.titulo`    | ¿Estás en un computador?                                                                                                          |
| `unirse.movil.override.texto`     | Si sigues en el celular, el código se usará y no podrás hacer la práctica: se cerrará a los 10 minutos.                           |
| `unirse.movil.override.confirmar` | Sí, estoy en un computador                                                                                                        |
| `unirse.movil.override.cancelar`  | No, lo abriré después                                                                                                             |
| `unirse.movil.mientras`           | Mientras tanto, puedes ver tus prácticas anteriores.                                                                              |
| `unirse.movil.irPracticas`        | Ir a Mis prácticas                                                                                                                |
| `codigo.error.formato`            | El código tiene 10 letras con guiones, por ejemplo abc-defg-hij.                                                                  |
| `codigo.error.invalido`           | Ese código no existe o no es para tu cuenta ({correo}). Revísalo o pídele uno nuevo a tu docente.                                 |
| `codigo.error.vencido`            | Ese código ya venció. Pídele uno nuevo a tu docente.                                                                              |
| `codigo.error.anulado`            | Tu docente anuló ese código. Si aún debes hacer la práctica, pídele uno nuevo.                                                    |
| `codigo.error.usado`              | Ese código ya se usó y la práctica terminó. La encuentras en Mis prácticas.                                                       |
| `codigo.error.usado.accion`       | Ver Mis prácticas                                                                                                                 |
| `codigo.error.red`                | No pudimos comprobar el código. No se ha usado: revisa tu conexión e inténtalo de nuevo.                                          |
| `codigo.toast.retomada`           | Ya tenías esta práctica abierta: te llevamos a ella.                                                                              |

### 5.5 Mis prácticas `/practicas`

| Clave                               | Texto                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `practicas.meta.titulo`             | Mis prácticas                                                                                                                          |
| `practicas.titulo`                  | Mis prácticas                                                                                                                          |
| `practicas.saludo`                  | Hola, {nombre}.                                                                                                                        |
| `practicas.codigo.titulo`           | Usar un código                                                                                                                         |
| `practicas.codigo.ayuda`            | Escribe el código que te envió tu docente. Es de un solo uso.                                                                          |
| `practicas.codigo.otro`             | ¿Tienes otro código?                                                                                                                   |
| `practicas.codigo.boton`            | Usar el código y entrar                                                                                                                |
| `practicas.codigo.movil`            | Para usar un código, abre PsySim en un computador con teclado y ratón. En el celular puedes leer tus prácticas y tu retroalimentación. |
| `practicas.abierta.titulo`          | Abierta ahora                                                                                                                          |
| `practicas.abierta.boton`           | Continuar práctica                                                                                                                     |
| `practicas.abierta.botonSinEmpezar` | Empezar práctica                                                                                                                       |
| `practicas.abierta.movil`           | Para continuar, ábrela en tu computador antes de las {hora}.                                                                           |
| `practicas.abierta.cerrandose`      | Se está cerrando por inactividad. Si aún debes hacerla, pídele un código nuevo a tu docente.                                           |
| `practicas.grupo.esperando`         | Esperando retroalimentación ({n})                                                                                                      |
| `practicas.grupo.lista`             | Con retroalimentación ({n})                                                                                                            |
| `practicas.grupo.sinConversacion`   | Sin conversación ({n})                                                                                                                 |
| `practicas.promedio`                | Promedio de tus notas publicadas: {nota}                                                                                               |
| `practicas.fila.terminada`          | Terminó el {fecha}                                                                                                                     |
| `practicas.fila.docente`            | Docente: {docente}                                                                                                                     |
| `practicas.fila.ver`                | Ver                                                                                                                                    |
| `practicas.fila.leer`               | Leer retroalimentación                                                                                                                 |
| `practicas.fila.verAria`            | {accion}: {caso}                                                                                                                       |
| `practicas.vacio.titulo`            | Aún no tienes prácticas                                                                                                                |
| `practicas.vacio.texto`             | Cuando tu docente te envíe un código, escríbelo arriba o abre el enlace que te mandó desde un computador.                              |
| `practicas.error.titulo`            | No pudimos cargar tus prácticas                                                                                                        |
| `practicas.error.texto`             | Revisa tu conexión e inténtalo de nuevo. Tus prácticas no se han perdido.                                                              |

### 5.6 Preparación (carga) y aviso de computador en `/simulacion`

| Clave                          | Texto                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `preparacion.titulo`           | Preparando el consultorio de {paciente}…                                                                             |
| `preparacion.progresoAria`     | Cargando el consultorio: {porcentaje} %                                                                              |
| `preparacion.consejo1`         | Busca un lugar tranquilo. Si quieres, usa auriculares: el consultorio tiene sonido.                                  |
| `preparacion.consejo2`         | Caminas con W A S D o las flechas, miras con el ratón y hablas con la tecla E.                                       |
| `preparacion.consejo3`         | El paciente es una IA: escribe como lo harías en consulta.                                                           |
| `preparacion.lento`            | Está tardando más de lo normal. La conexión puede estar lenta; no cierres esta pestaña.                              |
| `preparacion.error.titulo`     | No pudimos cargar el consultorio                                                                                     |
| `preparacion.error.texto`      | Revisa tu conexión e inténtalo de nuevo. Tu práctica sigue abierta hasta las {hora}.                                 |
| `preparacion.error.reintentar` | Reintentar                                                                                                           |
| `preparacion.error.salir`      | Ir a Mis prácticas                                                                                                   |
| `simulacion.movil.titulo`      | La simulación se abre en tu computador                                                                               |
| `simulacion.movil.texto`       | Necesitas teclado y ratón. Tu práctica sigue abierta hasta las {hora}: ábrela desde un computador antes de esa hora. |
| `simulacion.movil.copiar`      | Copiar enlace                                                                                                        |
| `simulacion.movil.correo`      | Enviármelo por correo                                                                                                |
| `simulacion.movil.volver`      | Ir a Mis prácticas                                                                                                   |

### 5.7 Instrucciones del caso

| Clave                                | Texto                                                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `instrucciones.antetitulo`           | Instrucciones del caso                                                                                                                                                     |
| `instrucciones.tipoNivel`            | Caso {tipo} · Nivel {nivel}                                                                                                                                                |
| `instrucciones.contenido.titulo`     | De qué trata este caso                                                                                                                                                     |
| `instrucciones.contenido.salida`     | Si algo de esto te toca de cerca, puedes elegir «Ahora no» y hablarlo con tu docente.                                                                                      |
| `instrucciones.apoyo.titulo`         | Si necesitas apoyo                                                                                                                                                         |
| `instrucciones.apoyo.bienestar`      | Bienestar Universitario, Universidad del Valle: [contacto por confirmar] **[VALIDAR]**                                                                                     |
| `instrucciones.apoyo.linea`          | Línea nacional de salud mental: [línea y horario por confirmar] **[VALIDAR]**                                                                                              |
| `instrucciones.competencia.titulo`   | Competencia que practicarás                                                                                                                                                |
| `instrucciones.caso.titulo`          | El caso                                                                                                                                                                    |
| `instrucciones.caso.entorno`         | Entorno: {consultorio} · {detalle}                                                                                                                                         |
| `instrucciones.paciente.titulo`      | Paciente                                                                                                                                                                   |
| `instrucciones.paciente.edad`        | {edad} años                                                                                                                                                                |
| `instrucciones.paciente.previo`      | Lo que sabes antes de entrar                                                                                                                                               |
| `instrucciones.reglas.titulo`        | Antes de empezar                                                                                                                                                           |
| `instrucciones.reglas.intro`         | Es una práctica formativa: equivocarte aquí es parte de aprender. Cinco cosas que conviene saber:                                                                          |
| `instrucciones.reglas.ia`            | Conversas con una IA (Google Gemini), no con una persona. Puede equivocarse o salirse del caso; si pasa, sigue como lo harías en consulta y cuéntaselo luego a tu docente. |
| `instrucciones.reglas.quienLee`      | Tu docente leerá la conversación completa cuando termines. No la ve en vivo.                                                                                               |
| `instrucciones.reglas.inactividad`   | Si pasan 10 minutos sin actividad, la práctica se cierra sola. Cuenta también ahora, mientras lees, y si sales. Te avisamos un minuto antes.                               |
| `instrucciones.reglas.unUso`         | Tu código ya se usó. Si la práctica se cierra, necesitas un código nuevo para repetirla.                                                                                   |
| `instrucciones.reglas.terminar`      | Cuando acabes, pulsa «Terminar práctica». Después no se puede reanudar.                                                                                                    |
| `instrucciones.controles.titulo`     | Controles                                                                                                                                                                  |
| `instrucciones.controles.ver`        | Ver controles                                                                                                                                                              |
| `instrucciones.controles.ocultar`    | Ocultar                                                                                                                                                                    |
| `instrucciones.controles.caminar`    | W A S D o flechas: caminar                                                                                                                                                 |
| `instrucciones.controles.mirar`      | Ratón: mirar alrededor                                                                                                                                                     |
| `instrucciones.controles.hablar`     | E (o clic sobre el paciente): conversar                                                                                                                                    |
| `instrucciones.controles.liberar`    | Esc: liberar el ratón                                                                                                                                                      |
| `instrucciones.controles.directo`    | ¿Prefieres no recorrer el consultorio? Usa «Ir directo a la conversación».                                                                                                 |
| `instrucciones.datos`                | Practicas como {nombre} · {codigo}                                                                                                                                         |
| `instrucciones.datos.error`          | ¿No eres tú? Cierra sesión y entra con tu cuenta.                                                                                                                          |
| `instrucciones.privacidad.casilla`   | Leí el aviso de privacidad y acepto que mi conversación se procese con Google Gemini y que la lea mi docente.                                                              |
| `instrucciones.privacidad.enlace`    | Leer el aviso de privacidad (se abre en otra pestaña)                                                                                                                      |
| `instrucciones.privacidad.aceptada`  | Aceptaste el aviso de privacidad el {fecha}.                                                                                                                               |
| `instrucciones.privacidad.requerida` | Marca la casilla de privacidad para empezar.                                                                                                                               |
| `instrucciones.boton`                | Empezar la práctica                                                                                                                                                        |
| `instrucciones.boton.cargando`       | Abriendo el consultorio…                                                                                                                                                   |
| `instrucciones.ahoraNo`              | Ahora no                                                                                                                                                                   |
| `instrucciones.ahoraNo.titulo`       | ¿Dejarla para después?                                                                                                                                                     |
| `instrucciones.ahoraNo.texto`        | Tienes hasta las {hora} para volver desde Mis prácticas. Después la práctica se cierra y el código deja de servir.                                                         |
| `instrucciones.ahoraNo.confirmar`    | Ir a Mis prácticas                                                                                                                                                         |
| `instrucciones.ahoraNo.cancelar`     | Seguir leyendo                                                                                                                                                             |
| `instrucciones.error.comenzar`       | No pudimos empezar la práctica. Revisa tu conexión e inténtalo de nuevo.                                                                                                   |
| `instrucciones.contenidoAria`        | Contenido de las instrucciones                                                                                                                                             |

**Avisos de contenido por escenario** (`instrucciones.contenido.{codigo}`). Los recursos de
apoyo se muestran en E-01, E-03 y E-04 y en los casos propios.

| Clave                            | Texto                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `instrucciones.contenido.E-01`   | Marta Lucía perdió a su esposo de forma repentina hace cuatro meses. Habla de duelo, culpa, llanto e insomnio. No hay ideación suicida.                                  |
| `instrucciones.contenido.E-02`   | Andrés Felipe vive con preocupación constante por el trabajo, la salud de su hija y el dinero, con tensión física e irritabilidad.                                       |
| `instrucciones.contenido.E-03`   | Laura Sofía describe semanas de ánimo bajo y, si se lo preguntas, pensamientos pasivos de muerte (sin plan ni intención). Practicarás cómo explorar el riesgo con tacto. |
| `instrucciones.contenido.E-04`   | Julián David llega en plena crisis de pánico: falta de aire, taquicardia y miedo intenso a morir. Escribe con angustia al principio.                                     |
| `instrucciones.contenido.E-05`   | Carolina habla de discusiones con su pareja por las tareas del hogar y la falta de comunicación. No hay violencia en la relación.                                        |
| `instrucciones.contenido.E-06`   | Santiago está en semana de parciales: carga académica, insomnio y presión familiar por mantener su beca.                                                                 |
| `instrucciones.contenido.propio` | Tu docente creó este caso. Puede incluir temas sensibles; lee la descripción antes de empezar.                                                                           |

### 5.8 Simulación: HUD, explorar y controles

| Clave                        | Texto                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `hud.casoAria`               | Datos de la práctica                                                                             |
| `hud.paciente`               | {paciente}, {edad} años                                                                          |
| `hud.tiempo.etiqueta`        | Tiempo de práctica                                                                               |
| `hud.tiempo.aria`            | Tiempo de práctica: {duracion}                                                                   |
| `hud.sonido.silenciar`       | Silenciar el sonido                                                                              |
| `hud.sonido.activar`         | Activar el sonido                                                                                |
| `hud.ambiente.boton`         | Ambiente emocional                                                                               |
| `hud.ambiente.interruptor`   | Ambiente emocional                                                                               |
| `hud.ambiente.descripcion`   | La luz y el sonido del consultorio cambian con el ánimo del paciente. No mide tu desempeño.      |
| `hud.ambiente.activado`      | Ambiente emocional activado                                                                      |
| `hud.ambiente.desactivado`   | Ambiente emocional desactivado                                                                   |
| `hud.controles.boton`        | Controles                                                                                        |
| `hud.mas`                    | Más opciones                                                                                     |
| `hud.terminar`               | Terminar práctica                                                                                |
| `hud.terminar.cargando`      | Terminando…                                                                                      |
| `hud.terminar.deshabilitado` | Espera a que {paciente} termine de responder.                                                    |
| `hud.salir`                  | Salir                                                                                            |
| `hud.pantallaCompleta`       | Presiona F11 para pantalla completa.                                                             |
| `explorar.titulo`            | Explora el consultorio                                                                           |
| `explorar.lejos`             | Acércate a {paciente} y ubícate frente a su silla para conversar.                                |
| `explorar.cerca`             | Estás frente a {paciente}. Empieza cuando quieras.                                               |
| `explorar.boton`             | Comenzar a explorar                                                                              |
| `explorar.conversar`         | Conversar con {paciente}                                                                         |
| `explorar.directo`           | Ir directo a la conversación                                                                     |
| `explorar.pista.cerca`       | Presiona E para hablar con {paciente}                                                            |
| `explorar.pista.apuntando`   | Haz clic o presiona E para hablar con {paciente}                                                 |
| `explorar.escenaAria`        | Consultorio 3D con {paciente}. Si usas lector de pantalla, elige «Ir directo a la conversación». |

### 5.9 Panel de conversación

| Clave                            | Texto                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `chat.aria`                      | Conversación con {paciente}                                                                             |
| `chat.historialAria`             | Historial de la conversación                                                                            |
| `chat.estado.escuchando`         | Escuchando                                                                                              |
| `chat.estado.pensando`           | Pensando…                                                                                               |
| `chat.estado.respondiendo`       | Respondiendo                                                                                            |
| `chat.estado.sinConexion`        | Sin conexión                                                                                            |
| `chat.volverExplorar`            | Volver a explorar                                                                                       |
| `chat.vacio`                     | Saluda a {paciente} y preséntate. Escribe como lo harías en consulta.                                   |
| `chat.tu`                        | Tú                                                                                                      |
| `chat.campo.etiqueta`            | Tu intervención para {paciente}                                                                         |
| `chat.campo.placeholder`         | Escribe tu intervención…                                                                                |
| `chat.campo.placeholderPensando` | {paciente} está pensando…                                                                               |
| `chat.ayuda`                     | Enter para enviar · Mayús + Enter para una nueva línea                                                  |
| `chat.contador`                  | {n}/{max}                                                                                               |
| `chat.excedido`                  | Tu mensaje supera los {max} caracteres. Acórtalo para enviarlo.                                         |
| `chat.enviar`                    | Enviar                                                                                                  |
| `chat.pensandoAria`              | {paciente} está pensando…                                                                               |
| `chat.error.titulo`              | {paciente} no responde por ahora                                                                        |
| `chat.error.texto`               | Puede ser la conexión o una saturación momentánea del servicio de IA. Tu último mensaje se guardó.      |
| `chat.error.reintentar`          | Reintentar                                                                                              |
| `chat.error.terminar`            | Terminar práctica                                                                                       |
| `chat.error.confirmar.texto`     | Si terminas ahora, la práctica no se podrá reanudar. Tu docente revisará lo que alcanzaste a conversar. |
| `chat.error.confirmar.si`        | Sí, terminar práctica                                                                                   |
| `chat.error.confirmar.no`        | Volver                                                                                                  |

### 5.10 Terminar, Salir e inactividad

| Clave                         | Texto                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `terminar.titulo`             | ¿Terminar la práctica?                                                                                         |
| `terminar.texto`              | No se puede reanudar. Tu docente leerá la conversación y te dejará sus comentarios.                            |
| `terminar.confirmar`          | Terminar práctica                                                                                              |
| `terminar.cancelar`           | Seguir practicando                                                                                             |
| `terminar.error`              | No pudimos terminar la práctica. Revisa tu conexión e inténtalo de nuevo. Tu conversación está guardada.       |
| `salir.titulo`                | ¿Salir de la práctica?                                                                                         |
| `salir.texto`                 | La práctica queda abierta hasta las {hora}.                                                                    |
| `salir.siVuelves`             | Si vuelves antes desde Mis prácticas, continúas donde ibas.                                                    |
| `salir.siNo`                  | Si no vuelves, se cierra sola: tu docente revisará lo que alcanzaste a conversar y el código dejará de servir. |
| `salir.confirmar`             | Salir a Mis prácticas                                                                                          |
| `salir.cancelar`              | Seguir practicando                                                                                             |
| `inactividad.titulo`          | ¿Sigues ahí?                                                                                                   |
| `inactividad.texto`           | Si no hay actividad, la práctica se cierra en {s} s. Tu docente revisará lo que alcanzaste a conversar.        |
| `inactividad.textoSinEmpezar` | Si no hay actividad, la práctica se cierra en {s} s y el código dejará de servir.                              |
| `inactividad.boton`           | Sigo aquí                                                                                                      |

### 5.11 Cierre de la práctica

| Clave                         | Texto                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `cierre.terminada.titulo`     | Práctica terminada                                                                                                                 |
| `cierre.terminada.texto`      | Ahora le toca a tu docente.                                                                                                        |
| `cierre.inactividad.titulo`   | La práctica se cerró por inactividad                                                                                               |
| `cierre.inactividad.texto`    | Pasaron 10 minutos sin actividad. Tu docente revisará lo que alcanzaste a conversar.                                               |
| `cierre.sinEmpezar.titulo`    | La práctica se cerró antes de empezar                                                                                              |
| `cierre.sinEmpezar.texto`     | Pasaron 10 minutos sin actividad. El código ya se usó: pídele uno nuevo a tu docente.                                              |
| `cierre.contexto`             | {codigoCaso} {caso} · {duracion} · {intervenciones}                                                                                |
| `cierre.intervenciones.uno`   | 1 intervención                                                                                                                     |
| `cierre.intervenciones.otros` | {n} intervenciones                                                                                                                 |
| `cierre.queSigue.titulo`      | Qué pasa ahora                                                                                                                     |
| `cierre.queSigue.paso1`       | Tu docente lee la conversación.                                                                                                    |
| `cierre.queSigue.paso2`       | Comenta frases concretas y publica una retroalimentación con nota.                                                                 |
| `cierre.queSigue.paso3`       | La verás en Mis prácticas. No enviamos avisos: vuelve a revisar.                                                                   |
| `cierre.reflexion.titulo`     | Para ti, mientras esperas                                                                                                          |
| `cierre.reflexion.p1`         | ¿Qué momento de la conversación sentiste que funcionó?                                                                             |
| `cierre.reflexion.p2`         | ¿Qué harías distinto la próxima vez?                                                                                               |
| `cierre.reflexion.campo`      | Tus notas (opcional)                                                                                                               |
| `cierre.reflexion.aviso`      | Esto no se guarda ni lo ve tu docente. Es solo para ti.                                                                            |
| `cierre.principal`            | Ir a Mis prácticas                                                                                                                 |
| `cierre.secundaria`           | Releer la conversación                                                                                                             |
| `cierre.mensajeDocente.boton` | Copiar mensaje para mi docente                                                                                                     |
| `cierre.mensajeDocente.texto` | Hola. Mi práctica en PsySim («{caso}») se cerró por inactividad antes de empezar. ¿Sería posible recibir un código nuevo? Gracias. |

### 5.12 Asignar práctica, código listo y mensaje para compartir

| Clave                                | Texto                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `asignar.meta.titulo`                | Asignar práctica                                                                                                                                       |
| `asignar.titulo`                     | Asignar práctica                                                                                                                                       |
| `asignar.descripcion`                | Elige el caso y a quién se lo asignas. Te damos un código de un solo uso para que practique desde su computador.                                       |
| `asignar.paso1.titulo`               | Caso                                                                                                                                                   |
| `asignar.paso1.desc`                 | Un escenario predefinido o uno de tus casos.                                                                                                           |
| `asignar.paso1.buscar`               | Buscar caso                                                                                                                                            |
| `asignar.paso1.predefinidos`         | Escenarios predefinidos                                                                                                                                |
| `asignar.paso1.mios`                 | Mis casos                                                                                                                                              |
| `asignar.paso1.cambiar`              | Cambiar                                                                                                                                                |
| `asignar.paso1.error`                | Elige un caso.                                                                                                                                         |
| `asignar.paso2.titulo`               | Comportamiento del paciente (opcional)                                                                                                                 |
| `asignar.paso2.resumenOriginal`      | Usa el comportamiento original del caso.                                                                                                               |
| `asignar.paso2.resumenPersonalizado` | Ajustado para esta asignación.                                                                                                                         |
| `asignar.paso2.ajustar`              | Ajustar                                                                                                                                                |
| `asignar.paso2.etiqueta`             | Comportamiento del paciente                                                                                                                            |
| `asignar.paso2.ayuda`                | Así actuará el paciente en esta práctica. El estudiante no lo ve. Los cambios valen solo para esta asignación, salvo que los guardes como caso propio. |
| `asignar.paso2.personalizado`        | Personalizado                                                                                                                                          |
| `asignar.paso2.restablecer`          | Restablecer original                                                                                                                                   |
| `asignar.paso2.guardarCaso`          | Guardar como mi caso                                                                                                                                   |
| `asignar.paso2.perfil`               | Perfil clínico                                                                                                                                         |
| `asignar.paso2.competencia`          | Competencia que practicará                                                                                                                             |
| `asignar.reglas.titulo`              | Reglas que siempre se aplican                                                                                                                          |
| `asignar.reglas.desc`                | Se añaden automáticamente y no se pueden quitar.                                                                                                       |
| `asignar.paso3.titulo`               | Estudiante y plazo                                                                                                                                     |
| `asignar.paso3.buscar`               | Buscar por nombre o código                                                                                                                             |
| `asignar.paso3.sinCoincidencias`     | Ningún estudiante con cuenta coincide. Regístralo con su correo institucional.                                                                         |
| `asignar.paso3.registrar`            | Registrar estudiante                                                                                                                                   |
| `asignar.paso3.vacio`                | Aún no tienes estudiantes. Regístralos con su correo institucional para asignarles prácticas.                                                          |
| `asignar.paso3.cambiar`              | Cambiar                                                                                                                                                |
| `asignar.paso3.error`                | Elige a quién le asignas la práctica.                                                                                                                  |
| `asignar.vigencia.etiqueta`          | El código sirve durante                                                                                                                                |
| `asignar.vigencia.1`                 | 1 día                                                                                                                                                  |
| `asignar.vigencia.3`                 | 3 días                                                                                                                                                 |
| `asignar.vigencia.7`                 | 7 días                                                                                                                                                 |
| `asignar.vigencia.30`                | 30 días                                                                                                                                                |
| `asignar.vigencia.ayuda`             | Si no lo usa a tiempo, vence. Puedes anularlo antes desde su ficha.                                                                                    |
| `asignar.resumen.sinCaso`            | Elige un caso para empezar.                                                                                                                            |
| `asignar.resumen.sinEstudiante`      | Elige a quién se lo asignas.                                                                                                                           |
| `asignar.resumen.listo`              | {caso} para {estudiante} · el código vence el {fecha}                                                                                                  |
| `asignar.boton`                      | Generar código                                                                                                                                         |
| `asignar.boton.cargando`             | Generando…                                                                                                                                             |
| `asignar.error.sinCuenta`            | {nombre} aún no tiene cuenta. Agrega su correo institucional en su ficha.                                                                              |
| `asignar.error.estudiante`           | Ese estudiante ya no está disponible. Elige otro.                                                                                                      |
| `asignar.error.caso`                 | Ese caso ya no está disponible. Elige otro.                                                                                                            |
| `asignar.error.generico`             | No pudimos generar el código. Inténtalo de nuevo.                                                                                                      |
| `asignar.sinCasos`                   | No hay casos disponibles por ahora. Crea uno propio o avisa al administrador.                                                                          |
| `codigoListo.titulo`                 | Código listo para {nombre}                                                                                                                             |
| `codigoListo.desc`                   | Sirve una sola vez, solo con la cuenta de {nombre}, hasta el {fecha}.                                                                                  |
| `codigoListo.caso`                   | {caso}                                                                                                                                                 |
| `codigoListo.enlace`                 | Enlace directo                                                                                                                                         |
| `codigoListo.compartir`              | Compartir                                                                                                                                              |
| `codigoListo.compartir.menu`         | Enviar por                                                                                                                                             |
| `codigoListo.whatsapp`               | WhatsApp                                                                                                                                               |
| `codigoListo.gmail`                  | Gmail                                                                                                                                                  |
| `codigoListo.appCorreo`              | App de correo                                                                                                                                          |
| `codigoListo.masOpciones`            | Más opciones…                                                                                                                                          |
| `codigoListo.copiarMensaje`          | Copiar mensaje                                                                                                                                         |
| `codigoListo.copiarEnlace`           | Copiar enlace                                                                                                                                          |
| `codigoListo.copiarCodigo`           | Copiar código                                                                                                                                          |
| `codigoListo.verMensaje`             | Ver el mensaje                                                                                                                                         |
| `codigoListo.otra`                   | Asignar otra práctica                                                                                                                                  |
| `codigoListo.ficha`                  | Ver ficha de {nombre}                                                                                                                                  |
| `codigoListo.listo`                  | Listo                                                                                                                                                  |
| `compartir.asunto`                   | Tu práctica en PsySim: {caso}                                                                                                                          |

**Mensaje para WhatsApp o correo** (`compartir.mensaje`). Una línea por elemento; sin
concatenaciones.

```
Hola, {nombre}. Te asigné una práctica en PsySim: «{caso}».

Ábrela en un computador con teclado y ratón (la simulación no funciona en el celular):
{enlace}

Entra con tu correo @correounivalle.edu.co («Continuar con Google»).

El código {codigo} es de un solo uso y vence el {fecha}.
Cuando lo uses, empieza enseguida: si pasan 10 minutos sin actividad, la práctica se cierra y el código deja de servir.
```

### 5.13 Inicio-bandeja del docente `/inicio`

| Clave                              | Texto                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `nav.asignar`                      | Asignar práctica                                                                                                                            |
| `nav.inicio`                       | Inicio                                                                                                                                      |
| `nav.revisiones`                   | Revisiones                                                                                                                                  |
| `nav.estudiantes`                  | Estudiantes                                                                                                                                 |
| `nav.casos`                        | Casos                                                                                                                                       |
| `nav.grupoAdmin`                   | Administración                                                                                                                              |
| `nav.docentes`                     | Docentes                                                                                                                                    |
| `nav.aria`                         | Navegación principal                                                                                                                        |
| `nav.expandir`                     | Expandir menú                                                                                                                               |
| `nav.contraer`                     | Contraer menú                                                                                                                               |
| `inicio.meta.titulo`               | Inicio                                                                                                                                      |
| `inicio.saludo`                    | Hola, {nombre}                                                                                                                              |
| `inicio.resumen`                   | {porRevisar} · {practicando} · {porVencer}                                                                                                  |
| `inicio.resumen.porRevisar.uno`    | 1 por revisar                                                                                                                               |
| `inicio.resumen.porRevisar.otros`  | {n} por revisar                                                                                                                             |
| `inicio.resumen.practicando.uno`   | 1 practicando ahora                                                                                                                         |
| `inicio.resumen.practicando.otros` | {n} practicando ahora                                                                                                                       |
| `inicio.resumen.porVencer.uno`     | 1 código vence pronto                                                                                                                       |
| `inicio.resumen.porVencer.otros`   | {n} códigos vencen pronto                                                                                                                   |
| `inicio.resumen.alDia`             | Estás al día.                                                                                                                               |
| `inicio.asignar`                   | Asignar práctica                                                                                                                            |
| `inicio.porRevisar.titulo`         | Por revisar                                                                                                                                 |
| `inicio.porRevisar.fila`           | {estudiante} · {codigoCaso} {caso}                                                                                                          |
| `inicio.porRevisar.filaMeta`       | Terminó {cuando} · {intervenciones}                                                                                                         |
| `inicio.porRevisar.revisar`        | Revisar                                                                                                                                     |
| `inicio.porRevisar.continuar`      | Continuar borrador                                                                                                                          |
| `inicio.porRevisar.verTodas`       | Ver todas en Revisiones                                                                                                                     |
| `inicio.porRevisar.vacio.titulo`   | Nada por revisar                                                                                                                            |
| `inicio.porRevisar.vacio.texto`    | Cuando un estudiante termine una práctica, aparecerá aquí.                                                                                  |
| `inicio.practicando.titulo`        | Practicando ahora                                                                                                                           |
| `inicio.practicando.ayuda`         | No ves el chat en vivo. Esta lista se actualiza sola.                                                                                       |
| `inicio.practicando.vacio`         | Nadie está practicando en este momento.                                                                                                     |
| `inicio.codigos.titulo`            | Códigos por vencer                                                                                                                          |
| `inicio.codigos.ayuda`             | Sin usar y con 48 horas o menos de vigencia.                                                                                                |
| `inicio.codigos.compartir`         | Compartir                                                                                                                                   |
| `inicio.codigos.anular`            | Anular                                                                                                                                      |
| `inicio.codigos.vacio`             | Ningún código vence en las próximas 48 horas.                                                                                               |
| `inicio.primerUso.titulo`          | Empieza por asignar una práctica                                                                                                            |
| `inicio.primerUso.texto`           | Registra a un estudiante con su correo institucional, elige un caso y envíale el código. Aquí verás quién practica y qué falta por revisar. |
| `inicio.primerUso.registrar`       | Registrar estudiante                                                                                                                        |
| `inicio.franjaAdmin`               | Administración · {n} cuentas de docentes activas                                                                                            |
| `inicio.franjaAdmin.enlace`        | Gestionar docentes                                                                                                                          |

### 5.14 Revisiones `/sesiones` y revisión de la práctica `/sesiones/{id}`

| Clave                                   | Texto                                                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `revisiones.meta.titulo`                | Revisiones                                                                                                                             |
| `revisiones.titulo`                     | Revisiones                                                                                                                             |
| `revisiones.descripcion`                | Las prácticas de tus estudiantes, por estado. Lee la conversación, comenta frases y publica la retroalimentación.                      |
| `revisiones.tab.porRevisar`             | Por revisar                                                                                                                            |
| `revisiones.tab.borradores`             | Borradores                                                                                                                             |
| `revisiones.tab.publicadas`             | Publicadas                                                                                                                             |
| `revisiones.tab.sinConversacion`        | Sin conversación                                                                                                                       |
| `revisiones.tab.todas`                  | Todas                                                                                                                                  |
| `revisiones.buscar`                     | Buscar por estudiante o caso                                                                                                           |
| `revisiones.col.estudiante`             | Estudiante                                                                                                                             |
| `revisiones.col.caso`                   | Caso                                                                                                                                   |
| `revisiones.col.termino`                | Terminó                                                                                                                                |
| `revisiones.col.duracion`               | Duración                                                                                                                               |
| `revisiones.col.intervenciones`         | Intervenciones                                                                                                                         |
| `revisiones.col.estado`                 | Estado                                                                                                                                 |
| `revisiones.col.nota`                   | Nota                                                                                                                                   |
| `revisiones.accion.revisar`             | Revisar                                                                                                                                |
| `revisiones.accion.ver`                 | Ver revisión                                                                                                                           |
| `revisiones.vacio.porRevisar`           | Nada por revisar. Estás al día.                                                                                                        |
| `revisiones.vacio.borradores`           | No tienes borradores.                                                                                                                  |
| `revisiones.vacio.publicadas`           | Aún no has publicado retroalimentación.                                                                                                |
| `revisiones.vacio.sinConversacion`      | Ninguna práctica se cerró sin conversación.                                                                                            |
| `revisiones.vacio.busqueda`             | Nada coincide con «{busqueda}». Revisa la ortografía o busca por código del estudiante.                                                |
| `revision.meta.titulo`                  | Revisión de la práctica                                                                                                                |
| `revision.migas`                        | Revisiones                                                                                                                             |
| `revision.contador`                     | {i} de {total} por revisar                                                                                                             |
| `revision.anterior`                     | Anterior                                                                                                                               |
| `revision.siguiente`                    | Siguiente                                                                                                                              |
| `revision.encabezado.paciente`          | Paciente: {paciente}, {edad} años · Competencia: {competencia}                                                                         |
| `revision.dato.estudiante`              | Estudiante                                                                                                                             |
| `revision.dato.fecha`                   | Fecha                                                                                                                                  |
| `revision.dato.duracion`                | Duración                                                                                                                               |
| `revision.dato.intervenciones`          | Intervenciones                                                                                                                         |
| `revision.conversacion.titulo`          | Conversación                                                                                                                           |
| `revision.conversacion.ayuda`           | Selecciona una frase de {nombre} para comentarla. Pulsa un subrayado para verlo o editarlo.                                            |
| `revision.conversacion.vacia`           | {nombre} no alcanzó a conversar con el paciente.                                                                                       |
| `revision.seleccion.comentar`           | Comentar selección                                                                                                                     |
| `revision.seleccion.solapa`             | Se cruza con otro comentario. Selecciona otra parte de la frase.                                                                       |
| `revision.seleccion.aria`               | Acciones sobre la selección                                                                                                            |
| `revision.comentario.nuevoAria`         | Nuevo comentario                                                                                                                       |
| `revision.comentario.etiqueta`          | Comentario sobre la frase seleccionada                                                                                                 |
| `revision.comentario.placeholder`       | Ej.: Aquí sonaste muy directo; valida primero lo que siente.                                                                           |
| `revision.comentario.atajo`             | Ctrl + Enter para guardar                                                                                                              |
| `revision.comentario.guardar`           | Guardar comentario                                                                                                                     |
| `revision.comentario.editar`            | Editar                                                                                                                                 |
| `revision.comentario.editarAria`        | Editar el comentario {n}                                                                                                               |
| `revision.comentario.quitar`            | Quitar                                                                                                                                 |
| `revision.comentario.quitarAria`        | Quitar el comentario {n}                                                                                                               |
| `revision.comentario.toast.agregado`    | Comentario agregado.                                                                                                                   |
| `revision.comentario.toast.actualizado` | Comentario actualizado.                                                                                                                |
| `revision.comentario.toast.quitado`     | Comentario quitado.                                                                                                                    |
| `revision.comentario.aviso.publicada`   | {nombre} ya ve la retroalimentación: este cambio aparecerá enseguida.                                                                  |
| `revision.lista.titulo`                 | Comentarios en la conversación                                                                                                         |
| `revision.lista.vacia`                  | Aún no has comentado ninguna frase. Selecciona texto en las intervenciones de {nombre}.                                                |
| `retro.titulo`                          | Retroalimentación                                                                                                                      |
| `retro.estado.borrador`                 | Borrador                                                                                                                               |
| `retro.estado.publicada`                | Publicada                                                                                                                              |
| `retro.avisoPublicada`                  | Ya está publicada. Lo que guardes ahora lo verá {nombre} con la marca «Actualizada el…».                                               |
| `retro.general.etiqueta`                | Comentario general                                                                                                                     |
| `retro.general.placeholder`             | Fortalezas, aspectos por mejorar y una recomendación para la próxima práctica.                                                         |
| `retro.nota.etiqueta`                   | Nota (0,0 a 5,0)                                                                                                                       |
| `retro.nota.placeholder`                | Ej.: 4,5                                                                                                                               |
| `retro.nota.error.rango`                | La nota va de 0,0 a 5,0.                                                                                                               |
| `retro.nota.error.formato`              | Escribe la nota con un decimal, por ejemplo 4,5.                                                                                       |
| `retro.guardarBorrador`                 | Guardar borrador                                                                                                                       |
| `retro.publicarSiguiente`               | Publicar y abrir la siguiente                                                                                                          |
| `retro.publicar`                        | Publicar                                                                                                                               |
| `retro.guardarCambios`                  | Guardar cambios                                                                                                                        |
| `retro.guardando`                       | Guardando…                                                                                                                             |
| `retro.publicando`                      | Publicando…                                                                                                                            |
| `retro.confirmar.texto`                 | {nombre} verá la nota, el comentario general y tus comentarios ({n}) en cuanto publiques.                                              |
| `retro.confirmar.siSiguiente`           | Publicar y abrir la siguiente                                                                                                          |
| `retro.confirmar.si`                    | Publicar                                                                                                                               |
| `retro.confirmar.no`                    | Volver                                                                                                                                 |
| `retro.linea.borrador`                  | Solo tú ves el borrador.                                                                                                               |
| `retro.linea.guardado`                  | Guardado el {fecha}                                                                                                                    |
| `retro.linea.publicada`                 | Publicada el {fecha}                                                                                                                   |
| `retro.linea.editada`                   | Editada el {fecha}                                                                                                                     |
| `retro.toast.borrador`                  | Borrador guardado.                                                                                                                     |
| `retro.toast.publicada`                 | Publicada. {nombre} ya puede verla.                                                                                                    |
| `retro.toast.siguiente`                 | Publicada. Abriste la práctica de {nombre}.                                                                                            |
| `retro.toast.ultima`                    | Publicada. No quedan prácticas por revisar.                                                                                            |
| `retro.toast.cambios`                   | Cambios guardados. {nombre} verá «Actualizada el {fecha}».                                                                             |
| `retro.error.generico`                  | No pudimos guardar. Tu texto sigue aquí: inténtalo de nuevo.                                                                           |
| `revision.enCurso.titulo`               | Practicando ahora                                                                                                                      |
| `revision.enCurso.tituloSinEmpezar`     | Abrió la práctica                                                                                                                      |
| `revision.enCurso.texto`                | {nombre} está conversando con el paciente desde las {hora}. Podrás leer la conversación cuando termine. Esta página se actualiza sola. |
| `revision.enCurso.textoSinEmpezar`      | {nombre} usó el código a las {hora} y aún no empieza. Esta página se actualiza sola.                                                   |
| `revision.cerrar.boton`                 | Cerrar la práctica                                                                                                                     |
| `revision.cerrar.ayuda`                 | Normalmente no hace falta: se cierra sola tras 10 minutos sin actividad.                                                               |
| `revision.cerrar.confirmar`             | Si {nombre} sigue practicando, se le cerrará y no podrá continuarla. ¿Cerrar la práctica?                                              |
| `revision.cerrar.si`                    | Sí, cerrar la práctica                                                                                                                 |
| `revision.cerrar.no`                    | Cancelar                                                                                                                               |
| `revision.cerrar.toast`                 | Cerramos la práctica. Ya puedes revisarla.                                                                                             |

### 5.15 Estudiantes, ficha e informe de notas

| Clave                            | Texto                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `estudiantes.titulo`             | Estudiantes                                                                                                                                                         |
| `estudiantes.descripcion`        | Regístralos con su correo institucional para asignarles prácticas. Entran con «Continuar con Google».                                                               |
| `estudiantes.registrar`          | Registrar estudiante                                                                                                                                                |
| `estudiantes.vacio.titulo`       | Aún no tienes estudiantes                                                                                                                                           |
| `estudiantes.vacio.texto`        | Regístralos con su código, nombre y correo @correounivalle.edu.co. Después podrás asignarles prácticas.                                                             |
| `estudiantes.buscar`             | Buscar por nombre o código                                                                                                                                          |
| `estudiantes.masAcciones`        | Más acciones para {nombre}                                                                                                                                          |
| `ficha.migas`                    | Estudiantes                                                                                                                                                         |
| `ficha.acceso.google`            | Entra con Google                                                                                                                                                    |
| `ficha.acceso.sinCuenta`         | Sin cuenta: agrega su correo para asignarle prácticas                                                                                                               |
| `ficha.sinCorreo`                | Sin correo institucional                                                                                                                                            |
| `ficha.asignar`                  | Asignar práctica                                                                                                                                                    |
| `ficha.imprimir`                 | Imprimir notas                                                                                                                                                      |
| `ficha.editar`                   | Editar                                                                                                                                                              |
| `ficha.agregarCorreo`            | Agregar correo                                                                                                                                                      |
| `ficha.ind.practicas`            | Prácticas                                                                                                                                                           |
| `ficha.ind.tiempo`               | Tiempo de práctica                                                                                                                                                  |
| `ficha.ind.intervenciones`       | Intervenciones                                                                                                                                                      |
| `ficha.ind.promedio`             | Nota promedio                                                                                                                                                       |
| `ficha.practicas.titulo`         | Prácticas                                                                                                                                                           |
| `ficha.practicas.vacio`          | Aún no ha hecho ninguna práctica. Aparecerá aquí en cuanto use un código.                                                                                           |
| `ficha.codigos.titulo`           | Códigos de acceso                                                                                                                                                   |
| `ficha.codigos.desc`             | Cada código sirve una sola vez y solo con la cuenta de {nombre}.                                                                                                    |
| `ficha.codigos.fila`             | {caso} · generado el {fecha}                                                                                                                                        |
| `ficha.codigos.compartir`        | Compartir código                                                                                                                                                    |
| `ficha.codigos.anular`           | Anular                                                                                                                                                              |
| `ficha.codigos.anular.confirmar` | ¿Anular el código {codigo}? Dejará de funcionar.                                                                                                                    |
| `ficha.codigos.anular.si`        | Sí, anular                                                                                                                                                          |
| `ficha.codigos.anular.no`        | No                                                                                                                                                                  |
| `ficha.codigos.toast.anulado`    | Anulamos el código {codigo}.                                                                                                                                        |
| `ficha.codigos.error.yaUsado`    | Ese código ya se usó o ya estaba anulado.                                                                                                                           |
| `ficha.codigos.vacio`            | Aún no le has asignado prácticas.                                                                                                                                   |
| `registro.titulo`                | Registrar estudiante                                                                                                                                                |
| `registro.tituloEditar`          | Editar estudiante                                                                                                                                                   |
| `registro.desc`                  | Con su correo institucional entra a PsySim con «Continuar con Google». No necesita contraseña.                                                                      |
| `registro.codigo`                | Código institucional                                                                                                                                                |
| `registro.codigo.placeholder`    | Ej.: 202012345                                                                                                                                                      |
| `registro.codigo.ayudaEditar`    | El código no se cambia: identifica su historial.                                                                                                                    |
| `registro.nombre`                | Nombre completo                                                                                                                                                     |
| `registro.nombre.placeholder`    | Ej.: Ana María Pérez                                                                                                                                                |
| `registro.correo`                | Correo institucional                                                                                                                                                |
| `registro.correo.placeholder`    | nombre.apellido@correounivalle.edu.co                                                                                                                               |
| `registro.correo.ayuda`          | Solo se aceptan cuentas @correounivalle.edu.co.                                                                                                                     |
| `registro.boton`                 | Registrar                                                                                                                                                           |
| `registro.botonEditar`           | Guardar cambios                                                                                                                                                     |
| `registro.toast.creado`          | Registramos a {nombre}.                                                                                                                                             |
| `registro.toast.editado`         | Actualizamos los datos de {nombre}.                                                                                                                                 |
| `eliminarEst.titulo`             | ¿Eliminar a {nombre}?                                                                                                                                               |
| `eliminarEst.desc`               | No se puede deshacer.                                                                                                                                               |
| `eliminarEst.conHistorial`       | Se borrarán sus {n} prácticas con las conversaciones y la retroalimentación.                                                                                        |
| `eliminarEst.sinHistorial`       | Aún no tiene prácticas: no se pierde ningún historial.                                                                                                              |
| `eliminarEst.codigos.uno`        | Su código sin usar dejará de funcionar.                                                                                                                             |
| `eliminarEst.codigos.otros`      | Sus {n} códigos sin usar dejarán de funcionar.                                                                                                                      |
| `eliminarEst.cuenta`             | Si ningún otro docente lo tiene registrado, también se eliminará su cuenta.                                                                                         |
| `eliminarEst.escribir`           | Para confirmar, escribe su código: {codigo}                                                                                                                         |
| `eliminarEst.confirmar`          | Eliminar estudiante y sus prácticas                                                                                                                                 |
| `eliminarEst.toast`              | Eliminamos a {nombre}.                                                                                                                                              |
| `informe.meta.titulo`            | Notas de {nombre}                                                                                                                                                   |
| `informe.volver`                 | Volver a la ficha                                                                                                                                                   |
| `informe.ayuda`                  | Vista previa del informe. En el diálogo de impresión elige «Guardar como PDF».                                                                                      |
| `informe.imprimir`               | Imprimir                                                                                                                                                            |
| `informe.antetitulo`             | PsySim · Práctica de entrevista clínica                                                                                                                             |
| `informe.titulo`                 | Informe de notas                                                                                                                                                    |
| `informe.emitido`                | Emitido el {fecha} por {docente}                                                                                                                                    |
| `informe.resumen`                | Resumen por práctica                                                                                                                                                |
| `informe.col.n`                  | N.º                                                                                                                                                                 |
| `informe.col.fecha`              | Fecha                                                                                                                                                               |
| `informe.col.caso`               | Caso                                                                                                                                                                |
| `informe.col.duracion`           | Duración                                                                                                                                                            |
| `informe.col.estado`             | Estado                                                                                                                                                              |
| `informe.col.nota`               | Nota                                                                                                                                                                |
| `informe.sinPublicar`            | Sin publicar                                                                                                                                                        |
| `informe.enCurso`                | En curso                                                                                                                                                            |
| `informe.observaciones`          | Observación general del docente                                                                                                                                     |
| `informe.vacio`                  | Aún no ha hecho ninguna práctica.                                                                                                                                   |
| `informe.pie`                    | {n} prácticas, {p} con retroalimentación publicada. La nota promedio y las observaciones solo incluyen la retroalimentación publicada. Informe generado con PsySim. |

### 5.16 Casos `/configuracion/casos`

| Clave                          | Texto                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `casos.meta.titulo`            | Casos                                                                                            |
| `casos.titulo`                 | Casos                                                                                            |
| `casos.descripcion`            | Los seis escenarios predefinidos y los casos que creas. Asigna cualquiera a un estudiante.       |
| `casos.crear`                  | Crear caso                                                                                       |
| `casos.predefinidos`           | Escenarios predefinidos                                                                          |
| `casos.mios`                   | Mis casos                                                                                        |
| `casos.tarjeta.tipoNivel`      | {tipo} · Nivel {nivel}                                                                           |
| `casos.tarjeta.competencia`    | Competencia: {competencia}                                                                       |
| `casos.tarjeta.asignar`        | Asignar                                                                                          |
| `casos.tarjeta.ver`            | Ver detalle                                                                                      |
| `casos.tarjeta.editar`         | Editar                                                                                           |
| `casos.tarjeta.eliminar`       | Eliminar caso                                                                                    |
| `casos.detalle.perfil`         | Perfil clínico                                                                                   |
| `casos.detalle.apertura`       | Frase de apertura                                                                                |
| `casos.detalle.comportamiento` | Comportamiento del paciente                                                                      |
| `casos.mios.vacio.titulo`      | Aquí vivirán tus casos                                                                           |
| `casos.mios.vacio.texto`       | Crea un paciente a tu medida, o ajusta un escenario al asignarlo y pulsa «Guardar como mi caso». |
| `casos.mios.vacio.boton`       | Crear mi primer caso                                                                             |
| `casos.eliminar.titulo`        | ¿Eliminar «{caso}»?                                                                              |
| `casos.eliminar.texto`         | Dejará de aparecer en tu lista. Las prácticas ya asignadas conservan su copia del caso.          |
| `casos.eliminar.confirmar`     | Eliminar caso                                                                                    |
| `casos.eliminar.toast`         | Eliminamos «{caso}».                                                                             |

### 5.17 Administración `/admin`

| Clave                                  | Texto                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `admin.titulo`                         | Docentes                                                                                                                                   |
| `admin.descripcion`                    | Crea las cuentas de los docentes, decide cómo entran y sigue su actividad. Como administrador, también trabajas como docente.              |
| `admin.nuevo`                          | Nuevo docente                                                                                                                              |
| `admin.ind.activas`                    | Cuentas activas                                                                                                                            |
| `admin.ind.estudiantes`                | Estudiantes                                                                                                                                |
| `admin.ind.practicas`                  | Prácticas                                                                                                                                  |
| `admin.ind.porRevisar`                 | Por revisar                                                                                                                                |
| `admin.docente.titulo`                 | Nuevo docente                                                                                                                              |
| `admin.docente.tituloEditar`           | Editar cuenta                                                                                                                              |
| `admin.docente.desc`                   | Crea la cuenta y elige cómo entrará a PsySim.                                                                                              |
| `admin.docente.descEditar`             | Corrige sus datos o cambia su rol. Si cambias el correo, entrará con el nuevo.                                                             |
| `admin.docente.rol.docente`            | Docente                                                                                                                                    |
| `admin.docente.rol.docente.desc`       | Asigna prácticas y retroalimenta a sus estudiantes.                                                                                        |
| `admin.docente.rol.admin`              | Administrador                                                                                                                              |
| `admin.docente.rol.admin.desc`         | Además gestiona las cuentas de los docentes.                                                                                               |
| `admin.docente.acceso.google`          | Con Google                                                                                                                                 |
| `admin.docente.acceso.google.desc`     | Entra con «Continuar con Google» usando este correo.                                                                                       |
| `admin.docente.acceso.contrasena`      | Contraseña temporal                                                                                                                        |
| `admin.docente.acceso.contrasena.desc` | Se genera ahora y la cambia al entrar.                                                                                                     |
| `admin.docente.propio`                 | Tu propio rol de administrador no se puede cambiar desde aquí.                                                                             |
| `admin.docente.crear`                  | Crear cuenta                                                                                                                               |
| `admin.docente.toast.google`           | Creamos la cuenta de {nombre}. Ya puede entrar con Google.                                                                                 |
| `admin.credenciales.titulo`            | Cuenta creada                                                                                                                              |
| `admin.credenciales.desc`              | Envíale estos datos a {nombre} por un medio seguro (correo institucional o mensaje directo). Al entrar le pediremos cambiar la contraseña. |
| `admin.desactivar.titulo`              | ¿Desactivar a {nombre}?                                                                                                                    |
| `admin.desactivar.texto`               | No podrá entrar a PsySim y su sesión abierta se cerrará en su próximo clic. Sus estudiantes, casos y prácticas se conservan.               |
| `admin.reactivar.titulo`               | ¿Reactivar a {nombre}?                                                                                                                     |
| `admin.reactivar.texto`                | Podrá volver a entrar con su cuenta y retomar su trabajo.                                                                                  |
| `admin.eliminar.titulo`                | ¿Eliminar la cuenta de {nombre}?                                                                                                           |
| `admin.eliminar.texto`                 | Aún no tiene estudiantes, casos ni prácticas. La cuenta se borra por completo y no se puede deshacer.                                      |
| `admin.eliminar.conHistorial`          | Tiene historial: desactívala en lugar de eliminarla.                                                                                       |
| `herramientas.titulo`                  | Herramientas de desarrollo                                                                                                                 |
| `herramientas.desc`                    | Pruebas internas del proyecto. Solo las ve la administración; no forman parte de la práctica.                                              |

### 5.18 Relectura `/practicas/{id}` (estudiante)

| Clave                               | Texto                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `relectura.meta.titulo`             | Mi práctica                                                                                           |
| `relectura.volver`                  | Mis prácticas                                                                                         |
| `relectura.encabezado`              | Paciente: {paciente}, {edad} años · Competencia que practicaste: {competencia}                        |
| `relectura.espera.titulo`           | Tu docente aún no publica la retroalimentación                                                        |
| `relectura.espera.texto`            | Mientras tanto, puedes releer tu conversación. Cuando la publique, la verás aquí; no enviamos avisos. |
| `relectura.general.titulo`          | Retroalimentación de {docente}                                                                        |
| `relectura.general.tituloSinNombre` | Retroalimentación de tu docente                                                                       |
| `relectura.fechas.publicada`        | Publicada el {fecha}                                                                                  |
| `relectura.fechas.actualizada`      | Publicada el {fecha} · Actualizada el {fecha2}                                                        |
| `relectura.nota.titulo`             | Nota de esta práctica                                                                                 |
| `relectura.nota.valor`              | {nota} de 5,0                                                                                         |
| `relectura.conversacion.titulo`     | Tu conversación                                                                                       |
| `relectura.conversacion.ayuda`      | Pulsa una frase subrayada para leer el comentario de tu docente.                                      |
| `relectura.conversacion.vacia`      | No alcanzaste a conversar con el paciente en esta práctica.                                           |
| `relectura.comentarios.titulo`      | Comentarios de tu docente                                                                             |
| `relectura.comentarios.aria`        | Comentario {n} de tu docente                                                                          |
| `relectura.ia`                      | Las respuestas del paciente las generó una IA.                                                        |

### 5.19 Acceso denegado, 404 y error

| Clave                        | Texto                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `denegado.meta.titulo`       | Cuenta no registrada                                                                                                              |
| `denegado.titulo`            | Tu cuenta no está registrada en PsySim                                                                                            |
| `denegado.estudiante`        | Si eres estudiante, pídele a tu docente que te registre con tu correo @correounivalle.edu.co. Después vuelve a entrar con Google. |
| `denegado.docente`           | Si eres docente, pídele al administrador de PsySim que cree tu cuenta.                                                            |
| `denegado.otraCuenta`        | Entrar con otra cuenta                                                                                                            |
| `denegado.inicio`            | Ir a la página de inicio                                                                                                          |
| `noEncontrada.meta.titulo`   | Página no encontrada                                                                                                              |
| `noEncontrada.titulo`        | No encontramos esta página                                                                                                        |
| `noEncontrada.texto`         | Puede que el enlace esté incompleto o que la página ya no exista.                                                                 |
| `noEncontrada.inicioRol`     | Ir a mi inicio                                                                                                                    |
| `noEncontrada.inicioPublico` | Ir a la página de inicio                                                                                                          |
| `noEncontrada.volver`        | Volver                                                                                                                            |
| `errorCarga.titulo`          | No pudimos cargar esta página                                                                                                     |
| `errorCarga.texto`           | Puede ser la conexión. Inténtalo de nuevo; si sigue fallando, vuelve más tarde.                                                   |
| `errorCarga.reintentar`      | Reintentar                                                                                                                        |
| `errorCarga.inicio`          | Ir a mi inicio                                                                                                                    |

### 5.20 Privacidad `/privacidad` (texto completo)

| Clave                         | Texto                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `privacidad.meta.titulo`      | Aviso de privacidad                                                                                   |
| `privacidad.meta.descripcion` | Qué datos trata PsySim, para qué, quién los ve y cómo ejercer tus derechos según la Ley 1581 de 2012. |
| `privacidad.titulo`           | Cómo usamos tus datos                                                                                 |
| `privacidad.version`          | Versión 1 · Última actualización: [fecha por confirmar] **[VALIDAR]**                                 |
| `privacidad.indice`           | En esta página                                                                                        |

Texto de la página (markdown listo para el componente; las secciones llevan ancla):

> **En resumen**
>
> - PsySim guarda tu nombre, código y correo institucional, tus conversaciones con el paciente
>   simulado y la retroalimentación de tu docente.
> - Tu docente lee tus conversaciones cuando terminas. Nadie más del curso las ve.
> - Cada mensaje que escribes se envía a Google (Gemini) para generar la respuesta del paciente.
> - No vendemos tus datos ni los usamos para publicidad.
> - Puedes conocer, corregir o pedir que se borren tus datos escribiendo a [correo de contacto
>   por confirmar]. **[VALIDAR]**
>
> **1. Quién es responsable** {#responsable}
>
> PsySim es un trabajo de grado de la Universidad del Valle, desarrollado por Brayan Steven
> Narváez Valdés. Responsable del tratamiento: [por confirmar: el autor, la Universidad del Valle
> o ambos, según indique el director del trabajo y la oficina competente de la universidad].
> **[VALIDAR]** Contacto: [correo de contacto por confirmar]. **[VALIDAR]**
>
> **2. Qué datos tratamos** {#datos}
>
> Si eres estudiante:
>
> - Los que registra tu docente: nombre completo, código institucional y correo
>   @correounivalle.edu.co.
> - Los que comparte Google al iniciar sesión: nombre, correo y, si existe, foto de perfil.
> - Tu práctica: los mensajes que escribes, las respuestas del paciente, la fecha y hora, la
>   duración, el número de intervenciones, los tiempos de respuesta y la emoción que el sistema
>   asigna a cada respuesta del paciente.
> - Tu última actividad en la simulación, para cerrar la práctica tras 10 minutos sin uso.
> - La retroalimentación de tu docente: comentario general, comentarios sobre tus frases y nota.
>
> Si eres docente o administrador: nombre, correo, código institucional, rol, estado de la cuenta
> y los casos que creas.
>
> En tu navegador (no en nuestros servidores) guardamos tus preferencias: sonido, ambiente
> emocional, si ya viste la guía de controles y la fecha en que aceptaste este aviso. También
> usamos cookies técnicas para mantener tu sesión iniciada. [Por confirmar: si se usa alguna
> herramienta de analítica.] **[VALIDAR]**
>
> **3. Para qué los usamos** {#finalidad}
>
> - Que practiques la entrevista clínica con el paciente simulado.
> - Que tu docente revise tu práctica, te deje comentarios y una nota, e imprima tu informe de
>   notas.
> - Controlar el acceso: que cada código y cada práctica solo los use su estudiante.
> - Mantener la plataforma funcionando y segura.
>
> [Por confirmar: si se usarán datos anonimizados o agregados en el documento del trabajo de
> grado o en la prueba con usuarios. Si es así, decláralo aquí y pide un consentimiento aparte
> para la prueba.] **[VALIDAR]** No usamos tus datos para publicidad ni los vendemos.
>
> **4. Quién los ve** {#quien}
>
> - **Tu docente** (quien te registró y te asignó la práctica): tus datos, tus conversaciones
>   cuando terminas, tus métricas y la retroalimentación. No ve el chat en vivo.
> - **El administrador de PsySim:** gestiona las cuentas de los docentes y ve cifras de actividad.
>   Como responsable técnico, puede acceder a la base de datos para mantener la plataforma.
> - **Otros estudiantes:** nunca ven tus datos ni tus conversaciones.
>
> **5. Con quién compartimos datos para que el servicio funcione** {#proveedores}
>
> - **Google (Gemini):** recibe cada mensaje de la conversación y las instrucciones del caso para
>   generar la respuesta del paciente. [Por confirmar: el plan de la API que se usa y si Google
>   puede usar estos datos para mejorar sus productos.] **[VALIDAR]**
> - **Google (inicio de sesión):** confirma tu identidad cuando eliges «Continuar con Google».
> - **Supabase:** aloja la base de datos y gestiona las cuentas.
> - **Vercel:** aloja la aplicación web.
>
> Estos proveedores pueden tener servidores fuera de Colombia. [Por confirmar: regiones de los
> servidores y base legal de la transferencia internacional.] **[VALIDAR]**
>
> Te recomendamos no escribir en la conversación datos personales reales, ni tuyos ni de otras
> personas.
>
> **6. Sobre los temas sensibles** {#sensibles}
>
> Los casos tratan temas de salud mental, pero son simulados: lo que dice el paciente no es
> información sobre ti. Lo que escribes es tu intervención como entrevistador. Si decides contar
> experiencias personales, quedarán en la conversación que lee tu docente.
>
> **7. Cuánto tiempo los conservamos** {#conservacion}
>
> Tus datos y tus prácticas se conservan mientras tu docente te tenga registrado. Si tu docente te
> elimina, se borran tus prácticas, conversaciones y retroalimentación, y tu cuenta si ningún otro
> docente te tiene registrado. [Por confirmar: plazo máximo de conservación al terminar el periodo
> académico o el trabajo de grado.] **[VALIDAR]**
>
> **8. Tus derechos** {#derechos}
>
> Según la Ley 1581 de 2012 y el Decreto 1377 de 2013, puedes:
>
> - Conocer, actualizar y corregir tus datos.
> - Pedir prueba de la autorización que diste.
> - Saber cómo se han usado tus datos.
> - Revocar la autorización o pedir que se borren tus datos, cuando no exista un deber legal o
>   académico de conservarlos.
> - Presentar quejas ante la Superintendencia de Industria y Comercio.
> - Acceder gratis a tus datos.
>
> Para ejercerlos, escribe a [correo de contacto por confirmar] **[VALIDAR]** con tu nombre,
> código y la solicitud. Respondemos las consultas en un máximo de 10 días hábiles y los reclamos
> en un máximo de 15 días hábiles, como indica la ley. **[VALIDAR plazos y canal con la
> universidad]**
>
> **9. Tu autorización** {#autorizacion}
>
> Antes de tu primera práctica te pedimos marcar «Leí el aviso de privacidad y acepto que mi
> conversación se procese con Google Gemini y que la lea mi docente». Esa aceptación se guarda en
> tu navegador. Si no quieres aceptarla, no empieces la práctica y habla con tu docente.
> [Por confirmar: si la universidad exige una autorización con registro en el servidor o firmada.]
> **[VALIDAR]**
>
> **10. Cambios en este aviso** {#cambios}
>
> Si cambiamos este aviso, actualizaremos la fecha de arriba y, si el cambio es importante, te lo
> pediremos aceptar de nuevo antes de tu siguiente práctica.

| Clave                    | Texto              |
| ------------------------ | ------------------ |
| `privacidad.volver`      | Volver             |
| `privacidad.irPracticas` | Ir a Mis prácticas |

---

## 6. Decisiones abiertas, validaciones y traspasos

**Validar con el director o la universidad [VALIDAR]:** responsable del tratamiento y correo de
contacto; plan de la API de Gemini y uso de datos por Google; regiones de servidores y
transferencia internacional; plazo de conservación; si basta la aceptación guardada en el cliente
(no deja prueba en el servidor, que es una limitación conocida); uso de datos en el documento y en
la prueba con usuarios; contactos de Bienestar Universitario y línea nacional; nombre del
director; fecha de vigencia del aviso; analítica.

**Suposiciones de diseño que conviene probar:**

- Umbral de 48 h para «Códigos por vencer».
- Excluir `sin_conversacion` de «Por revisar».
- Detección de computador por puntero, hover y ancho, con la salida manual con confirmación.
- ~~La reflexión del cierre no se guarda.~~ Desde el 25-oct-2026 se guarda y la lee el docente.
- Ambiente emocional activado por defecto.
- Ocultar «Cambiar contraseña» a los estudiantes. Las cuentas de prueba `@psysim.test` lo
  pierden; si hace falta, se muestra solo a quien tenga identidad con contraseña.

**Pendiente de implementación (cliente, sin base de datos):**

- Teclas de giro con el teclado para P1-7: la tecla aún no está definida. Se coordina con Vigil y
  se añade a `instrucciones.controles`.
- «Ir directo a la conversación» sin la condición `cerca`.
- Aviso de inactividad por encima del diálogo de instrucciones.
- Cálculo del plazo con `ultima_actividad` en Mis prácticas.

**Fuera del alcance (requiere base de datos):** historial de cambios de nota, reabrir prácticas
cerradas, pausar el reloj en el servidor, mostrar al estudiante sus códigos pendientes y el nombre
del caso antes de usar el código, asignación en lote, notificaciones por correo y registro de la
aceptación de privacidad en el servidor.

**Traspasos:**

- **Vigil (`/fortify`, `/include`):** estados vacíos, error y carga de cada pantalla; lectura con
  lector de pantalla del HUD y del panel en modo reducido; contraste del velo.
- **Rune (`/specify`):** contrato de `estadoVisiblePractica()` (sección 2) y estructura de claves
  del copy deck.
- **Impeccable:** materializar «Nogal y salvia» sobre estos wireframes, sin reabrir la estructura.
