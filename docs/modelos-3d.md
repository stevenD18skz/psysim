# Modelos 3D y escenas

Guía para añadir modelos (muebles, pacientes virtuales) y describir la escena 3D de cada
escenario. Cubre HU-09 (carga del escenario) y prepara HU-11/HU-15 (NPC animado, Sprint 3).

## 1. Dónde van los archivos

```
public/models/
├── muebles/   → mobiliario y decoración (sofás, plantas, lámparas, cuadros…)
├── npcs/      → pacientes virtuales (un GLB por personaje)
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

| Campo                 | Descripción                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `sala`                | Medidas y colores de la sala procedural (suelo, paredes, friso, techo).                    |
| `entorno.modelo`      | (Opcional) GLB de la sala completa; reemplaza la sala procedural.                          |
| `mobiliario[]`        | Muebles: `id`, `tipo`, `posicion`, `rotacion`, `escala`, `color`, `colision`.              |
| `mobiliario[].modelo` | (Opcional) GLB del mueble. Sin él —o si falla— se dibuja la versión procedural del `tipo`. |
| `mobiliario[].ajuste` | `{ "alto": m }` o `{ "ancho": m }` y `girar` (°) para normalizar GLB de terceros.          |
| `npc`                 | Posición/rotación del paciente, `postura` (`sentado`/`de-pie`), `modelo`, `animacionIdle`. |
| `camara`              | Posición inicial de los ojos del estudiante, punto al que mira y `fov`.                    |
| `navegacion`          | `limites` (min/max por eje), `radioJugador` y `velocidad` (m/s).                           |
| `iluminacion`         | Color de fondo, luz ambiental, hemisférica, direccional (sombras) y lámparas.              |

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

## 4. Pacientes virtuales: animaciones (necesario para el Sprint 3)

Los 12 personajes de `public/models/npcs/` **no tienen esqueleto ni animaciones** (están en
pose T). Para que el paciente pueda sentarse y reaccionar (HU-11 · T03, HU-15) hay que riggearlos
y añadirles animaciones. Con Mixamo (gratuito) toma ~10 minutos por personaje:

1. **Blender:** _File → Import → glTF_ con el personaje → _File → Export → FBX_.
2. **[mixamo.com](https://www.mixamo.com):** _Upload Character_ con el FBX → coloca los
   marcadores (barbilla, muñecas, codos, rodillas, ingle) → _Next_.
3. Descarga estas animaciones (formato FBX Binary, _In Place_ si aparece):
   - **Idle**: `Sitting Idle` (o `Idle` para pacientes de pie, como E-04) — con _Skin_.
   - **Pensando**: `Sitting Thinking` / `Thinking` — _Without Skin_.
   - **Hablando**: `Sitting Talking` / `Talking` — _Without Skin_.
4. **Blender:** importa el FBX con skin y luego las demás animaciones; en el _Action Editor_
   renombra las acciones a `Idle`, `Pensando` y `Hablando`, y márcalas con _Fake User_.
5. _File → Export → glTF 2.0 (.glb)_ con _Animation → Actions_ activado. Guarda el resultado
   en `public/models/npcs/<nombre>.glb` (sobrescribe el original) y ejecuta
   `pnpm modelos:subir npcs`.

Asignación propuesta de personajes a los escenarios (según edad y estilo):

| Escenario | Paciente          | Modelo   |
| --------- | ----------------- | -------- |
| E-01      | Marta Lucía, 58   | `rosa`   |
| E-02      | Andrés Felipe, 34 | `kwame`  |
| E-03      | Laura Sofía, 26   | `lucia`  |
| E-04      | Julián David, 24  | `yusuf`  |
| E-05      | Carolina, 35      | `ingrid` |
| E-06      | Santiago, 20      | `mateo`  |

Mientras un personaje no tenga animaciones, la escena usa el paciente procedural (sentado o de
pie según `npc.postura`), que ya respira de forma sutil.

## 5. Licencias

Los modelos de `public/models/muebles` provienen de paquetes de terceros (p. ej. Poly Pizza).
Antes de publicar la beta, verifica la licencia de cada modelo usado y añade la atribución que
requiera (CC-BY) en la página de créditos.
