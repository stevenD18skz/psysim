# Relevo de Codex para PsySim

## Estado al 17 de noviembre de 2026

- Las correcciones de la auditoría de Fable entraron por la PR #31. En Supabase están aplicadas
  las migraciones `20261116010000`, `20261116020000` y `20261117010000`. Auth exige la contraseña
  actual y la reautenticación de sesiones antiguas, y tiene habilitado el aviso de cambio por correo.
- El orquestador de NPC compone su propio prompt con el contexto del escenario. PsySim envía la
  descripción del caso y los ajustes del docente. Las instrucciones de Gemini con etiquetas
  como `[triste 2]` se añaden únicamente al llamar directamente a Gemini.
- El mapeo del orquestador está en la versión 4. Los escenarios nuevos se sincronizan al usarse
  y las sesiones abiertas conservan su escena. PsySim calcula la intensidad de la animación con
  la severidad y conserva la emoción durante cambios pequeños.
- Se probaron tres turnos reales del caso ficticio E-01, «Duelo y pérdida». El orquestador entregó
  el diálogo sin corchetes, informó severidad y tokens, y confirmó el cierre `completed`. Los
  turnos completos tardaron entre 6,9 y 8,6 s. Pasaron 2.146 pruebas unitarias, lint, tipos y formato.

## Para retomar

- Lee [AGENTS.md](AGENTS.md) y la documentación de Next.js instalada antes de modificar código.
  [README.md](README.md) describe la arquitectura y los comandos del proyecto.
- [La guía del orquestador](docs/orquestador.md#14-prueba-con-el-servicio-real) registra la prueba y
  las verificaciones pendientes con el servicio real. Las pruebas de navegador con IA usan la
  base compartida y consumen cuota. Usa cuentas de prueba y un solo worker.
- Conserva `main` y `develop` como ramas permanentes. La promoción a `main` pasa por una PR con
  los controles de GitHub en verde. Después, sincroniza `develop` con el commit de fusión.
