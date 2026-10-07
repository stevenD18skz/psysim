# Modelos 3D (fuentes)

- `muebles/` — mobiliario y decoración (GLB).
- `personajes/` — pacientes y NPC con esqueleto y 13 animaciones. Se sirven directamente desde
  `public` (no se suben al bucket); catálogo en `src/lib/npc/catalogo.ts`.
- `npcs/` — GLB estáticos antiguos, sin esqueleto (ya no los usa ninguna escena).
- `entornos/` — (opcional) salas completas en un solo GLB.

Estos son los archivos originales. La aplicación carga las versiones optimizadas (Draco) desde
Supabase Storage: tras añadir o cambiar un modelo, ejecuta `pnpm modelos:subir`.

Guía completa: [`docs/modelos-3d.md`](../../docs/modelos-3d.md).
