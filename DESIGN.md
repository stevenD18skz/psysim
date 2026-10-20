---
name: PsySim
description: Consultorio 3D en el navegador para practicar la entrevista clínica con un paciente simulado con IA.
colors:
  nogal: '#3a2418'
  nogal-claro: '#4d3221'
  jamba: '#2a190f'
  laton: '#b88a3b'
  laton-claro: '#c99b4b'
  laton-texto: '#d4a85a'
  salvia: '#5f7f63'
  salvia-oscuro: '#3e5a44'
  salvia-suave: '#e2eadf'
  terracota: '#a4472a'
  terracota-suave: '#f3e3db'
  ambar: '#9a5b06'
  ambar-suave: '#f6ead2'
  destructive: '#b42318'
  lino: '#f1f3ee'
  tarjeta: '#fbfcf9'
  tinta: '#1f1b17'
  apagado: '#e7ebe3'
  texto-apagado: '#5a5650'
  borde: '#d5dad0'
  borde-campo: '#858a80'
  menu-texto: '#efe7da'
  menu-apagado: '#bfae99'
typography:
  display:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(2.6rem, 6vw, 3.9rem)'
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: '-0.035em'
    fontVariation: "'wdth' 118"
  headline:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(1.875rem, 4vw, 2.6rem)'
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: '-0.025em'
    fontVariation: "'wdth' 112"
  section:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(1.75rem, 3vw, 2.1rem)'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.02em'
    fontVariation: "'wdth' 112"
  title:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: '-0.015em'
    fontVariation: "'wdth' 112"
  body:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "'lnum'"
  body-sm:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.25
    fontVariation: "'wdth' 82"
  mono:
    fontFamily: 'JetBrains Mono, ui-monospace, monospace'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.33
rounded:
  sm: '6px'
  md: '8px'
  lg: '10px'
  xl: '14px'
  2xl: '18px'
  full: '9999px'
  arco: '999px 999px 0 0'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '20px'
  xl: '32px'
  seccion: '56px'
components:
  button-accion:
    backgroundColor: '{colors.laton}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.lg}'
    padding: '0 16px'
    height: '44px'
  button-accion-hover:
    backgroundColor: '{colors.laton-claro}'
  button-primary:
    backgroundColor: '{colors.nogal}'
    textColor: '{colors.lino}'
    rounded: '{rounded.lg}'
    padding: '0 12px'
    height: '36px'
  button-primary-hover:
    backgroundColor: '{colors.nogal-claro}'
  button-outline:
    backgroundColor: '{colors.tarjeta}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.lg}'
    padding: '0 12px'
    height: '36px'
  button-outline-hover:
    backgroundColor: '{colors.apagado}'
  button-secondary:
    backgroundColor: '{colors.salvia-suave}'
    textColor: '{colors.salvia-oscuro}'
    rounded: '{rounded.lg}'
    padding: '0 12px'
    height: '36px'
  button-destructive:
    backgroundColor: '#b423181a'
    textColor: '{colors.destructive}'
    rounded: '{rounded.lg}'
    padding: '0 12px'
    height: '36px'
  input:
    backgroundColor: '{colors.tarjeta}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.lg}'
    padding: '4px 12px'
    height: '40px'
  input-codigo:
    backgroundColor: '{colors.tarjeta}'
    textColor: '{colors.tinta}'
    typography: '{typography.mono}'
    rounded: '{rounded.lg}'
    height: '48px'
  card:
    backgroundColor: '{colors.tarjeta}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.xl}'
    padding: '20px'
  insignia-en-curso:
    backgroundColor: '{colors.salvia-suave}'
    textColor: '{colors.salvia-oscuro}'
    rounded: '{rounded.full}'
    padding: '2px 10px'
  insignia-pendiente:
    backgroundColor: '{colors.ambar-suave}'
    textColor: '{colors.ambar}'
    rounded: '{rounded.full}'
    padding: '2px 10px'
  insignia-listo:
    backgroundColor: '{colors.salvia-oscuro}'
    textColor: '{colors.lino}'
    rounded: '{rounded.full}'
    padding: '2px 10px'
  menu-nogal:
    backgroundColor: '{colors.nogal}'
    textColor: '{colors.menu-texto}'
    width: '256px'
  menu-elemento-activo:
    backgroundColor: '{colors.nogal-claro}'
    textColor: '#f6efe4'
    rounded: '{rounded.md}'
    height: '44px'
---

# Design System: PsySim

## Overview

**Creative North Star: "Nogal y salvia: la interfaz está hecha con el mobiliario del consultorio"**

PsySim se construye con los materiales del cuarto donde ocurre la práctica. El nogal oscuro con su veta es el armazón: el menú lateral del docente, la barra del estudiante, la franja del inicio público, la cabecera de las instrucciones del caso y la pantalla de carga. El lino salvia pálido es la mesa de trabajo donde viven tablas, registros y formularios. El latón es el herraje: se reserva para la única acción principal de cada vista, para el símbolo de la marca y para el filo de los arcos. La terracota es la voz del paciente y nada más. La forma que se repite es el vano de puerta en arco: enmarca el consultorio 3D en la landing, cada miniatura de escenario, el avatar del paciente en las instrucciones, el panel de marca del ingreso, la pantalla de carga y la página 404.

La densidad es de oficina, no de folleto. Los paneles (modo Operate) heredan del mundo solo el tipo, la paleta, la madera del menú y los arcos; el resto son registros con filetes, filas compactas y una sola acción de latón arriba a la derecha. La landing (modo Persuade) es la única superficie que despliega la madera a sangre y la puerta grande. La voz tipográfica es una sola familia, Archivo, que cambia de ancho según el rol: expandida para identidad y títulos, normal para el trabajo, condensada para metadatos.

Rechazos confirmados en el contrato de dirección: el hero SaaS centrado con captura y fila de beneficios, y el cliché cálido de crema, lámpara y serifa. El rojo institucional anterior quedó como evidencia, no como identidad; la Universidad del Valle aparece como respaldo (logo en placa blanca), nunca como color de marca.

**Key Characteristics:**

- Madera con veta para el armazón; lino salvia para trabajar.
- Una acción de latón por vista; el resto son botones de nogal, contorno o fantasma.
- Terracota exclusiva del paciente; rojo exclusivo de errores y acciones destructivas.
- Una sola familia (Archivo) modulada por su eje de ancho; mono solo para códigos.
- El arco de puerta como silueta recurrente.
- Foco sólido de 2 px que cambia de color según el material (nogal sobre claro, latón claro sobre madera).
- Movimiento lento y respetuoso de «reducir movimiento».

## Colors

Paleta de materiales: madera oscura, herraje de latón, tela salvia, piel terracota, sobre lino pálido; todos los pares de texto superan WCAG AA.

### Primary

- **Nogal** (`nogal`): el armazón. Fondo del menú lateral, de la barra del estudiante, de la franja del inicio, de la cabecera de instrucciones y de la pantalla de carga, siempre con la veta (ver Elevation & Depth). Es también el color `primary` de los botones por defecto, el foco sobre superficies claras, el relleno de los ordinales de reglas y la barra de nivel. Sobre lino da 13:1.
- **Nogal claro** (`nogal-claro`): la cara iluminada de la madera (inicio del degradado de la veta), el hover del botón de nogal y el fondo del elemento activo del menú.
- **Jamba** (`jamba`): la madera en sombra que rodea el vano de la puerta en la landing y la pantalla de carga. Solo para jambas de arco.

### Secondary

- **Latón** (`laton`): el herraje. Relleno del botón `accion` (tinta sobre latón 5,5:1), trazo del arco del símbolo, filo de 2-3 px de los arcos, regla horizontal del registro por etapas, filete bajo la franja del inicio, barra de progreso de carga y color del cursor de texto. La selección de texto lo usa al 35 %.
- **Latón claro** (`laton-claro`): hover del botón `accion` y anillo de foco sobre la madera (5,7:1 sobre nogal).
- **Latón para texto** (`laton-texto`): única variante permitida para texto pequeño de latón sobre la madera (enlaces como «Gestionar docentes» en la franja de administración): 6,6:1 sobre nogal y 5,3:1 sobre nogal claro, ≥4,9:1 en la veta más clara.

### Tertiary

- **Salvia** (`salvia`): la tela del sillón. Punto vivo de «en curso» (con anillo que late solo si se permite movimiento), íconos informativos pequeños (competencia, monitor, escudo de privacidad), primer color de los gráficos.
- **Salvia oscuro** (`salvia-oscuro`): texto sobre salvia suave, insignia «Listo» (lino sobre salvia oscuro), ordinales del registro por etapas, color de éxito.
- **Salvia suave** (`salvia-suave`): globo del estudiante en la conversación, avisos de contenido del caso, contadores del menú, `secondary` y `accent` de shadcn. Salvia oscuro sobre salvia suave da 6,2:1.
- **Terracota** (`terracota`): el paciente. Su nombre en instrucciones, encabezados de sesión y configurador; su cabeza en el símbolo y en la pantalla de carga; el indicador de «escribiendo». 5,8:1 sobre tarjeta.
- **Terracota suave** (`terracota-suave`): fondos que pertenecen al paciente: su primera frase, el fondo de su avatar en el arco, la cabecera del paciente en el configurador.

### Señales

- **Ámbar** (`ambar`) sobre **ámbar suave** (`ambar-suave`), 4,55:1: lo que espera al docente o vence pronto. Insignia «Pendiente» y «Borrador», «Vence…» con menos de 24 h, aviso de inactividad, marca y línea guía del comentario del docente sobre una frase.
- **Rojo** (`destructive`): errores de validación (`aria-invalid`), mensajes de error y acciones destructivas, siempre como texto rojo sobre rojo al 10 % (6,4:1 sobre tarjeta), nunca como relleno sólido.

### Neutral

- **Lino** (`lino`): fondo de toda superficie de trabajo y texto sobre nogal o salvia oscuro.
- **Tarjeta** (`tarjeta`): tarjetas, campos, popovers y diálogos; un paso más claro que el lino.
- **Tinta** (`tinta`): texto principal (15,3:1 sobre lino) y texto sobre latón.
- **Apagado** (`apagado`) y **Texto apagado** (`texto-apagado`): superficies de hover y pies de diálogo; texto secundario a 6,5:1 sobre lino.
- **Borde** (`borde`): filetes de tarjetas, divisores de filas y de la franja de indicadores.
- **Borde de campo** (`borde-campo`): contorno de campos de formulario, 3,16:1 sobre lino (componente no textual, WCAG 1.4.11).
- **Texto del menú** (`menu-texto`, 11,8:1 sobre nogal) y **apagado del menú** (`menu-apagado`, 6,7:1 sobre nogal): texto e íconos inactivos sobre la madera.

### Named Rules

**The One Brass Rule.** El latón marca la única acción principal de cada vista (botón `accion`: «Asignar práctica», «Empezar la práctica», «Entrar», «Tengo un código»). Fuera de esa acción solo aparece en el símbolo de la marca, en el filo de los arcos, en la regla del registro por etapas, en la barra de carga y como señal de lugar en el menú de nogal (ícono de la sección activa). Si una pantalla tiene dos rellenos de latón, una sobra.

**The Patient's Voice Rule.** La terracota pertenece al paciente: su nombre, su rostro, su frase. Ningún botón, estado, error ni decoración la usa.

**The Red Means Wrong Rule.** El rojo aparece solo en errores y en acciones destructivas. El velo emocional de la simulación oscurece hacia nogal o hacia gris azulado, nunca hacia rojo, porque refleja el ánimo del paciente y no evalúa al estudiante.

**The Wood Changes the Ring Rule.** El foco es nogal sobre superficies claras y latón claro sobre la madera; las tarjetas claras dentro de la madera recuperan el nogal. La utilidad de la veta lo hace sola al redefinir el anillo.

## Typography

**Display Font:** Archivo (Omnibus-Type), variable con eje `wdth`, con `ui-sans-serif, system-ui`
**Body Font:** Archivo
**Label/Mono Font:** JetBrains Mono, solo para datos: códigos de acceso (`abc-defg-hij`), códigos de caso (`E-01`), código institucional y teclas de control

**Character:** Una grotesca argentina de ancho variable hace todo el trabajo: abierta y firme cuando habla la marca, neutra cuando se trabaja, estrecha cuando etiqueta. El ancho, no una segunda familia, separa los registros.

### Hierarchy

- **Display** (700, 2,6 → 3,4 → 3,9 rem, interlineado 1,02, −0,035 em, ancho 118 %): solo el titular del inicio público, máximo 16 caracteres por línea.
- **Headline** (700, 1,875 → 2,6 rem, 1,05, −0,025 em, ancho 112 %): el título de cada página de trabajo (encabezado común y saludo de la bandeja).
- **Section** (700, 1,75 → 2,1 rem, −0,02 em): títulos de sección de la landing; 1,7 rem en la cabecera de instrucciones del caso.
- **Title** (700, 1,25 rem, −0,015 em): encabezados de bloque en paneles («Por revisar», «Practicando ahora»), con la cantidad al lado en texto apagado y cifras tabulares.
- **Body** (400, 1 rem, 1,625): texto corrido, máximo 65 ch en respuestas y descripciones (máx. ~42 rem). `body-sm` (0,875 rem) para metadatos de filas, ayudas y pies.
- **Label** (600, 0,875 rem, ancho 82 %): etiquetas de la franja de indicadores, tiempo relativo en registros, ordinales («1 ·»). En mayúsculas con espaciado 0,08-0,12 em solo para las etiquetas de grupo del menú lateral y las cabeceras de tabla.
- **Mono** (500, 0,75 rem en línea; 1,125 rem con espaciado 0,06-0,08 em en el campo de código; 1,875-2,25 rem con 0,12 em en el código recién generado).

### Named Rules

**The Width Is the Voice Rule.** Los encabezados h1-h3 usan ancho 112 % por defecto; la marca y el display, 118 %; los metadatos, 82 %. No se introduce otra familia para lograr contraste.

**The Mono Is Data Rule.** JetBrains Mono solo para cadenas que se copian o se teclean. «Propio» (caso del docente) es una palabra y va en Archivo aunque ocupe el lugar de un código.

**The Title Speaks Alone Rule.** Ningún título lleva etiqueta encima; el contexto va debajo, en la descripción.

## Layout

Contenedores: la landing usa 80 rem (1280 px) para la franja de nogal y 72 rem (1152 px) para el contenido; las páginas de trabajo usan 72 rem con márgenes de 16 px (24 px desde 640 px) y 32-40 px verticales; la hoja de notas imprimible usa el ancho de un A4 (210 mm). Las secciones de la landing respiran 56-64 px; dentro de paneles los bloques se separan 32 px y los elementos 16 px.

Composición: la bandeja del docente es una rejilla de dos columnas asimétricas (1,65 : 1) desde 1024 px; el hero, de 1,05 : 1. El registro por etapas va en cinco columnas sobre una regla de latón de 2 px (dos en 640 px, una en móvil). Las listas son registros: filas con divisores dentro de una sola tarjeta, con una columna fija de fecha (5,5-6,5 rem) a la izquierda.

Responsivo: el encabezado de página usa una consulta de contenedor (`@2xl`, 42 rem), no de ventana, porque con el menú abierto el contenido es más estrecho; las acciones pasan debajo del título según el espacio real. Las tablas se desplazan dentro de su propia caja enfocable. En móvil el menú de nogal se vuelve panel deslizable bajo una barra de nogal pegajosa; en la landing, la barra «Tengo un código» aparece fija abajo solo cuando el bloque del código sale de la vista. `scroll-padding` de 4,5 rem arriba (5,5 rem abajo bajo 768 px) evita que las barras tapen el foco. Sin desborde horizontal a 390 y 768 px.

Impresión: papel blanco aunque se impriman fondos, márgenes A4 de 14 mm, barras y navegación ocultas, cabecera con filete de nogal de 2 px y tablas a ancho completo.

## Elevation & Depth

Profundidad por material, no por capas de sombra: la madera es un plano oscuro con veta (tres degradados repetidos de periodos primos, 37, 61 y 113 px, sobre un degradado vertical de nogal claro a nogal) y las tarjetas de lino se apoyan en ella con sombras largas y difusas. En el lino, las superficies son planas con filete de 1 px; la sombra aparece al pasar el ratón o cuando algo flota sobre el consultorio 3D.

### Shadow Vocabulary

- **Placa de latón** (`box-shadow: 0 1px 0 rgb(255 255 255 / 0.35) inset, 0 1px 2px rgb(58 36 24 / 0.25)`): solo el botón `accion`; un filo de luz que lo hace herraje.
- **Tarjeta sobre la madera** (`box-shadow: 0 24px 48px -24px rgb(0 0 0 / 0.55)`): el bloque de acción del hero.
- **Puerta** (`box-shadow: 0 40px 80px -40px rgb(0 0 0 / 0.7)`; 0 30px 60px -30px rgb(0 0 0 / 0.6) en el ingreso): la jamba del arco grande.
- **Levante al pasar** (`box-shadow: 0 10px 28px -14px rgb(58 36 24 / 0.4)`): tarjetas de escenario en hover, junto con el borde a nogal 40 %.
- **Panel sobre el 3D** (`box-shadow: 0 20px 50px -20px rgb(29 20 14 / 0.55)`): panel de conversación translúcido (tarjeta al 95 % con desenfoque).
- **Barra inferior** (`box-shadow: 0 -8px 24px -12px rgb(0 0 0 / 0.45)`): la barra móvil «Tengo un código».

### Named Rules

**The Flat Linen Rule.** Sobre el lino nada flota en reposo: filete de 1 px y tarjeta un tono más clara. Las sombras son de tono nogal o negro, difusas y con desplazamiento negativo; nunca duras ni desplazadas en diagonal.

## Shapes

Esquinas suaves de 10 px como base (botones, campos), 14 px en tarjetas y registros, 18 px en paneles grandes y diálogos de escenario. Las insignias y contadores son píldoras. La silueta firma es el arco de medio punto (`rounded-t` completo, base recta): vano grande con jamba oscura y filo de latón de 2 px en la landing, filo de latón de 3 px en el ingreso, la carga y el avatar del paciente, filo de nogal al 80 % en las miniaturas de escenario y trazo discontinuo de latón en la 404. Los filetes de 1 px separan, la regla de latón de 2 px ordena un registro, y el borde discontinuo marca lo vacío o lo pendiente (estados vacíos, separador del pie de tarjeta).

## Components

### Buttons

Herrajes y madera: el latón llama, el nogal confirma, el contorno acompaña.

- **Shape:** esquinas suaves (10 px); altura 36 px por defecto, 44 px grande, 32 px pequeña; peso 500 (600 en `accion`).
- **Acción (latón):** latón con tinta y la sombra de placa; hover a latón claro. Una por vista; en la madera puede ir a ancho completo (barra móvil).
- **Primario (nogal):** nogal con texto lino; hover a nogal claro. Confirmaciones secundarias y diálogos.
- **Contorno:** tarjeta con filete; hover a apagado. Sobre la madera, el contorno es lino al 35-40 % y pasa a 70-80 % al pasar («Soy docente», «Ingresar como docente»).
- **Secundario:** salvia suave con texto salvia oscuro. **Fantasma:** sin fondo, hover apagado («Ahora no»).
- **Destructivo:** texto rojo sobre rojo al 10 %, hover al 20 %.
- **Hover / Focus:** transiciones solo de color y sombra; contorno sólido de 2 px a 2 px de separación en el color del anillo del material. Deshabilitado al 50 % de opacidad.

### Chips

- **Insignias de estado:** píldora de 12 px, peso 500: «En curso» salvia suave con punto salvia que late (solo con movimiento permitido), «Pendiente»/«Borrador» ámbar suave, «Listo» salvia oscuro con lino, neutro en apagado.
- **Contadores:** píldora salvia suave con cifra tabular salvia oscuro (menú «Revisiones»); contraído, un punto salvia suave sobre el ícono.

### Cards / Containers

- **Corner Style:** 14 px (18 px en el bloque del hero y paneles grandes).
- **Background:** tarjeta sobre lino; sobre la madera, tarjeta con la sombra larga.
- **Shadow Strategy:** plana en reposo (ver Elevation & Depth).
- **Border:** filete de 1 px; las listas son una sola tarjeta con divisores, no tarjetas sueltas.
- **Internal Padding:** 16 px en filas (14 px vertical), 20-28 px en bloques.

### Inputs / Fields

- **Style:** tarjeta con borde de campo de 1 px (3,16:1), 10 px de radio, 40 px de alto; el campo de código mide 48 px, va en mono con espaciado y lleva ícono de llave a la izquierda.
- **Focus:** borde y contorno sólido de 2 px en el color del anillo, hacia dentro (−1 px de separación).
- **Error / Disabled:** borde rojo y halo rojo al 20 % con `aria-invalid`; deshabilitado al 50 %. Las casillas usan `accent-color` nogal.

### Navigation

- **Menú lateral del docente:** madera con veta, 256 px; marca arriba (contraída, la marca se vuelve el botón de expandir); grupos con etiqueta condensada en mayúsculas; elementos de 44 px con ícono de 18 px en apagado del menú; activo con fondo nogal claro, peso 600 e ícono en latón. Contraído es una columna de íconos con tooltips; en móvil, panel deslizable. La cuenta va al pie, tras un filete blanco al 10 %.
- **Barra del estudiante:** franja de madera pegajosa con la marca, su acción de latón y el menú de cuenta; se oculta al imprimir.
- **Navegación pública:** enlaces de texto lino al 85 % con hover nogal claro; «Soy docente» como píldora de contorno lino.
- **Saltar al contenido:** primer elemento enfocable, latón con tinta y contorno nogal.

### Encabezado de página

Enlace de regreso opcional (chevron + ruta de origen), título headline, descripción en texto apagado (máx. ~42 rem) y acciones a la derecha que bajan por consulta de contenedor.

### Franja de indicadores

Cifras clave como una ficha: una sola tarjeta, etiqueta condensada en texto apagado sobre el valor en 600 con cifras tabulares, celdas separadas por filetes; dos columnas en móvil. Sin íconos y nunca como tarjetas sueltas.

### Vano en arco

Captura real del consultorio dentro de un arco de medio punto. Grande: jamba de 12-14 px con filo de latón de 2 px y la frase del paciente debajo como cita. Miniatura: filo de nogal al 80 % y degradado negro desde abajo para el nombre del paciente en blanco. Avatar: 80 × 96 px, filo de latón de 3 px, fondo terracota suave.

### Registro por etapas

Lista ordenada sobre una regla de latón de 2 px; cada paso lleva el ordinal condensado en salvia oscuro dentro del propio encabezado («1 · Tu docente prepara el caso»).

### Simulación

La interfaz se retira mientras se conversa: panel de conversación translúcido abajo, avatar terracota suave, indicador de «escribiendo» terracota. La pantalla de carga es un arco con jamba, luz cálida, la cabeza terracota y una barra de latón indeterminada (1,4 s). El velo emocional es una viñeta radial que oscurece hacia nogal (tensión) o gris azulado (pesadumbre), cambia en 3 s y respira cada 6 s solo con movimiento permitido; tiene control para desactivarse.

## Do's and Don'ts

### Do:

- **Do** usar el botón `accion` de latón para una sola acción por vista y dejar el resto en nogal, contorno o fantasma.
- **Do** construir toda superficie de madera con la utilidad de veta, que además cambia el anillo de foco a latón claro.
- **Do** usar `laton-texto` para cualquier texto pequeño de latón sobre la madera.
- **Do** reservar la terracota y la terracota suave para el nombre, el rostro y la frase del paciente.
- **Do** mostrar el foco como contorno sólido de 2 px: nogal sobre claro, latón claro sobre madera.
- **Do** modular Archivo con su eje de ancho (118 % marca, 112 % títulos, 82 % metadatos) en lugar de añadir familias.
- **Do** enmarcar el consultorio y al paciente con el arco de medio punto.
- **Do** presentar listas como registros (una tarjeta con divisores) y cifras como franja con filetes.
- **Do** condicionar toda animación a `prefers-reduced-motion: no-preference` (pulsos, entradas, respiración, carga, despliegue de preguntas).
- **Do** verificar AA en cada par nuevo y comprobar 390 y 768 px sin desborde horizontal.

### Don't:

- **Don't** usar latón como relleno de insignias, fondos decorativos o segundas acciones.
- **Don't** usar rojo para el estado emocional del paciente, para la nota ni para nada que no sea error o destrucción.
- **Don't** usar la terracota en botones, estados o decoración.
- **Don't** poner etiquetas en mayúsculas encima de títulos o bloques; el contexto va debajo del título.
- **Don't** usar mono para palabras («Propio») ni para texto corrido.
- **Don't** dar sombra a las tarjetas en reposo sobre el lino ni usar sombras duras desplazadas.
- **Don't** volver al hero SaaS centrado con captura y fila de beneficios, ni al cliché cálido de crema, lámpara y serifa.
- **Don't** usar el rojo institucional como color de marca; la universidad aparece con su logo en placa blanca.

### Pendientes conocidos

- La veta del nogal es un gradiente CSS; falta un recurso raster de madera con procedencia documentada para las superficies grandes.
