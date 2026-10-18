# Rediseño UI/UX de PsySim: informe de entrega

Fecha: 18/10/2026 · Rama: `feat/rediseno-ui-ux` (desde `develop` en `cc7bb77`) · Estado: **sin commit**.

Documentos de la serie: [Fase 1 · diagnóstico](fase-1-diagnostico.md) ·
[Fase 2 · flujos y textos](fase-2-flujos-y-copy.md) · [DESIGN.md](../../DESIGN.md) (sistema de
diseño) · [PRODUCT.md](../../PRODUCT.md) (contexto de producto). Capturas antes/después en
[`capturas/`](capturas/).

## 1. Resumen

PsySim pasó de una interfaz genérica con identidad prestada (rojo institucional, plantillas de
tarjetas, landing de otro producto) a un mundo propio, **«Nogal y salvia»**: un consultorio cálido
con armazón de madera de nogal, fondo lino salvia, latón reservado a la única acción principal de
cada pantalla y terracota solo para el paciente. El rediseño se hizo con los plugins instalados,
invocados en cada fase: Intent (Noor, Ember, Wren, Vigil y sus skills) e Impeccable (contexto,
crítica, detector, revisor final y documentador).

| Indicador                                      | Antes (Fase 1)               | Después                                                  |
| ---------------------------------------------- | ---------------------------- | -------------------------------------------------------- |
| Hallazgos Vigil P0 (críticos)                  | 2                            | **0**                                                    |
| Hallazgos Vigil P1 (mayores)                   | 7                            | **2**, ambos abiertos por decisión de alcance (§6)       |
| Contornos de foco visibles en botones y campos | No                           | Sí, sólido de 2 px; también en alto contraste de Windows |
| Rutas con desborde horizontal a 390 y 768 px   | Varias                       | **0** de 26 medidas                                      |
| Detector de Impeccable sobre `src/`            | Con hallazgos                | Limpio                                                   |
| Tests unitarios                                | 756 (741 pasan, 15 omitidos) | 756 (741 pasan, 15 omitidos)                             |
| E2E (Playwright, 2 workers)                    | —                            | **43 pasan**, 5 omitidos por entorno, 0 fallan           |
| `pnpm lint`, `pnpm typecheck`, `pnpm build`    | —                            | En verde                                                 |

> La crítica holística de Impeccable de la Fase 1 (25/40) **no se volvió a puntuar** al final:
> no hay cifra «después» comparable. Se puede correr si se quiere el dato para la defensa.

## 2. Qué cambió y por qué

### 2.1 Identidad y sistema de diseño

- **Mundo propio.** Nogal `#3a2418` con textura de veta en el armazón (menú, barras, cabecera de
  la landing), lino salvia `#f1f3ee` de fondo y tarjetas `#fbfcf9`. La Universidad del Valle queda
  como respaldo institucional (pie, ficha técnica, hoja de notas), no como marca.
- **Una sola acción en latón por pantalla.** La variante `accion` del botón es la única en latón:
  el usuario siempre sabe qué es lo siguiente. El resto de acciones son de contorno o enlaces.
- **Colores con significado fijo:** terracota solo para el paciente (su nombre, su voz), ámbar
  para lo pendiente, salvia para lo resuelto y rojo solo para errores.
- **Tipografía con una sola familia.** Archivo, modulada por su eje de ancho: expandida (118 %) en
  el titular, 112 % en títulos y condensada (82 %) en metadatos. JetBrains Mono solo para códigos.
- **Motivo de firma: el arco de la puerta del consultorio**, presente en el logo, la portada (con
  jamba oscura y filo de latón), las miniaturas de los casos, el retrato del paciente y la pantalla
  de carga, donde la puerta se va llenando de luz.
- **Contraste AA calculado** para cada par (tinta/lino 15,3:1; borde de campo 3,16:1; latón para
  texto sobre veta ≥4,9:1; foco latón claro sobre madera 5,7:1). Todo queda en `DESIGN.md`.

### 2.2 Flujos (propuesta de Wren, Fase 2)

- **Docente: aterriza en una bandeja (`/inicio`)** que responde «¿qué tengo que hacer hoy?»:
  - Por revisar, de lo más antiguo a lo más reciente.
  - Practicando ahora, con la hora del cierre.
  - Códigos sin usar, con «Reenviar».

  Antes aterrizaba en un formulario.

- **Revisiones con cola:** «Publicar y abrir la siguiente», posición «2 de 6 por revisar» y
  enlaces Anterior/Siguiente. Una retroalimentación editada después de publicarse queda marcada
  como «Actualizada el…» para el estudiante (antes cambiaba en silencio).
- **Estudiante: barra superior sin menú lateral** y una sola página, Mis prácticas, agrupada por
  lo que importa: abierta ahora (con su plazo), usar un código, esperando retroalimentación y con
  retroalimentación (con promedio).
- **El código se protege en el celular.** Usar un código crea la práctica y arranca el cierre por
  inactividad, así que en un celular o tableta el formulario no se envía: explica por qué y ofrece
  copiar el enlace o enviárselo por correo. Un portátil táctil mal detectado tiene una salida
  discreta con confirmación. La detección **no depende del ancho**: un computador con zoom o con
  la ventana partida sigue siéndolo (WCAG 1.4.4/1.4.10).
- **Instrucciones del caso honestas y con salida:**
  - Aviso de contenido sensible con recursos de apoyo.
  - Competencia que se practica.
  - Las cinco reglas siempre visibles, incluida la del cierre a los 10 minutos.
  - Divulgación de que el paciente es una IA.
  - Aceptación del aviso de privacidad.
  - «Ahora no» y Escape preguntan «¿Dejarla para después?» y dicen hasta qué hora queda abierta.
- **Salir dice la verdad.** «Salir» no termina la práctica: la confirmación dice la hora concreta
  hasta la que queda abierta y qué pasa si no se vuelve. Coincide con la de Mis prácticas.
- **Cierre de la práctica con tres variantes** (terminada, cerrada por inactividad, sin empezar),
  «Qué pasa ahora» y un campo de reflexión personal.
- **Landing reescrita:**
  - Entrada del código y Google en el primer pliegue.
  - El consultorio real dentro del arco.
  - Registro de las cinco etapas sobre una regla de latón.
  - Galería de casos, revisión frase por frase ilustrada y preguntas frecuentes.
  - En móvil, la barra «Tengo un código» aparece solo cuando el bloque del código sale de la vista.
- **Página de privacidad** (`/privacidad`) con el texto de Wren y marcas visibles «Por confirmar».
- **Herramientas de desarrollo** (antes «Laboratorio») ocultas en el menú de la cuenta del
  Administrador.

### 2.3 Simulación 3D

- **Pantalla de carga como umbral:** la puerta del consultorio se llena de luz con el progreso, con
  consejos de uso.
- **HUD compacto:** sin datos del estudiante (ya están en las instrucciones). Incluye controles
  siempre a mano, el interruptor del ambiente emocional y «Terminar práctica» con confirmación.
- **Velo emocional sutil:** tonos nogal y gris azulado sin rojo de alerta, respiración lenta y un
  interruptor para desactivarlo. El latido de audio solo suena con tensión alta, bajo y sin
  acelerarse. Las partículas se quedan quietas con «reducir movimiento».
- **«Ir directo a la conversación»:** un camino accesible por teclado, sin tener que caminar en 3D.
- **Panel de conversación** con la insignia «IA», burbujas salvia para el estudiante, estado
  «Pensando…» y errores con salida (reintentar o terminar).

### 2.4 Endurecimiento (Fase 4, intent:fortify + intent:include)

- **Inactividad:**
  - «Sigo aquí» responde también al clic de un lector de pantalla o del control por voz.
  - Un latido fallido no detiene los siguientes.
  - Las pestañas abiertas de la misma práctica comparten la actividad (`BroadcastChannel`).
- **Errores de red sin perder trabajo:**
  - Guardar, publicar, empezar, terminar y usar el código muestran el error en la misma pantalla.
  - El comentario del docente se guarda como borrador en la pestaña, con «Recuperarlo» y
    «Descartar».
  - Las redirecciones legítimas de Next se dejan pasar (`unstable_rethrow`).
- **Foco:**
  - Contornos sólidos de 2 px.
  - Latón claro sobre la madera y nogal sobre lo claro.
  - Visibles en el modo de alto contraste de Windows (`outline-hidden`).
  - Las barras pegajosas ya no tapan el elemento enfocado.
  - El foco vuelve a su sitio tras el aviso de inactividad.
- **Lectores de pantalla:**
  - La cuenta atrás se anuncia una vez.
  - La pantalla de carga anuncia el hito, no cada porcentaje.
  - Los enlaces del menú conservan su nombre con el menú contraído.
  - La tabla de notas es una región recorrible con teclado.
- **Movimiento:** todas las animaciones de la aplicación respetan «reducir movimiento».
- **Responsive:** ninguna ruta desborda a 390 ni a 768 px. Los encabezados usan consultas de
  contenedor, así que se adaptan al espacio real con el menú abierto.
- **Hoja de notas imprimible:** verificada como PDF real (Carta, una página, papel blanco aunque se
  impriman los fondos).

### 2.5 Correcciones que no eran del rediseño, pero lo bloqueaban

- **Regresión del commit `cc7bb77`:** al pulsar «Empezar la práctica» el ratón se capturaba solo y
  el estudiante nunca veía la tarjeta que enseña los controles. Ahora la recaptura automática
  ocurre solo al volver de conversar, que era la intención documentada en el código.
- **Trampa de Tailwind 4:** `outline-none` deja la variable del estilo en `none` y
  `focus-visible:outline-2` la hereda, así que el contorno de foco de todos los botones y campos
  era invisible. Se midió en el navegador antes y después.

## 3. Antes y después

Las capturas «después» se tomaron del **build de producción** (`pnpm start`), sin indicadores de
desarrollo. Los pares están en [`capturas/`](capturas/) con el mismo número:

| #                 | Pantalla                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------- |
| 01 · 02           | Landing en escritorio y en móvil                                                          |
| 03                | Entrar                                                                                    |
| 04                | Lo primero que ve el docente al entrar (formulario → bandeja)                             |
| 05                | Revisión de una práctica                                                                  |
| 06 · 07           | Mis prácticas en escritorio y en móvil                                                    |
| 08 · 09 · 10 · 11 | Simulación: instrucciones, explorar, conversación, cierre                                 |
| 12                | Hoja de notas (antes en pantalla; después, el PDF impreso)                                |
| 13                | Panel del Administrador                                                                   |
| 14 · 15           | Solo después: el celular real (emulación táctil) en el enlace y en una simulación abierta |

## 4. Decisiones de diseño justificadas (para la defensa)

1. **Un mundo propio en vez de la paleta institucional.** La Fase 1 midió identidad prestada
   (P1-8) y una landing «de otro producto» (P1-9). El autor eligió «Nogal y salvia» entre tres
   direcciones. La madera y el lino evocan un consultorio, no un trámite, y bajan la ansiedad de
   practicar con un paciente difícil. Univalle respalda sin imponer su rojo, que en un simulador
   clínico se lee como alerta.
2. **Una sola acción en latón.** Reduce la carga de decisión (Hick) y hace predecible «lo
   siguiente» en cada pantalla. Lo que no es la acción principal se ve como secundario.
3. **Bandeja del docente.** El trabajo real del docente es revisar. La pantalla de inicio ordena
   por antigüedad (lo que más espera, primero) y permite revisar en cadena sin volver a la lista.
4. **Proteger el código en el celular.** El estudiante recibe el enlace por WhatsApp, o sea en el
   celular. Usar el código ahí lo gastaba sin poder practicar (P0 de la Fase 1). Ahora el código
   sigue sin usar hasta que se abre en un computador.
5. **Honestidad del plazo.** La regla de los 10 minutos ya existía, pero era invisible (P1-1).
   Ahora se dice antes de entrar, en las instrucciones, al salir y en Mis prácticas, siempre con
   una hora concreta y coherente.
6. **Inmersión sutil con control.** El velo emocional ya no usa rojo ni late como alarma (P1-6),
   y se puede desactivar: la inmersión acompaña, no presiona.
7. **Divulgación de la IA y del contenido sensible.** Ética de la simulación: el estudiante sabe
   que conversa con una IA, de qué trata el caso y a quién acudir si algo le toca de cerca.
8. **Accesibilidad como requisito, no como añadido:** foco visible, lectores de pantalla, teclado
   (con el camino «Ir directo a la conversación»), movimiento reducido y contraste AA calculado.

## 5. Verificación

- **Calidad del código:** `pnpm lint`, `pnpm typecheck` y `pnpm build` en verde con el código final.
- **Tests unitarios:** 741 pasan y 15 se omiten (los del Sprint 4, que se activan solos).
- **E2E:** 43 pasan, 5 se omiten por credenciales o entorno y 0 fallan, en una sola ejecución con
  2 workers.
  - Durante el trabajo hubo fallos por carga del servidor de desarrollo con varios workers;
    en serie siempre pasaron.
  - Los tests se actualizaron al flujo nuevo: bandeja `/inicio`, HUD sin datos del estudiante,
    «¿Dejarla para después?», comportamiento tras «Ajustar», textos de Wren.
- **Revisión visual:**
  - Capturas de todas las rutas por rol en escritorio y móvil.
  - Recorrido completo de la simulación.
  - Medición automática de desborde en 26 rutas a 390 y 768 px.
- **Revisor final de Impeccable** contra el contrato de dirección. Se aplicaron sus arreglos:
  - Filas de Mis prácticas en escritorio.
  - Barra móvil de la landing.
  - Antetítulos prohibidos.
  - Latón fuera de la acción principal.
  - Arco y jamba.
  - Token crema.
  - Plantilla de métricas grandes.
- **intent:vigil, segunda pasada:** P0 = 0, P1 = 2 (abiertos por decisión). Las regresiones que
  encontró en los propios arreglos se corrigieron y verificaron en el navegador:
  - R-1: un error falso al usar el código. Se comprobó que no aparece en el camino feliz.
  - R-2: el borrador solo se recuperaba tras recargar.
  - N-1: foco invisible en alto contraste.
  - N-2: enlaces sin nombre con el menú contraído.
- **Celular con toque real** (emulación Pixel 7, `isMobile` + `hasTouch`): el enlace muestra «Ábrelo
  en tu computador» sin botón para usar el código, y una simulación abierta muestra su aviso.
- **DESIGN.md** y `.impeccable/design.json` escritos por el documentador de Impeccable a partir de
  lo construido.

## 6. Lo que queda pendiente

**Abierto por decisión (declararlo en la defensa):**

- **P1-C (servidor):** el barrido de pg_cron cierra según `ultima_actividad`. Con una caída de red
  prolongada mientras el estudiante interactúa, el servidor puede cerrar una práctica que el
  cliente considera activa. El cliente ya comparte la actividad entre pestañas, reintenta los
  latidos y muestra el cierre si lo detecta. Comprobar la última actividad en la acción de cierre
  es lógica de negocio, que quedó fuera de alcance.
- **P1-F (privacidad):** la aceptación del aviso vive solo en el `localStorage` de cada navegador.
  No hay constancia en el servidor de quién aceptó ni cuándo. Una opción sin migración es guardarla
  en los metadatos del usuario de Supabase.

**Por validar con el director o la institución (marcas «Por confirmar»):**

- Texto de privacidad: responsable, contacto, versión, encargados y transferencia internacional.
- Contacto de Bienestar Universitario.
- La línea nacional de salud mental «192, opción 4», que figura en el aviso de contenido.

**Mejoras menores conocidas:**

- La veta de nogal es un gradiente CSS. El revisor pidió un recurso raster con procedencia, que no
  se pudo producir sin generación de imágenes.
- Girar la cámara con el teclado: las flechas desplazan de lado.
- Avisos de cambios sin guardar al navegar en la revisión. El borrador local lo mitiga en parte.
- Las animaciones de los primitivos de shadcn (diálogo, menú, tooltip) no están condicionadas a
  «reducir movimiento». Las de la aplicación sí.
- En el celular, con una práctica abierta, la píldora «Continuar» de la barra comparte vista con
  «Copiar enlace»: dos acciones en latón.
- Bajo el pliegue, la landing sigue usando tarjetas en la sección de casos (con contenido real).

**Plan de medición** (Fase 1, sin hacer): prueba antes/después con estudiantes y docentes
(tareas, tiempo, errores, SUS).

## 7. Riesgos

- **Detección de dispositivo:** la confirmación de «es un computador» no se revierte, a propósito,
  para no desmontar una escena 3D ya cargada. Un celular al que se le conecta un ratón un momento
  queda tratado como computador durante la visita. Un iPad con trackpad cuenta como computador, lo
  cual es razonable.
- **Dependencia de la IA real:** los E2E de conversación usan Gemini real; su latencia o una
  saturación pueden fallar un test sin que haya un defecto.
- **Datos de prueba:** las capturas y verificaciones crearon códigos con prefijo `dis-` y sesiones
  para el estudiante de prueba en la base de datos de desarrollo (ver §8).

## 8. Lo que no se verificó

- Lectores de pantalla reales (NVDA, VoiceOver) y el modo de alto contraste de Windows. Se razonó
  sobre el código y los estilos calculados, sin escucharlo ni verlo.
- Un celular o tableta físicos: se usó emulación táctil de Playwright.
- El acceso con Google de los estudiantes (no se puede automatizar).
- Pointer Lock y la simulación con IA en un navegador con interfaz (los E2E usan Chromium sin
  interfaz y renderizado por software).
- Varias pestañas reales en paralelo con la misma práctica.
