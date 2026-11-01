# Rendimiento del entorno 3D (HU-28 · T03)

Medición del 31 de octubre de 2026 sobre la build de producción (`pnpm build` + `next start`), con
el navegador usando la GPU real del equipo. El rendimiento web (LCP, CLS, Lighthouse) está en
[`auditoria-rendimiento.md`](auditoria-rendimiento.md).

## Equipo

Representa el caso exigente del proyecto: un computador de escritorio sin tarjeta gráfica dedicada.

| Componente | Valor                                                      |
| ---------- | ---------------------------------------------------------- |
| Procesador | AMD Ryzen 5 5600G (6 núcleos)                              |
| GPU        | AMD Radeon Graphics integrada, 2 GB compartidos            |
| Renderer   | `ANGLE (AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0)` |
| Memoria    | 14 GB                                                      |
| Ventana    | 1366 × 768, el tamaño de laptop común en la tarea de Taiga |

El renderer lo informa el propio navegador en cada corrida: confirma que no se midió por software.

## Resultado

Objetivo del proyecto: al menos 30 FPS con GPU integrada. Promedio de 30 s en cada consultorio.

| Consultorio | FPS promedio | Hasta ver el consultorio | Modelos descargados |
| ----------- | ------------ | ------------------------ | ------------------- |
| E-01        | 73           | 2,1 s                    | 5 GLB, 0,41 MB      |
| E-07        | 73           | 2,7 s                    | 4 GLB, 0,34 MB      |
| E-12        | 73           | 2,3 s                    | 5 GLB, 0,36 MB      |

Los tres consultorios dan la misma cifra porque el navegador sincroniza con la pantalla (75 Hz): 73
FPS es el tope, no lo máximo que da la GPU. E-07 y E-12 se eligieron por usar texturas incrustadas.
No hizo falta ninguna optimización adicional.

**Límite de esta medición:** es una sola sesión, en un solo equipo y sin conversación activa con el
paciente. No sustituye una prueba en los computadores de la sala donde se use la plataforma.

## Cómo repetirla

```bash
pnpm build && pnpm exec next start -p 3100
PLAYWRIGHT_BASE_URL=http://localhost:3100 E2E_GPU_REAL=1 E2E_FPS_MINIMO=30 E2E_CASO=E-01 \
  pnpm exec playwright test e2e/rendimiento.spec.ts --workers=1 --reporter=json
```

`E2E_GPU_REAL=1` abre una ventana visible y usa la GPU del equipo. Sin esa variable, el test renderiza
por software (SwiftShader): sirve de piso en cualquier máquina (13 FPS a 800 × 600), no como medida
de un computador real. La GPU, los FPS, la carga y los modelos quedan en las anotaciones del test.
