# Guía de redacción de la interfaz

Cómo habla PsySim. Sirve a quien escriba o corrija un texto de la aplicación: una palabra para
cada cosa, una voz y un patrón para cada tipo de mensaje. Las reglas medibles las vigila
`src/lib/redaccion.test.ts` en cada `pnpm test`; las que dependen de criterio están aquí.

Para quién se escribe: estudiantes de psicología que practican una entrevista (a veces nerviosos,
casi siempre en un computador de la universidad) y docentes con poco tiempo que revisan
conversaciones. Nadie debería necesitar saber cómo funciona la plataforma por dentro.

## 1. Voz

Cuatro rasgos, cada uno con su límite:

| Rasgo       | Es…                                                     | No es…                                                         |
| ----------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| **Sereno**  | Calmado, sin dramatismo, también cuando algo falla      | Frío o burocrático; tampoco alarmista (nada de «¡Atención!»)   |
| **Claro**   | Frases cortas, una idea por frase, verbos concretos     | Técnico («servidor», «token», «API» no salen en la interfaz)   |
| **Cercano** | Habla de «tú», dice «No pudimos…» y «Tu docente leerá…» | Informal o con chistes; nunca «usted», «por favor» ni «¡Hola!» |
| **Honesto** | Dice quién ve qué y qué no se puede deshacer            | Condescendiente («Es muy fácil…») o con rodeos                 |

Una práctica clínica es un momento de exposición. Por eso la voz **no evalúa al estudiante** en
los textos de interfaz: describe («Son datos de la sesión, no una calificación»), no califica.

## 2. Tono según el momento

La voz es la misma; el tono cambia.

| Momento                       | Tono                                 | Ejemplo real                                                                                      |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Preparación (instrucciones)   | Tranquilo y transparente             | «Conversas con una IA (Google Gemini), no con una persona. Puede equivocarse o salirse del caso.» |
| Durante la práctica           | Casi invisible, corto                | «Escuchando», «Pensando…»                                                                         |
| Error recuperable             | Empático y con salida                | «No pudimos guardar tu reflexión: revisa tu conexión e inténtalo de nuevo.»                       |
| Acción que no se deshace      | Serio y explícito                    | «¿Terminar la práctica? No se puede reanudar. Tu docente leerá la conversación…»                  |
| Éxito                         | Breve, concreto, sin celebración     | «Reflexión guardada.», «Caso actualizado.»                                                        |
| Estado vacío                  | Útil: por qué está vacío y qué hacer | «Cuando un estudiante termine una práctica, aparecerá aquí para que dejes tu retroalimentación.»  |
| Tema sensible (riesgo, duelo) | Respetuoso, ofrece salida y apoyo    | «Si algo de esto te toca de cerca, puedes elegir «Ahora no» y hablarlo con tu docente.»           |

## 3. Glosario: una palabra para cada cosa

Si una palabra aparece con dos significados, la persona duda. Estas decisiones las protege el test.

| Concepto                                           | Se dice                                                   | No se dice                                      |
| -------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| El ejercicio completo de un estudiante con un caso | **práctica**                                              | sesión, simulación (como sinónimo), ejercicio   |
| La situación clínica, predefinida o propia         | **caso** («casos predefinidos»)                           | escenario                                       |
| El entorno 3D                                      | **consultorio**                                           | escenario, sala, mundo                          |
| El personaje con quien se conversa                 | **el paciente** (o «paciente simulado con IA» al aclarar) | paciente virtual (salvo en la portada y el SEO) |
| La cuenta abierta en el navegador                  | **sesión** («Cerrar sesión», «Iniciar sesión»)            | —                                               |
| Quien enseña / quien practica                      | **docente** / **estudiante**                              | profesor, tutor / alumno, usuario               |
| La clave de un solo uso para entrar a una práctica | **código** (de acceso)                                    | token, clave, enlace mágico                     |
| Dejar de practicar                                 | **terminar** la práctica                                  | finalizar, cerrar (salvo «Cerrar sesión»)       |
| Salir sin terminar                                 | **salir**                                                 | abandonar                                       |
| Lo que escribe el estudiante en el chat            | **intervención**                                          | input, mensaje (en las métricas)                |
| Lo que el docente deja al estudiante               | **retroalimentación**                                     | feedback, devolución                            |

La portada y los metadatos sí dicen «pacientes virtuales de IA»: es lo que la gente busca. Dentro
de la aplicación, el término es «paciente».

## 4. Patrones

### Errores: qué pasó y qué hacer

1. **Qué pasó**, en primera persona del plural: «No pudimos guardar el caso.» Nunca «No fue
   posible…», «No se pudo…», «Ocurrió un error» ni un código.
2. **Qué hacer**, con un verbo: «Inténtalo de nuevo», «Revisa tu conexión», «Pide un código nuevo a
   tu docente». Si no hay nada que hacer, se dice con honestidad.
3. **Qué no se perdió**, solo si tranquiliza: «Tu práctica sigue abierta mientras no pasen 10 minutos
   sin actividad.»
4. **Sin culpar:** «Ese código no es tuyo» y no «Código inválido»; «Parece que ese correo no es
   institucional» y no «Correo incorrecto».
5. Los detalles técnicos van al registro del servidor, no a la pantalla.

### Botones

- Verbo + objeto, en la voz de quien actúa: «Guardar reflexión», «Asignar otra práctica», «Terminar
  práctica». Nunca «Aceptar», «OK» ni «Enviar» a secas cuando hay una frase más exacta.
- Una acción principal por pantalla; la salida se llama por lo que hace: «Seguir practicando»
  junto a «Terminar práctica».
- La acción que no se deshace nombra su consecuencia: «Sí, eliminar», «Terminar práctica».

### Confirmaciones

Título con la pregunta («¿Terminar la práctica?»), cuerpo con la consecuencia («No se puede
reanudar…»), botón con el verbo («Terminar práctica») y una salida clara («Seguir practicando»).

### Estados vacíos

Explican por qué está vacío y qué hace falta para llenarlo. Ejemplo: «No tienes nada pendiente por
ahora.» (Inicio, sin revisiones). Nunca solo «No hay datos».

### Éxito

Concreto y breve: qué quedó hecho. «Reflexión guardada.» es mejor que «¡Listo!» y que «Operación
exitosa».

### Espera

Con el verbo en gerundio y puntos suspensivos de un solo carácter: «Guardando…», «Abriendo el
consultorio…».

## 5. Estilo

- **Mayúscula solo en la primera palabra** de títulos y botones («Asignar práctica», no «Asignar
  Práctica»).
- **«…»** (un carácter) y no tres puntos. **«Comillas angulares»** para citar un botón o un nombre.
- **Sin signos de exclamación.** La interfaz no grita ni celebra.
- **Números en cifras** («10 minutos», «3 prácticas») y plurales completos («1 práctica», «3
  prácticas»); nada de «práctica(s)».
- **Fechas y horas** con `Intl` en `es-CO` (nunca con texto armado a mano).
- **Frases de menos de 25 palabras** y voz activa («Tu docente leerá la conversación», no «La
  conversación será leída»).
- **Inclusión:** se habla de «tu docente» y «el estudiante» sin asumir género; no se usa «@», «/a»
  ni «(a)».
- **Lectores de pantalla:** todo ícono sin texto lleva `aria-label`; los textos suenan bien leídos
  en voz alta, sin símbolos sueltos.

## 6. Cómo se vigila

`src/lib/redaccion.test.ts` revisa todo el texto que ve una persona (texto de JSX, `toast`,
`aria-label`, `placeholder`, mensajes de error) y falla si aparece, por ejemplo, «No fue posible»,
«escenario», «profesor», «usuario», «paciente virtual», una exclamación, tres puntos, «Title Case»,
«usted», «por favor» o una «sesión» que no sea la de la cuenta. También exige que todo «No
pudimos…» diga qué hacer.

Lo que ese test **no** puede juzgar (si un texto es claro, si el tono es el adecuado) se revisa
con esta guía al agregar o cambiar una pantalla. Cuando una excepción sea legítima (el aviso legal
o los diálogos de los pacientes), se declara en el propio test, con su motivo.

## 7. Pendiente

- **Texto fuera de las pantallas:** los correos o mensajes que el docente copia para enviar el
  código (`boton-compartir.tsx`) y el contenido de los 12 casos se redactaron aparte; conviene
  revisarlos con la misma guía.
- **Prueba con personas:** comprobar con 3 a 5 estudiantes que «práctica», «caso» y «consultorio» se
  entienden sin explicación.
- **Internacionalización:** los textos están escritos en el código (no en un catálogo). Si el
  proyecto saliera del español, habría que extraerlos; las reglas anteriores (sin frases armadas
  por concatenación, plurales completos) lo harían menos costoso.
