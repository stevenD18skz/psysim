# UX a escala e inmersión de la simulación

Rama `feat/ux-escala-inmersion` (2026-10-18). Continúa el rediseño «Nogal y salvia»
(`docs/rediseno/entrega.md`). Alcance acordado: todo lo que sume experiencia de uso e inmersión,
**sin** evaluación del estudiante por parte de la página (ni autoevaluación, ni retroalimentación
automática, ni rúbricas o métricas de microhabilidades).

## 1. Listas pensadas para un semestre real

Supuesto de diseño: un docente con 30 estudiantes y 6 casos acumula unas **180 prácticas por
semestre**. Sin herramientas, la página de revisiones era una lista interminable.

| Pantalla                 | Qué se añadió                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revisiones (`/sesiones`) | Búsqueda (estudiante, código o caso), filtros por caso y fecha, cinco órdenes (por defecto, la espera más larga), cuatro vistas: lista, por estudiante, por caso y **matriz estudiantes × casos**; paginación de 20; señales de prioridad («Espera N días», «Muy corta», nº de intervenciones); **exportar CSV** con los mismos filtros. Los contadores de las pestañas respetan los demás filtros. |
| Estudiantes              | Búsqueda en la URL, filtros (por revisar, practicando, códigos sin usar, sin prácticas, sin cuenta), orden y páginas de 25.                                                                                                                                                                                                                                                                         |
| Ficha del estudiante     | Prácticas filtradas por estado y paginadas; los códigos usados, anulados o vencidos pasan a un historial plegado (cada código usado ya aparece como práctica).                                                                                                                                                                                                                                      |
| Casos                    | Búsqueda, categoría y nivel; cada ficha dice cuántas veces se asignó y enlaza a sus prácticas por revisar.                                                                                                                                                                                                                                                                                          |
| Docentes (admin)         | Orden y «mostrar todas» a partir de 20 cuentas.                                                                                                                                                                                                                                                                                                                                                     |
| Mis prácticas            | Cada grupo muestra 6 prácticas; las anteriores se despliegan.                                                                                                                                                                                                                                                                                                                                       |

El estado de las listas vive en la URL: volver atrás conserva la vista y el enlace se puede
guardar o compartir. Lógica pura y probada en `src/lib/listas.ts`,
`src/lib/sesiones/revisiones.ts` y `src/lib/estudiantes/lista.ts`.

## 2. Inmersión

### Conversación (lo que más resta realismo según la evidencia)

- Reglas de la IA (`src/lib/ia/reglas.ts`): la extensión sigue a la confianza (antes, máximo
  3 oraciones fijas → respuestas cortas y repetitivas), no contar lo que no se pregunta, llevar
  la cuenta de la confianza, preguntar de vez en cuando como un paciente real, coherencia, y sin
  acotaciones (el cuerpo ya expresa).
- Intensidad de la emoción (1–3) en la etiqueta: escala la expresión del cuerpo y el rostro y el
  peso en el clima del consultorio.
- Constructor de casos: actitudes descritas como **conducta** (estilos de Patient-Ψ, con tres
  nuevos: disperso, complaciente, resistente) y **«Lo que guarda»**: datos con la condición para
  revelarlos. Los seis pacientes de PsySim recibieron ambas secciones (migración
  `20261018020000`).

### Lenguaje no verbal

- Escucha activa: mientras el estudiante escribe, el paciente sostiene la mirada y se aquieta; en
  cada pausa asiente levemente (conductas contingentes del Rapport Agent).
- Silencio: a los 35 s se acomoda y mira esperando; a los 70 s suspira.
- Espera de la IA: tras 3,5 s, relleno del personaje («mmm…», suspiro o cejas) en lugar del
  indicador de puntos.

### Sonido y entorno

- Voz espacial (HRTF) que sale de la cabeza del paciente, reverberación de sala, ventilación,
  tráfico lejano y la puerta que se cierra al empezar.
- Voz del sistema en español (opcional) y dictado con aviso de privacidad (opcional).
- Reloj de pared que marca la hora real (los seis consultorios).
- Hoja de remisión y libreta de notas (solo en el navegador) como paneles flotantes.

### Ensayar otra respuesta

El estudiante vuelve a una intervención y la reformula. Nada se borra: la base de datos marca los
mensajes con `descartado_en` (migración `20261018010000`, función `reformular_desde`), el
paciente deja de recordarlos y el docente los ve plegados en su lugar («reformuló aquí»), además
de «N · M reformuladas» en las intervenciones.

### Normas INACSL

- **Preparación previa (prebriefing):** objetivos de la práctica, acuerdo de ficción, herramientas
  disponibles y seguridad psicológica en la pantalla de instrucciones.
- **Integridad profesional:** transparencia de los intentos reformulados ante el docente.
- **Facilitación y conversación posterior:** siguen siendo del docente (fuera del alcance de la
  página, por decisión del proyecto).

## 2b. Auditoría de Casos, Asignar práctica y Crear caso

Criterio rector: que funcione para un docente **que no sabe escribir instrucciones para una IA**.

| Hallazgo                                                               | Cambio                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Ajustar» en Asignar práctica abría el prompt crudo, en monoespaciado. | **Ajustes guiados**: qué tan fácil se abre, cuánto se le notan las emociones, actitudes adicionales, hasta dos datos que guarda e indicación con las propias palabras (con ejemplos). Un resumen en lenguaje cotidiano dice qué cambiará. El texto completo queda plegado como opción avanzada; si se edita a mano, los ajustes se pausan con aviso. Lógica pura en `src/lib/casos/ajustes.ts`. |
| Las 12 reglas técnicas ocupaban media pantalla en dos lugares.         | «PsySim ya se encarga de esto»: tres garantías en lenguaje llano; las reglas exactas, plegadas.                                                                                                                                                                                                                                                                                                 |
| Sin búsqueda de casos en el paso 1 (crece con los casos propios).      | Buscador por título, paciente o competencia a partir de 7 casos.                                                                                                                                                                                                                                                                                                                                |
| Tarjetas de Asignar sin el paciente (la biblioteca sí lo muestra).     | Foto, nombre y edad del paciente en cada tarjeta.                                                                                                                                                                                                                                                                                                                                               |
| La vista previa del constructor era el texto para la IA.               | **Ficha del paciente** en lenguaje cotidiano, con «Falta: …» en lo pendiente; el texto para la IA queda plegado.                                                                                                                                                                                                                                                                                |
| No decía qué faltaba para guardar.                                     | «Para guardar te faltan N datos», con enlaces que llevan a cada campo; «Todo listo» cuando está completo.                                                                                                                                                                                                                                                                                       |
| Hoja en blanco para quien nunca diseñó un paciente.                    | Tres **casos de ejemplo** completos (duelo, agotamiento laboral, llegada a la universidad) y sugerencias de competencia y de frase de apertura.                                                                                                                                                                                                                                                 |
| «Cancelar» del constructor llevaba a Asignar.                          | Vuelve a Casos (de donde se viene).                                                                                                                                                                                                                                                                                                                                                             |
| Casos de PsySim sin camino para personalizarlos sin escribir.          | «Ajustar a mi medida»: abre Asignar con los ajustes guiados desplegados; desde ahí se guarda como caso propio.                                                                                                                                                                                                                                                                                  |
| Revisiones: con 20 por página la paginación casi no aparecía.          | 10 por página (como la ficha del estudiante); en las vistas agrupadas, 5 prácticas por grupo y enlace a la lista filtrada.                                                                                                                                                                                                                                                                      |

## 3. Verificación (2026-10-18)

- `tsc`, ESLint y build de producción: en verde.
- Vitest: **788 pasan**, 15 omitidas (nuevas: listas, revisiones, lista de estudiantes, intentos,
  reformular, intensidad, escucha activa, voz del sistema, preparación, «Lo que guarda»).
- Playwright: **45 pasan**, 5 omitidas (Sprint 4). Nuevos: revisiones (búsqueda, vistas, matriz,
  CSV) y ensayar otra respuesta de punta a punta con la IA real.
- Sin desborde horizontal a 390 px en las listas nuevas.
- No verificado: audio espacial y voz del sistema con audífonos reales; dictado en Edge.

## 4. Fuentes

- INACSL. _Healthcare Simulation Standards of Best Practice_ (prebriefing, facilitación,
  integridad profesional, debriefing).
- Louie et al. _Can LLM-Simulated Practice and Feedback Upskill Human Counselors?_ CHI '26
  (arXiv 2505.02428).
- _The effect of AI-enabled virtual patient simulation on training outcomes and insecurities in
  psychotherapy education_ (PMC13374200).
- Wang et al. _Patient-Ψ_ (arXiv 2405.19660); _EmoPatient_ (arXiv 2608.07495).
- Gratch et al., Rapport Agent (USC ICT, IVA 2007); Wang & Gratch, CHI 2010.
- Maslych et al., CUI '25; arXiv 2508.11781 (rellenos ante la latencia).
- Pörschmann & Pellegrini, JVRB 2010 (fondo sonoro y reflexiones de sala).
