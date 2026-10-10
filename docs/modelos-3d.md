# Modelos 3D y escenas

Guía para añadir modelos (muebles, pacientes virtuales) y describir la escena 3D de cada
escenario. Cubre HU-09 (carga del escenario) y prepara HU-11/HU-15 (NPC animado, Sprint 3).

## 1. Dónde van los archivos

```
public/models/
├── muebles/   → mobiliario y decoración (sofás, plantas, lámparas, cuadros…)
├── personajes/ → pacientes y NPC con esqueleto y 13 animaciones (servidos desde public, §4)
├── npcs/      → GLB estáticos antiguos (sin esqueleto; ya no los usa ninguna escena)
└── entornos/  → (opcional) una sala completa en un solo GLB
```

- Formato: **GLB** (glTF binario). Si tienes FBX/OBJ, conviértelo con Blender
  (_File → Export → glTF 2.0_, formato _glTF Binary_).
- El nombre del archivo puede tener espacios y mayúsculas: el pipeline lo normaliza a
  kebab-case (`Couch Small.glb` → `muebles/couch-small.glb`).
- No hace falta que estén a escala ni centrados: el campo `ajuste` del JSON de escena los
  normaliza (ver §3).

Para ver todos los modelos normalizados a 1 m, con una flecha que marca su frente (+Z):
`pnpm dev` y abre <http://localhost:3000/dev/modelos> (`?carpeta=npcs`, `?q=couch,lamp` para
filtrar). Para revisar una escena sin crear una sesión: <http://localhost:3000/dev/escena/e-01>
(`?camara=x,y,z&mirar=x,y,z` cambia el punto de vista). Ambas rutas solo existen en desarrollo.

## 2. Pipeline: optimizar y subir a Supabase Storage

```bash
pnpm modelos:inspeccionar          # informe: tamaño, dimensiones, triángulos, animaciones
pnpm modelos:inspeccionar npcs     # filtra por carpeta o nombre
pnpm modelos:subir                 # dedup + prune + weld + compresión Draco → bucket modelos-3d
pnpm modelos:subir couch           # sube solo los que coinciden con el filtro
```

`modelos:subir` necesita `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SECRET_KEY` en `.env.local`.
Crea el bucket público `modelos-3d` si no existe y sobrescribe los archivos (idempotente).
Resultado de la primera subida: 111 modelos, **21,5 MB → 4,8 MB** con Draco.

En el navegador, `useGLTF(url, '/draco/')` decodifica Draco con los binarios autoalojados en
`public/draco/` (copiados de `three/examples/jsm/libs/draco/gltf`).

## 3. JSON de escena (`public/scenes/e-XX.json`)

Validado por `src/schemas/escena.schema.ts` (un test comprueba los seis archivos). Unidades en
metros, eje Y arriba, suelo en y = 0, sala centrada en el origen; el estudiante entra por +Z y el
paciente está hacia -Z. Rotaciones en grados.

| Campo                 | Descripción                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sala`                | Medidas y colores de la sala procedural (suelo, paredes, friso, techo).                                                                                                  |
| `entorno.modelo`      | (Opcional) GLB de la sala completa; reemplaza la sala procedural.                                                                                                        |
| `mobiliario[]`        | Muebles: `id`, `tipo`, `posicion`, `rotacion`, `escala`, `color`, `colision`.                                                                                            |
| `mobiliario[].modelo` | (Opcional) GLB del mueble. Sin él —o si falla— se dibuja la versión procedural del `tipo`.                                                                               |
| `mobiliario[].ajuste` | `{ "alto": m }` o `{ "ancho": m }` y `girar` (°) para normalizar GLB de terceros.                                                                                        |
| `npc`                 | Posición/rotación del paciente, `personaje` (§4), `postura` (`sentado`/`de-pie`), `alturaAsiento`, `piernas`, `modelo`/`animaciones` (GLB propio) y `puntoConversacion`. |
| `camara`              | Posición inicial de los ojos del estudiante, punto al que mira y `fov`.                                                                                                  |
| `navegacion`          | `limites` (min/max por eje), `radioJugador` y `velocidad` (m/s).                                                                                                         |
| `iluminacion`         | Color de fondo, luz ambiental, hemisférica, direccional (sombras) y lámparas.                                                                                            |

Tipos de mueble con versión procedural: `sofa`, `sillon`, `silla`, `mesa-centro`,
`mesa-auxiliar`, `escritorio`, `estanteria`, `planta`, `lampara-pie`, `alfombra`, `cuadro`,
`ventana`, `reloj`. El tipo `decoracion` es solo GLB (tazas, libros, lámparas de escritorio).

Ejemplo (planta de terceros normalizada a 1,15 m de alto):

```json
{
  "id": "planta-fondo",
  "tipo": "planta",
  "modelo": "muebles/houseplant-e9ort-ct6js.glb",
  "ajuste": { "alto": 1.15 },
  "posicion": [-2.45, 0, -3.0]
}
```

**Colisiones (HU-10 · T02):** cada mueble con `colision: true` registra su caja delimitadora
(AABB) en el plano XZ, calculada a partir de su geometría real al cargarse. El estudiante es un
círculo de radio `radioJugador` y se desliza a lo largo de los obstáculos. Se eligió frente a
raycasting contra la malla porque funciona igual con muebles procedurales y GLB, y cuesta O(n)
por fotograma con n ≈ 15.

## 4. Pacientes virtuales: personajes con animaciones

Los pacientes son los personajes de `public/models/personajes/` (los mismos del laboratorio,
`/laboratorio/npc`): GLB low poly con el mismo esqueleto y 13 clips (`idle`, `think`, `wave`,
`yes`, `no`, `sit`…). El catálogo está en `src/lib/npc/catalogo.ts` y cada escena elige uno con
`npc.personaje`. Se sirven desde `public` (~350 KB cada uno, no pasan por el bucket).

| Escenario | Paciente          | Personaje | Postura                             |
| --------- | ----------------- | --------- | ----------------------------------- |
| E-01      | Marta Lucía, 58   | `rosa`    | sentada en sillón                   |
| E-02      | Andrés Felipe, 34 | `tomas`   | sentado en sillón                   |
| E-03      | Laura Sofía, 26   | `lucia`   | sentada en sillón                   |
| E-04      | Julián David, 24  | `tomas`   | de pie                              |
| E-05      | Carolina, 35      | `marina`  | sentada en sofá                     |
| E-06      | Santiago, 20      | `leo`     | sentado en silla (piernas dobladas) |

**Sentado.** Los clips están hechos de pie, así que la animación va en dos capas
(`src/lib/npc/postura.ts`): un clip fijo para caderas y piernas sobre el asiento
(`alturaAsiento`: 0,56 en sillón/sofá, 0,49 en silla; `piernas`: `estiradas` sobre el cojín o
`dobladas` colgando por el borde) y los clips del torso sin pistas de piernas, con las manos en
el regazo.

**Lenguaje no verbal** (`src/lib/npc/comportamiento.ts` + `animador-paciente.ts`):

| Momento                         | Qué hace el paciente                                               |
| ------------------------------- | ------------------------------------------------------------------ |
| El estudiante recorre la sala   | Lo sigue con la mirada si está cerca y delante de él.              |
| Se sienta frente a él (1.ª vez) | Saluda con la mano (si vuelve, asiente).                           |
| Escucha (`esperando_input`)     | Busca el contacto visual.                                          |
| Piensa (`procesando`)           | Mano al mentón, desvía la mirada y baja un poco la cabeza.         |
| Responde (`respondiendo`)       | Cabeceos al ritmo del habla; asiente o niega si empieza con sí/no. |
| Fin de la sesión                | Se despide con la mano.                                            |

Encima, la **emoción** de su última respuesta cambia postura, párpados, respiración, inquietud
y contacto visual: `neutral`, `tranquilo`, `triste`, `ansioso`, `abrumado`, `molesto`,
`aliviado`. La IA la elige con una etiqueta al inicio de cada respuesta (`[triste] …`, regla
fija en `src/lib/ia/reglas.ts`); el servidor la quita del texto y la envía como `emocion_npc`. No
se muestra como texto: leerla es parte de la práctica. Para revisarlas sin conversar:
<http://localhost:3000/dev/escena/e-01?estado=procesando&emocion=abrumado> (también con los
selectores de la esquina).

**Rostro** (`src/lib/npc/rostro.ts`). Los GLB traen ojos con hueso y una boca fija, sin cejas.
Sobre ellos se construye, sin tocar el GLB, una cara que cuelga del hueso `head`: cejas, párpados
(casquetes del color de la piel), una boca que se curva y se abre, brillo en los ojos y el rubor
de las mejillas. La boca original se esconde en una copia de la geometría. Los gestos siguen las
unidades de acción de FACS (`POR_EMOCION` en `comportamiento.ts`):

| Emoción   | Rostro                                                                              |
| --------- | ----------------------------------------------------------------------------------- |
| Triste    | Extremo interno de las cejas arriba, párpados caídos, comisuras abajo, ojos húmedos |
| Ansioso   | Cejas levantadas y juntas, ojos muy abiertos, labios estirados                      |
| Abrumado  | Cejas de preocupación, párpados a media asta, boca entreabierta                     |
| Molesto   | Ceño (cejas bajas y juntas), mirada dura, labios apretados, mejillas enrojecidas    |
| Tranquilo | Sonrisa suave, párpados relajados                                                   |
| Aliviado  | Sonrisa, cejas algo levantadas                                                      |

Además: al responder, la boca se abre con la forma de cada vocal siguiendo el mismo plan de
sílabas de la voz inventada (`formaHabla`); al pensar levanta una ceja y tuerce la boca; los
ojos se adelantan a la cabeza y hacen microsacadas; mientras escucha levanta las cejas de vez en
cuando (señal de atención). Si un personaje no tiene la cara esperada, conserva el parpadeo
anterior (escala de los ojos).

**Añadir un personaje:** exporta el GLB con los mismos nombres de huesos y clips, cópialo a
`public/models/personajes/` y agrégalo a `CATALOGO_NPC` (`npc.test.ts` verifica esqueleto y
clips). Si cambia el rostro de un paciente, regenera su avatar con
`node scripts/capturar-rostros.mjs` (ver el script) y las capturas de la página pública con
`node scripts/capturar-escenas.mjs`.

Si el personaje no carga, la escena usa el paciente procedural (sentado o de pie según
`npc.postura`). Sigue siendo posible usar un GLB propio con `npc.modelo` y clips `Idle`,
`Pensando` y `Hablando` (ver `npc.animaciones`).

## 5. Ambiente dinámico y sonido

La sala y el sonido acompañan el **clima emocional** de la conversación: un promedio móvil de las
emociones de las respuestas del paciente en dos ejes, valencia (agradable/desagradable) y
activación (calmada/agitada) — `src/lib/ambiente/clima.ts`. Con el clima neutro la escena queda
exactamente como la describe su JSON; los cambios tardan unos segundos en asentarse.

| Clima                                | Escena 3D                                                                   | Sonido                 |
| ------------------------------------ | --------------------------------------------------------------------------- | ---------------------- |
| Calma (tranquilo, aliviado)          | Luz más cálida y brillante, polvo dorado flotando                           | Viento suave y pájaros |
| Pesadumbre (triste)                  | Luz fría y tenue, bruma, partículas que caen                                | Lluvia                 |
| Tensión (ansioso, molesto, abrumado) | Luz apagada, niebla, partículas oscuras en remolino, viñeta rojiza que late | Zumbido grave y latido |

- Luz y fondo: `Iluminacion`; niebla y partículas: `AmbienteDinamico`; viñeta: `VeloEmocional`
  (CSS sobre el canvas, sin coste de GPU; no late con "reducir movimiento").
- Ventanas: `VistaExterior` dibuja la calle vista desde un segundo piso con un shader de falso
  exterior (la idea del _interior mapping_): cada píxel del cristal lanza un rayo contra planos
  imaginarios detrás de la pared (calle, árboles, edificios, colinas, nubes), así hay paralaje real
  al caminar, sin geometría ni texturas. El tiempo sigue el clima: despejado con la calma, nublado
  con lluvia con la pesadumbre, tormenta con relámpagos con la tensión.
- Sonido: `src/lib/audio/motor-audio.ts`, sintetizado con la Web Audio API (sin archivos). Incluye
  el murmullo de la sala, el tic del reloj, efectos al iniciar, enviar y finalizar, y la **voz
  inventada** del paciente (`src/lib/audio/voz.ts`): sílabas con la entonación de la frase,
  sincronizadas con el texto, con el tono de cada personaje (`voz` en el catálogo) y el ritmo de
  su emoción. El botón del altavoz del HUD lo silencia (se recuerda en el navegador).
- Para revisarlo sin conversar: `/dev/escena/e-01?emocion=abrumado` (el sonido solo suena en
  `/simulacion`, tras el clic en "Iniciar simulación").
- Por ahora siempre está activo. Pendiente: que el docente lo configure por sesión ("ambiente
  dinámico", "voz de los pacientes") y, si se prefiere, reemplazar las capas por grabaciones.

## 6. Licencias

Los modelos de `public/models/muebles` provienen de paquetes de terceros (p. ej. Poly Pizza).
Antes de publicar la beta, verifica la licencia de cada modelo usado y añade la atribución que
requiera (CC-BY) en la página de créditos.
