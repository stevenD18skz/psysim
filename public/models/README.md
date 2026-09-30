# Modelos 3D (fuentes)

- `muebles/` — mobiliario y decoración (GLB).
- `npcs/` — pacientes virtuales (GLB con esqueleto y animaciones `Idle`, `Pensando`, `Hablando`).
- `entornos/` — (opcional) salas completas en un solo GLB.

Estos son los archivos originales. La aplicación carga las versiones optimizadas (Draco) desde
Supabase Storage: tras añadir o cambiar un modelo, ejecuta `pnpm modelos:subir`.

Guía completa: [`docs/modelos-3d.md`](../../docs/modelos-3d.md).
