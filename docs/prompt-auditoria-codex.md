# Prompt de auditoría de PsySim para Codex

Audita PsySim cuando te confirme que terminé de afinar la interfaz y la experiencia de uso.
Trabaja una pasada a la vez. Al cerrar cada una, actualiza el informe y espera mi orden de
continuar. El objetivo es comprobar que un docente pueda asignar una práctica, que el estudiante
pueda cursarla de principio a fin y que el docente pueda revisar la conversación, poner la nota
y publicar su retroalimentación. Comprueba qué ocurre ante fallos normales de red, de guardado y
del proveedor, además de verificar los recorridos habituales.

## Antes de empezar

- Registra la rama, el SHA y el estado de Git al arrancar. Usa el commit que recoge el trabajo
  terminado de UI/UX. Si hay cambios locales que afectan el alcance, confirma qué versión hay
  que auditar. Si continúas en otra sesión, comprueba que la base sigue siendo la registrada.
- Lee `AGENTS.md`, `CODEX.md`, `CLAUDE.md`, `README.md`, `DESIGN.md`, `docs/manual-de-uso.md` y
  `docs/guia-de-redaccion.md`. Para afirmaciones sobre el comportamiento de Next.js, consulta la
  documentación de la versión instalada en `node_modules/next/dist/docs/`.
- Consulta `docs/orquestador.md`, `docs/estado-del-proyecto.md` y los registros de pruebas cuando
  correspondan. Al final de cada pasada, contrasta tus conclusiones con `docs/auditoria-fable.md`
  y con la auditoría temática pertinente (`docs/auditoria-seguridad.md`,
  `docs/auditoria-ux.md` o `docs/auditoria-rendimiento.md`). Usa estos documentos para comprobar
  correcciones, detectar regresiones y recuperar pendientes con evidencia vigente.

## Cómo auditar

- Trabaja sin subagentes. La auditoría es de solo lectura sobre el proyecto. El único archivo que
  puedes crear o modificar en el repositorio es `docs/auditoria-codex.md`. Usa archivos temporales
  para trazas o pruebas puntuales. Deja las correcciones, commits y despliegues para otra tarea.
- En cada flujo, sigue el estado desde lo que ve la persona hasta la acción o API y el guardado.
  Tras un éxito o un error, verifica qué quedó persistido y qué muestra la interfaz al recargar.
  En el flujo habitual, comprueba también el resultado desde la cuenta del otro rol.
- Reutiliza Playwright y Vitest. Revisa qué hace cada prueba, qué simula y qué valida al final.
  Ejecuta pruebas con datos ficticios en un entorno aislado. Usa un solo worker de Playwright en
  los recorridos que comparten datos y comprueba a qué URL y base apunta cada prueba. Si hace falta
  escribir en la base compartida o consumir cuota de un proveedor real, pide autorización separada.
  Para revisar esa base, limita la comprobación a configuración y metadatos de solo lectura.
- Para seguridad, revisa de forma defensiva los controles en código y configuración. Comprueba
  límites de acceso, validaciones, permisos y manejo de datos a través del llamador y la base.
  Protege las credenciales y los datos de estudiantes en el informe y en las trazas.
- Usa **confirmado** cuando una prueba observada o un camino determinista en el código demuestra
  el fallo. Usa **plausible** cuando falta un dato del despliegue, del proveedor o del entorno.
  Registra las comprobaciones pendientes y las pruebas omitidas. Agrupa por causa raíz y prioriza
  por el impacto y la facilidad de recuperación para docentes y estudiantes.

## Las cinco pasadas

### 1. Recorrido completo de docente a estudiante

Empieza por `e2e/flujo-completo.spec.ts` y recorre el camino en el navegador. El docente configura
un caso, asigna a un estudiante y comparte el código. El estudiante entra desde otra sesión,
canjea el código, acepta las indicaciones, envía una intervención, recibe la respuesta del
paciente y termina. El docente encuentra la práctica, abre la transcripción, anota un fragmento,
guarda un borrador, pone una nota y publica. El estudiante ve la nota, el comentario y la
anotación publicados. Comprueba también el recorrido presencial y la devolución del equipo.

Verifica desde la interfaz el estado en curso, la práctica terminada pendiente de revisión y la
retroalimentación publicada. Comprueba que una práctica con un cierre legítimo pueda pasar a
revisión según las reglas del producto. Señala las diferencias entre el recorrido probado con
proveedor simulado y el recorrido con el proveedor real.

### 2. Conversación, cierres y recuperación

Sigue `/api/npc/chat`, el cliente de conversación, el guardado de intercambios, el orquestador y
Gemini. Empieza por un turno exitoso y sigue el mismo turno si la red se corta antes del primer
fragmento, después de mostrar texto parcial o después de guardar la respuesta. Cubre timeout,
proveedor indisponible, respuesta incompleta, fallo al guardar y recarga o cierre de la pestaña.
Comprueba reintento, doble envío, dos pestañas y cruce de un envío con «Terminar práctica».

- Verifica si el estudiante puede continuar, si se conserva el historial y si aparecen turnos
  duplicados, perdidos o visibles en un solo lugar. Contrasta lo que vio el estudiante, lo que
  quedó en la base y lo que puede consultar después el docente. Revisa qué contexto recibe Gemini
  al tomar el relevo y qué ocurre si también falla el respaldo.
- Comprueba cierre manual, inactividad, tiempo de consulta y gracia, límite de intervenciones y
  cierres de crisis o trato inapropiado. Incluye la regresión del cierre tranquilo del orquestador
  (`success`, motivo ausente o desconocido) y la coherencia entre stream y recuperación. Verifica
  cómo se termina la práctica si la pestaña ya está cerrada y qué estado y métricas ve el docente.
- Contrasta el contrato del orquestador con `docs/orquestador.md` y la especificación disponible.
  Distingue la evidencia obtenida con dobles de prueba de lo comprobado con el servicio real.
  Usa la sección 14 para identificar qué queda pendiente de verificación externa.

### 3. Códigos de asignación, calificación y retroalimentación

- Prueba el código válido desde el enlace y desde el campo de canje. Comprueba copia, formato,
  mayúsculas, espacios, códigos inválidos, anulados, vencidos y ya usados, según lo que soporte
  PsySim. Comprueba el canje por el estudiante asignado, el doble clic o canje simultáneo y lo
  que ocurre si el docente anula mientras se canjea. Verifica que los fallos de creación o canje
  dejen una salida clara y permitan continuar sin duplicar la práctica.
- En la revisión docente, verifica nota con coma decimal y valores límite admitidos, comentario
  general y anotaciones. Prueba guardar, recargar, editar y publicar. Incluye error de guardado,
  reintento y publicación repetida. Comprueba que una revisión fallida conserve el trabajo, que
  el borrador se mantenga privado y que los resultados del estudiante reflejen lo publicado.
  La nota y los comentarios los decide el docente. Revisa que este flujo siga siendo manual.
- Consulta `e2e/configuracion.spec.ts`, `e2e/revisiones.spec.ts` y `e2e/resultados.spec.ts`. Usa
  lo observado en la pasada 1 y céntrate aquí en las variantes, permisos y fallos de persistencia.

### 4. Acceso, datos y operación

Revisa las acciones de servidor y las API que sostienen los flujos anteriores. Comprueba cuenta
y rol activos, pertenencia de prácticas, códigos y revisiones, RLS y grants, funciones SQL y
Storage aplicables. Revisa caducidad de la sesión en medio de una tarea, acceso después de
entregar un equipo presencial y limpieza de notas o borradores locales al cambiar de cuenta.
Comprueba los límites de consumo, los datos enviados a proveedores, los registros de error y la
compatibilidad del esquema compartido con el código de staging y producción. Si falta acceso
para comprobar configuración remota, registra qué conclusión depende de ella.

### 5. UI/UX, accesibilidad y 3D

Vuelve a las pantallas modificadas y a las tareas de las pasadas 1 y 3. Comprueba escritorio y
móvil, teclado, foco en diálogos, mensajes de estado accesibles, estados vacíos, de carga y de
error, botones deshabilitados y recuperación de formularios. Usa `DESIGN.md` y la guía de redacción
para evaluar problemas que afecten la tarea. En el consultorio, comprueba que la conversación siga
usable con WebGL indisponible o lento. Usa las auditorías de UX y rendimiento para elegir mediciones
comparables. Identifica el entorno de cada medición y qué quedó pendiente de revisar con teclado,
lector de pantalla o equipo modesto.

## Informe y cierre

- En `docs/auditoria-codex.md`, registra el SHA, la fecha, los entornos, las pasadas completadas,
  la siguiente pasada y el conteo de hallazgos por severidad. Mantén una tabla de los recorridos
  críticos con resultado, tipo de evidencia y enlace a la prueba o al apartado correspondiente.
- Por pasada, deja el alcance real, las comprobaciones exitosas, los hallazgos y las limitaciones.
  Para cada hallazgo, incluye ID, severidad, estado, `archivo:línea`, escenario, comportamiento
  esperado y observado, causa, impacto, corrección sugerida y prueba de regresión. Para hallazgos
  de seguridad, documenta el control y su efecto con evidencia de revisión defensiva.
- Indica qué hallazgos de Fable siguen abiertos, cuáles se verificaron como corregidos y cuáles
  cambiaron con la versión actual. Separa la evidencia que respalda afirmaciones del documento
  de grado de las comprobaciones que aún faltan.
- Tras cada pasada, resume en el chat lo verificado, los bloqueos o hallazgos principales y la
  ruta del informe. Después de la quinta, deja un veredicto para una práctica real, con cualquier
  bloqueo de uso, pérdida de datos o fallo de publicación primero. Incluye el orden de corrección
  y las pruebas pendientes antes de usar PsySim con estudiantes.
