# Variantes de pacientes 3D

El catálogo contiene doce personajes. Los seis nuevos se generan localmente con Three.js
y glTF Transform, sin Blender, descargas de modelos, servicios externos ni cambios a los GLB
originales. Se sirven desde `public/models/personajes/`; no se suben al bucket de muebles.

| Personaje | Caso               | Base técnica | Aspecto                                                      |
| --------- | ------------------ | ------------ | ------------------------------------------------------------ |
| Julián    | E-04, Julián David | Leo          | Pelo ondulado, chaqueta azul y camiseta clara                |
| Hernán    | E-07               | Leo          | Complexión robusta, entradas, canas, bigote y polo vinotinto |
| Yolanda   | E-08               | Lucía        | Trenza baja, blusa verde oliva y pantalón oscuro             |
| Sara      | E-09               | Lucía        | Coleta, buzo lila con capucha y pantalón azul                |
| Daniela   | E-10               | Lucía        | Pelo corto rizado, chaqueta coral y camiseta crema           |
| Paola     | E-11               | Lucía        | Pelo castaño hasta los hombros y blusa azul petróleo         |

Los otros seis casos conservan sus personajes. Las modificaciones de escenas afectan solo a
`npc.personaje`; no cambian datos clínicos, prompts ni identidades de pacientes.

## Regenerar

Desde la raíz del repositorio, con las dependencias instaladas:

```powershell
pnpm npc:generar
```

Equivale a `node scripts/generar-personajes.mjs`. Sobrescribe únicamente los seis archivos
`npc_julian.glb`, `npc_hernan.glb`, `npc_yolanda.glb`, `npc_sara.glb`,
`npc_daniela.glb` y `npc_paola.glb`. Los originales son las fuentes del proceso y deben
conservarse. La generación no depende de variables de entorno ni de aleatoriedad.

Las especificaciones de apariencia y las geometrías nuevas se encuentran en ese script.
Se reconstruyen torsos, cuellos, prendas, detalles y peinados; se conservan las superficies
de cara, ojos y manos de la base. Los pantalones reutilizan la geometría y pesos de Leo,
remapeando sus índices de articulación por nombre al esqueleto de destino. Así mantienen
la superficie de muslo que utiliza el sistema de cinemática inversa al alisarse la ropa.

Cada superficie se compacta por material. No quedan los antiguos morrales, faldas,
cabellos ni adornos ocultos. Los materiales conservan los sufijos que utiliza `RostroNpc`
(`_skin`, `_hair`, `_ink`, `_blush`). El bigote tiene otro material para que no se confunda
con la boca de tinta. El rostro sigue usando la capa procedural existente.

Los esqueletos, matrices de enlace y los datos de los trece clips se conservan de la base:
`idle`, `walk`, `run`, `wave`, `jump`, `dance`, `yes`, `no`, `think`, `celebrate`,
`sleep`, `sit`, `bow`. Sentarse en una silla sigue siendo una adaptación del motor;
no se sustituye el clip original `sit`, que corresponde a sentarse en el suelo.

## Revisar visualmente y regenerar retratos

```powershell
pnpm npc:revisar --manual
pnpm npc:revisar --completo
pnpm npc:revisar --completo --retratos
```

El modo manual abre un servidor de revisión en
`http://127.0.0.1:3101/scripts/npc-preview/index.html` (se detiene con Ctrl+C).
Usa los mismos `ControladorNpc` y `AnimadorPaciente` de la aplicación, con una silla
de referencia. Permite seleccionar los doce personajes, clips, postura y ángulo.
No requiere una sesión de Supabase ni modifica la autenticación de la aplicación.

La captura automática usa Microsoft Edge instalado mediante Playwright. No descarga
un navegador. Si Edge no está disponible, configura un canal instalado en
`scripts/revisar-personajes.mjs`. El puerto 3101 debe estar libre.

Las capturas se guardan en `tmp-capturas/npc/`, carpeta ignorada por Git:

- `*-vistas.png`: frente, perfil y espalda; de pie y sentado.
- `*-clips.png`: muestras de los trece clips al 35 % de su duración.
- `*-paciente.png`: emociones, gestos de clips, contacto con cuerpo/ropa/pelo y habla.

`--retratos` actualiza únicamente los seis WebP correspondientes de `public/pacientes/`,
con primeros planos de 512 × 512. Los retratos no se modifican sin esa opción.
También se pueden revisar personajes específicos: `pnpm npc:revisar julian sara --completo`.

## Comprobaciones

```powershell
pnpm exec vitest run src/lib/npc src/schemas/escena.schema.test.ts
pnpm exec tsc --noEmit
pnpm lint
```

`variantes.test.ts` verifica que las jerarquías, transformaciones, matrices inversas y
canales de animación coinciden con las bases. También comprueba destinos de pistas,
movimiento de vértices en dos instantes de cada clip, valores finitos, pesos normalizados,
geometría distinta de la base y asignación a escenas.

Las pruebas existentes de catálogo, rostro, postura sentada y colisiones de brazos cubren
los doce personajes. Las tolerancias de esas pruebas se conservan.

Las capturas permiten revisar muestras de animación y expresiones; no constituyen una
garantía de ausencia de intersecciones en todos los fotogramas o combinaciones posibles.
La página `/laboratorio/npc` sigue requiriendo la sesión habitual de la aplicación.
