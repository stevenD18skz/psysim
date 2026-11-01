# Auditoría de rendimiento web (25 de octubre de 2026)

Revisión de PsySim contra los **Core Web Vitals** de Google (LCP, INP y CLS) y las categorías de
Lighthouse. Se midió sobre la **build de producción** (`pnpm build` + `next start`), no en
desarrollo: el modo de desarrollo compila cada ruta al visitarla y no representa a un usuario.

Se midió de dos maneras, porque responden preguntas distintas:

1. **Chrome real, sin limitar** (`e2e/rendimiento-web.spec.ts`): lo que ve una persona con un
   equipo y una red normales, como la de una sala de la universidad.
2. **Lighthouse, móvil simulado** (CPU 4× más lenta y 4G lento): el peor caso razonable.

Los umbrales «buenos» de web.dev son: LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1. Confirma las cifras
vigentes en [web.dev/vitals](https://web.dev/articles/vitals) antes de citarlas en el documento de
grado.

## 1. Resultado

### Chrome real (producción, sin limitar)

| Página        | LCP    | CLS   | Tareas largas | Veredicto |
| ------------- | ------ | ----- | ------------- | --------- |
| `/` (portada) | 204 ms | 0,000 | 0 ms          | ✅ Bueno  |
| `/login`      | 156 ms | 0,000 | 0 ms          | ✅ Bueno  |
| `/privacidad` | 148 ms | 0,000 | 0 ms          | ✅ Bueno  |

### Lighthouse (móvil simulado, producción)

| Página        | Rendimiento (antes → después) | Accesibilidad | Buenas prácticas | SEO  | LCP simulado (antes → después) | Peso (antes → después) |
| ------------- | ----------------------------- | ------------- | ---------------- | ---- | ------------------------------ | ---------------------- |
| `/` (portada) | 77 → **86**                   | 100           | 100              | 100  | 5,9 s → **4,1 s**              | 830 → **517 KiB**      |
| `/login`      | 86 (sin remedir)              | 100           | 100              | 66\* | 4,2 s (sin remedir)            | 786 KiB (sin remedir)  |
| `/privacidad` | 78 → **87**                   | 100           | 100              | 100  | 5,8 s → **4,0 s**              | 750 → **437 KiB**      |

\* El SEO de `/login` baja a 66 **a propósito**: la página de acceso no debe indexarse
(`robots: noindex`). No es un problema.

El CLS fue **0** en todas las mediciones: ninguna página se mueve mientras carga. El tiempo de
bloqueo (TBT) quedó entre 30 y 100 ms (umbral bueno: ≤ 200 ms). La respuesta del servidor tardó
entre 10 y 30 ms.

**INP** (la respuesta a las interacciones) no se pudo medir en una carga sin interacción; en
Chrome real no se registraron tareas largas, que es lo que lo degrada. La simulación 3D se mide
aparte, con FPS y descarga de modelos (`e2e/rendimiento.spec.ts`, ver `docs/pruebas/sprint-6.md`).

## 2. Hallazgos y qué se hizo

| #   | Sev. | Hallazgo                                                                                                                                                                | Corrección                                                                                                                                        |
| --- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P2   | **El ícono del sitio pesaba 263 KiB** y el navegador lo descarga en la primera visita; las imágenes para compartir en redes, 133 KiB cada una                           | Recompresión con paleta de colores sin cambiar dimensiones: **75 KiB** y **43 KiB** (−70 %). Script reutilizable `scripts/optimizar-imagenes.mjs` |
| 2   | P2   | **Se descargaban tres fuentes (213 KiB)** en cada visita: Archivo `latin`, Archivo `latin-ext` y JetBrains Mono, esta última solo para los códigos                      | Solo `latin` (cubre todo el español) y `preload: false` para la monoespaciada. −85 KiB por página                                                 |
| 3   | P2   | `shadcn` (una herramienta de línea de comandos) estaba en `dependencies` y arrastraba a producción paquetes que no usa la aplicación (un servidor MCP, Express y Hono)  | Pasó a `devDependencies`: esos paquetes y sus vulnerabilidades salen de producción (ver `docs/auditoria-seguridad.md`)                            |
| 4   | P3   | Los **scripts de la página de acceso y del panel** intentaban compilar esquemas de Zod con `new Function`, algo que la política de seguridad de contenido (CSP) prohíbe | Zod sin compilación dinámica en el navegador (`ConfigurarZod`): los formularios validan pocos campos y no la necesitan                            |
| 5   | —    | **Probado y descartado:** inlinar el CSS crítico (`experimental.inlineCss`) no mejoró el LCP (4,4 s) y subió el peso (603 KiB)                                          | Se revirtió                                                                                                                                       |

## 3. Por qué el LCP simulado sigue en 4 s

El elemento más grande es el título (`h1`) de cada página, es decir, texto. En Chrome real aparece
en menos de 250 ms; en el móvil simulado, el título se vuelve a pintar cuando llega la fuente
Archivo (variable, con eje de ancho) por una red 4G lenta, y Lighthouse cuenta ese segundo
pintado. Las opciones serían:

- `font-display: optional` — el título nunca cambia de fuente, pero en una primera visita con red
  lenta se vería con una fuente de respaldo sin el ancho expandido de la marca.
- Mantener `swap` (lo actual) — se prioriza que la identidad visual sea la misma siempre.

Se mantuvo `swap`: el título se lee desde el primer instante (FCP de 1,2 s simulado) y el cambio
de fuente no mueve la página (CLS 0). Si el jurado exigiera un LCP simulado ≤ 2,5 s, el cambio
es una línea en `src/app/layout.tsx`.

## 4. Cómo se vigila

- `pnpm test` incluye `src/lib/rendimiento.test.ts`: ninguna imagen de la aplicación pasa de
  150 KiB, el ícono de 100 KiB y las imágenes para compartir de 80 KiB; solo se descarga el
  subconjunto latino de la fuente; `shadcn` no se instala en producción.
- `e2e/rendimiento-web.spec.ts` mide LCP, CLS y tareas largas en Chrome real contra la build de
  producción (se omite si no se define `PLAYWRIGHT_BASE_URL`; ver su encabezado).
- Lighthouse, para repetir la medición móvil:

  ```bash
  pnpm build && pnpm exec next start -p 3100
  pnpm dlx lighthouse http://localhost:3100/ --only-categories=performance,accessibility,best-practices,seo
  ```

## 5. Pendiente

1. **Medir las pantallas con sesión** (panel del docente, simulación): Lighthouse necesita las
   cookies de la cuenta; la escena 3D tiene su propio presupuesto (`rendimiento.spec.ts`).
2. **Medir en el despliegue de Vercel** (red y CDN reales) en cuanto exista la URL beta.
3. **INP real** con usuarios: se mide con datos de campo (Vercel Speed Insights o el informe de
   experiencia de usuario de Chrome), no con una prueba de laboratorio.
4. **Reemplazar el logo de las imágenes para compartir.** El ícono (`src/app/icon.png`) y las imágenes
   `opengraph-image.png` y `twitter-image.png` usan un personaje de Pokémon (Psyduck), no el
   logo de PsySim. Es un tema de derechos de autor y de imagen, no de rendimiento, pero conviene
   corregirlo antes de publicar la URL beta; después, `node scripts/optimizar-imagenes.mjs` las
   deja livianas.
