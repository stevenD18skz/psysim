# Rediseño UI/UX · Fase 1: diagnóstico del estado actual («antes»)

Fecha: 17/10/2026 · Rama: `feat/rediseno-ui-ux` · Base: `develop` en `cc7bb77`.

Este documento consolida la línea base del rediseño. Se produjo con los plugins de diseño
instalados en Claude Code: **Intent** (agentes Noor, Ember, Wren y Vigil, con las skills
`journey`, `organize`, `evaluate` e `include`) e **Impeccable** (crítica con dos evaluaciones
aisladas: revisión de diseño y detector automático). Las capturas del estado actual se tomaron con
Playwright en escritorio (1440 px) y móvil (390 px) para los tres roles.

> **Limitación:** no hay investigación con usuarios todavía. Lo que se afirma sobre el
> comportamiento de las personas es hipótesis; lo que se apoya en el código y las migraciones es
> evidencia del sistema. La Fase 1 propone una prueba antes/después (sección 6).

## 1. Decisiones del autor que enmarcan el rediseño

| Tema           | Decisión                                                                            |
| -------------- | ----------------------------------------------------------------------------------- |
| Alcance        | Interfaz y lógica del cliente. Sin migraciones ni cambios en Supabase.              |
| Marca          | Dirección propia de PsySim; la Universidad del Valle como respaldo institucional.   |
| Móvil          | Todo lo 2D funciona; la simulación avisa con claridad que se abre en un computador. |
| Velo emocional | Inmersión sutil, sin rojo de alerta, con control para desactivarlo.                 |
| Acceso         | Google activo para estudiantes en la defensa.                                       |
| Jurado         | Valora por igual impacto visual y rigor de UX.                                      |

## 2. Línea base cuantitativa

**Impeccable (heurísticas de Nielsen, 0–4 por heurística, escala holística):** 25/40, banda
«Aceptable».

| H1  | H2  | H3  | H4  | H5  | H6  | H7  | H8  | H9  | H10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3   | 2   | 3   | 2   | 3   | 3   | 2   | 2   | 3   | 2   |

**Vigil (escala por peor hallazgo: 0 = hay un P0, 1 = hay un P1, 2 = peor P2):**

| H1  | H2  | H3  | H4  | H5  | H6  | H7  | H8  | H9  | H10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0   | 2   | 1   | 2   | 0   | 2   | 1   | 1   | 2   | 0   |

Hallazgos de Vigil por severidad: **P0 = 2 · P1 = 7 · P2 = 11 · P3 = 10.**

Las dos escalas miden cosas distintas: la de Impeccable es una valoración global; la de Vigil
señala la heurística rota por su peor caso. Para la comparación «después» se repetirán ambas con
la misma escala.

**Detector automático de Impeccable:** 4 hallazgos en el código (2 válidos, 1 discutible, 1 falso
positivo) y 11 en el navegador (landing: 1 franja lateral y 6 tarjetas «icono + título»;
paneles: contraste 3,5:1 en las etiquetas del menú lateral).

## 3. Hallazgos críticos (P0 y P1)

| ID    | Hallazgo                                                                                                                                                                                                                                                                                                           | Evidencia                                                                                                                                                                                                                                              | Fuentes                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| P0-1  | **Código gastado sin haber practicado.** Canjear en el celular o «Salir al panel» deja la sesión `en_curso`; el barrido de pg_cron la interrumpe a los 10 min aunque no haya comenzado, y el código es de un solo uso. La interfaz promete lo contrario («la sesión sigue en curso», «continúa donde la dejaste»). | `supabase/migrations/20261008010000_cierre_por_inactividad.sql:19,133-136`; `src/components/simulacion/simulacion-cliente.tsx:173-185`; `src/app/(protected)/(panel)/practicas/page.tsx:50`; `src/app/(protected)/(panel)/unirse/[codigo]/page.tsx:40` | Ember, Wren, Vigil, Noor |
| P0-2  | **Sin aviso de privacidad ni autorización de datos** (Ley 1581 de 2012). La conversación se procesa en Google y la lee el docente.                                                                                                                                                                                 | Ninguna ruta ni enlace de privacidad; `src/components/layout/pie-pagina.tsx`                                                                                                                                                                           | Vigil, Noor              |
| P1-1  | **Regla de inactividad invisible.** El reloj corre con las instrucciones abiertas, aunque `/unirse` dice que el tiempo empieza al confirmarlas. Posible aviso de inactividad tapado por el modal (por verificar).                                                                                                  | `simulacion-cliente.tsx:129-133`; `unirse/[codigo]/page.tsx:36-37`; `instrucciones-caso.tsx:61,78`                                                                                                                                                     | Vigil, Ember             |
| P1-2  | **IA no divulgada en el flujo del estudiante** ni quién lee la conversación.                                                                                                                                                                                                                                       | `instrucciones-caso.tsx:57-63`; `conversation-panel.tsx`                                                                                                                                                                                               | Vigil, Noor, Wren        |
| P1-3  | **Sin aviso de contenido sensible ni recursos de apoyo** (duelo, riesgo, pánico).                                                                                                                                                                                                                                  | Escenarios E-01, E-03, E-04                                                                                                                                                                                                                            | Vigil, Noor              |
| P1-4  | **Modal de instrucciones sin salida.**                                                                                                                                                                                                                                                                             | `instrucciones-caso.tsx:95-99`                                                                                                                                                                                                                         | Vigil, Impeccable        |
| P1-5  | **Nota publicada editable en silencio.** El estudiante sigue viendo la fecha original.                                                                                                                                                                                                                             | `formulario-retroalimentacion.tsx:167-171`; `practicas/[id]/page.tsx:66`                                                                                                                                                                               | Vigil, Ember             |
| P1-6  | **Velo emocional rojo con latido** como señal implícita de desempeño, sin control.                                                                                                                                                                                                                                 | `velo-emocional.tsx:14-31`; `lib/ambiente/clima.ts:92`; `lib/audio/motor-audio.ts:261`                                                                                                                                                                 | Vigil, Noor              |
| P1-7  | **Escena 3D sin alternativa para lector de pantalla y sin giro por teclado.**                                                                                                                                                                                                                                      | `scene-canvas.tsx:48-49`; `use-teclado.ts:6-11`                                                                                                                                                                                                        | Vigil                    |
| P1-8  | **Identidad prestada:** el rojo institucional es el único acento y significa todo (marca, acción, selección, peligro, nivel, palabras del estudiante, nota).                                                                                                                                                       | `src/app/globals.css:63-101`                                                                                                                                                                                                                           | Impeccable               |
| P1-9  | **Landing de un producto anterior:** «Ingresar como docente», «el acceso es para docentes», «repetir el escenario», «prompt», sección «Tecnología».                                                                                                                                                                | `src/app/page.tsx:31,36,46,185,307,353`                                                                                                                                                                                                                | Todos                    |
| P1-10 | **El docente aterriza en un formulario**; lo pendiente de revisar no tiene hogar.                                                                                                                                                                                                                                  | `src/lib/auth/routes.ts:26`; `estudiantes/page.tsx:32-37`                                                                                                                                                                                              | Wren, Ember              |
| P1-11 | **Móvil:** sin aviso de computador; desborde horizontal en Docentes (467 px) y en el informe de notas (576 px).                                                                                                                                                                                                    | Capturas `antes-admin-admin-movil`, `antes-docente-…notas-movil`                                                                                                                                                                                       | Impeccable, Wren         |

## 4. Recorridos: momentos de pérdida

- **Estudiante:** enlace de WhatsApp → login genérico («Bienvenido de nuevo», contraseña dominante)
  → canje sin comprobar dispositivo → instrucciones sin reglas → 3D → conversación (pico real) →
  cierre con métricas técnicas (final débil) → espera sin señales → nota antes que el comentario.
  Hay tres caminos que no convergen: escritorio directo, móvil y luego escritorio (pérdida), y
  salir y volver (pérdida).
- **Docente:** aterriza en «Prepara la simulación»; registra estudiantes de uno en uno; ajusta un
  prompt crudo; genera y comparte el código (buen momento); para revisar debe ir a Estudiantes →
  ficha → sesión; tras publicar no hay «siguiente».
- **Administrador:** su inicio es la última sección del menú; el Laboratorio aparece como
  función del producto.
- **Visitante/jurado:** el único llamado es «Ingresar como docente»; el flujo descrito es el
  presencial antiguo.

## 5. Arquitectura de información propuesta (sin tocar la base de datos)

- **Un nombre por concepto:** Caso → Práctica asignada (con código) → Práctica → Simulación (el
  lugar 3D) → Retroalimentación. «Finalizar sesión» pasa a «Terminar práctica» para no chocar con
  «Cerrar sesión».
- **Docente:** inicio como bandeja (Por revisar · Practicando ahora · Códigos por vencer), páginas
  «Revisiones» y «Casos», «Publicar y abrir la siguiente», compartir el código también desde la
  ficha.
- **Estudiante:** flujo lineal sin menú lateral; «Mis prácticas» por estados con el plazo para
  volver; `/unirse` comprueba el dispositivo antes de canjear.
- **Estados por rol** derivados en el cliente de los campos existentes (misma regla, distinta voz).
- **Landing:** dos puertas (estudiante con Google, docente), el ciclo real y la ficha técnica
  plegada.

## 6. Hipótesis y prueba antes/después (Ember)

| ID  | Hipótesis                                                                               | Criterio de éxito                                    |
| --- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| H1  | Avisar del computador antes del canje y en el mensaje del docente evita gastar códigos. | 0 de 6 canjean en el móvil.                          |
| H2  | Instrucciones con reglas explícitas.                                                    | ≥ 5 de 6 aciertan 4 preguntas de reglas.             |
| H3  | Confirmación honesta al salir.                                                          | ≥ 5 de 6 predicen bien qué pasa.                     |
| H4  | Incorporación al 3D más clara.                                                          | Baja la mediana del tiempo al primer mensaje.        |
| H5  | Relectura centrada en los comentarios.                                                  | ≥ 5 de 6 nombran algo concreto para mejorar.         |
| H6  | Bandeja de pendientes como inicio del docente.                                          | Abre la primera pendiente en < 10 s y 1 clic.        |
| H7  | Aviso al editar una nota publicada.                                                     | 3 de 3 saben que el estudiante ve el cambio.         |
| H8  | Identidad propia y copy coherente.                                                      | Prueba de 5 s: ≥ 4 de 5 dicen qué es y para quién.   |
| H9  | Velo emocional sutil.                                                                   | Nadie lo interpreta como evaluación de su desempeño. |

Protocolo: 5–6 estudiantes y 2–3 docentes, diseño contrabalanceado sobre `main` (antes) y el
preview de esta rama (después), escenarios E-02 y E-05, SEQ por tarea, SUS indicativo,
consentimiento escrito y contacto de Bienestar Universitario a mano. La línea base debe medirse
antes de desplegar el rediseño.

## 7. Qué conservar

Accesibilidad del chat (log + región `polite` única, IME, foco), recuperación de errores del
paciente, aviso de inactividad de 60 s, confirmaciones con consecuencia explícita, `/unirse` que
exige confirmar, borrador → publicar, pantalla de carga con `progressbar`, estados vacíos con
salida, login accesible, `aria-current` en el menú, respeto existente a
`prefers-reduced-motion`, rendimiento adaptativo del 3D, pista bajo la mira, anotación de frases
numerada, y el núcleo con autoría: consultorio cálido, rostro con expresiones y estado
«Pensando».

## 8. Fuera del alcance (pendiente de base de datos)

Historial de cambios de nota, reabrir prácticas interrumpidas, pausar el reloj de inactividad en
el servidor, mostrar al estudiante sus códigos pendientes, asignación en lote del lado del
servidor y notificaciones por correo.
