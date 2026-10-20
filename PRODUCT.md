# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Estudiante de Psicología** (primario). Practica la entrevista clínica a distancia, desde su
  propio computador y con su cuenta institucional (Google `@correounivalle.edu.co`). Recibe un
  código de acceso de un solo uso de su docente, a menudo por WhatsApp en el celular, entra a una
  simulación 3D, conversa por texto con un paciente virtual y después lee la retroalimentación y la
  nota que publica su docente. Practica bajo evaluación: la ansiedad evaluativa es parte del
  contexto.
- **Docente de Psicología** (primario). Registra a sus estudiantes, prepara cada sesión (elige un
  escenario predefinido o un caso propio, ajusta el comportamiento del paciente y genera el código),
  sigue el estado de las sesiones sin ver el chat en vivo, revisa la conversación terminada,
  comenta frases concretas, publica una retroalimentación con nota (0,0 a 5,0) e imprime las notas.
- **Administrador** (secundario). Gestiona las cuentas de los docentes, usa el laboratorio de
  prototipos y además trabaja como docente.
- **Jurado del trabajo de grado** (audiencia de evaluación, no usuario). Valora por igual el
  impacto visual y el rigor de UX (heurísticas, accesibilidad, decisiones justificadas).

## Product Purpose

PsySim es un simulador web 3D en el que estudiantes de psicología practican la entrevista clínica
con pacientes virtuales conducidos por IA (Google Gemini), en un espacio seguro para equivocarse
antes de atender a personas reales. Es el trabajo de grado de Brayan Steven Narváez Valdés
(Universidad del Valle). El éxito es que el estudiante llegue sin fricción a conversar con el
paciente, entienda las reglas de la práctica y aprenda de la retroalimentación, y que el docente
prepare, siga y califique con poco esfuerzo.

## Positioning

Un consultorio 3D navegable en el navegador, sin gafas ni instalaciones, con un paciente que
escucha, reflexiona y responde en lenguaje natural, cuyo rostro y ambiente reaccionan a la
conversación; el docente diseña el caso y anota frases concretas de la intervención del
estudiante.

## Operating Context

- Flujo a distancia: registro del estudiante → asignación con código (vigencia de 1, 3, 7 o 30
  días) → canje del código en «Mis prácticas» o por enlace `/unirse/<código>` → instrucciones del
  caso → simulación 3D (WASD + ratón con Pointer Lock, tecla E para conversar) → finalización →
  revisión del docente → relectura del estudiante. Detalle en `docs/simulacion-a-distancia.md`.
- La simulación requiere teclado y ratón. En móvil, todo lo 2D debe funcionar; la simulación debe
  avisar con claridad que se abre en un computador (decisión del usuario, 2026-10-17).
- Doce escenarios predefinidos (E-01 a E-12: duelo, ansiedad generalizada, episodio depresivo
  leve, crisis de pánico, conflicto de pareja, estrés académico, consumo de alcohol, trauma por
  desplazamiento, autolesiones en la adolescencia, conducta alimentaria, violencia en la pareja y
  soledad en la vejez) y casos propios del docente.
- Cierre automático de la sesión tras 10 minutos de inactividad, con aviso en el último minuto.
- Se usa en equipos modestos (portátiles de oficina) y conexiones variables.

## Capabilities and Constraints

- Stack existente: Next.js 16 (App Router, `proxy.ts`), React 19, Tailwind CSS 4, shadcn/ui
  (Radix), React Three Fiber, Zustand, Supabase (Auth, PostgreSQL con RLS, Storage), Vercel AI SDK.
- Alcance del rediseño (decisión del usuario, 2026-10-17): interfaz y lógica del cliente. Sin
  migraciones ni cambios en Supabase. Las reglas que exigen la base de datos (historial de cambios
  de nota, reabrir sesiones cerradas) quedan documentadas como pendientes.
- Acceso con Google activo para la defensa: es el camino principal del estudiante. Docentes y
  administradores entran con contraseña (o Google si su correo está habilitado).
- Velo emocional (el ambiente refleja la emoción del paciente): se conserva como inmersión sutil,
  sin rojo de alerta, con control para desactivarlo (decisión del usuario, 2026-10-17).
- Interfaz solo en español de Colombia (`es-CO`).
- El estudiante nunca ve el prompt del caso ni el chat de otros; el docente no ve el chat en vivo.

## Brand Commitments

- Nombre: **PsySim**. Proyecto de grado de la Universidad del Valle.
- Nueva dirección de marca propia para PsySim (decisión del usuario, 2026-10-17): la Universidad
  del Valle aparece como respaldo institucional, no como la identidad dominante. El tema actual
  (rojo institucional, grises cálidos, Source Serif/Sans) es evidencia, no obligación.
- Logo de la Universidad del Valle disponible en `src/components/layout/logo-univalle.tsx`.
- Tono: profesional, cálido y de confianza, propio de un contexto clínico y educativo.

## Evidence on Hand

- Doce escenarios con paciente, competencia, nivel y frase de apertura (`src/lib/escenarios`).
- Escenas 3D y modelos (`public/scenes`, `public/models`, `docs/modelos-3d.md`).
- Registros de pruebas por sprint en `docs/pruebas/`.
- No hay testimonios, cifras de uso ni validación clínica: no se deben inventar.

## Product Principles

1. Equivocarse debe salir barato: la práctica es formativa y el diseño no debe sumar presión.
2. Ninguna regla invisible: lo que puede hacer perder la sesión, el código o la nota se dice antes
   de que ocurra.
3. Transparencia sobre la IA: el estudiante sabe que conversa con una IA, que puede equivocarse y
   quién lee su conversación.
4. Cada rol llega a su tarea principal en un paso y sin jerga técnica.
5. El paciente es el centro de la experiencia; la interfaz se retira mientras se conversa.

## Accessibility & Inclusion

- WCAG 2.2 AA en todas las pantallas 2D, incluido el contraste del color de marca.
- La simulación debe poder recorrerse con teclado y respetar `prefers-reduced-motion`.
- Contenido clínico sensible (duelo, ideación, crisis de pánico): requiere avisos y salidas
  claras.
