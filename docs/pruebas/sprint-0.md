# Registro de verificación — Sprint 0: Infraestructura

- **Fecha:** 2026-09-24
- **Entorno:** Windows 11, Node.js 24.17, pnpm 11.8, Next.js 16.3.6.

| Tarea | Verificación                                                                                                                                                                                                         | Resultado     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| T01   | Repositorio con ramas `main` (producción) y `develop` (integración); `.gitignore` excluye `node_modules`, `.env*`, `.next` y archivos del SO; convención de ramas en el README                                       | ✅            |
| T02   | Next.js 16 + TypeScript + App Router + `src/` + alias `@/`; `pnpm build` sin errores y con verificación de tipos activa; shaders `.glsl/.vert/.frag` importables como texto (raw-loader), modelos en `public/models` | ✅            |
| T03   | Estructura `app/`, `components/`, `components/3d/`, `lib/`, `store/`, `types/`, `schemas/`, `public/models/`                                                                                                         | ✅            |
| T04   | ESLint + Prettier (comillas simples, punto y coma, ancho 100); Husky `pre-commit` (lint-staged + typecheck) y `commit-msg` (commitlint)                                                                              | ✅            |
| T05   | Proyecto de Supabase `PychSims`; `.env.local` con URL, clave publicable y clave secreta; `.env.example` versionado                                                                                                   | ✅            |
| T06   | Clientes `lib/supabase/client.ts` (navegador), `server.ts` (servidor con sesión), `admin.ts` (clave secreta); consulta de prueba desde ambos contextos con `pnpm supabase:test`                                      | ✅            |
| T07   | Proyecto de Vercel conectado a GitHub, producción desde `main`, previews por rama                                                                                                                                    | ✅ (ver nota) |
| T08   | Staging de `develop` accesible (protegido con Vercel Authentication); URL en el README                                                                                                                               | ✅            |
| T09   | Vitest (jsdom) y Playwright configurados; smoke tests en `test/smoke.test.tsx` y `e2e/smoke.spec.ts`                                                                                                                 | ✅            |
| T10   | `AI_API_KEY` en `.env.local`/`.env.example`; `pnpm ai:test` responde en ≈1 s con `gemini-3.5-flash`; URL base y modelo en el README                                                                                  | ✅            |

## Resultados de las suites

| Comando          | Resultado                    |
| ---------------- | ---------------------------- |
| `pnpm lint`      | 0 errores, 0 advertencias    |
| `pnpm typecheck` | 0 errores                    |
| `pnpm test`      | 41/41 tests aprobados        |
| `pnpm test:e2e`  | 12/12 tests aprobados        |
| `pnpm build`     | Build de producción correcto |

> **Nota (T07):** las variables de entorno de Vercel (`NEXT_PUBLIC_SUPABASE_URL`,
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `AI_API_KEY`, `AI_MODEL`) se
> configuran para Production, Preview y Development; las claves secretas se marcan como
> _sensitive_ en Production y Preview.
