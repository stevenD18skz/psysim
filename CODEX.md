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

### Avatares de cuenta

- Estudiantes, docentes y administradores pueden elegir entre 15 avatares en **Cuenta → Cambiar
  avatar**, con vista previa, opción al azar y regreso a las iniciales. La cuenta guarda únicamente
  el identificador en `public.usuario.avatar_id`. [Catálogo](src/lib/avatares/catalogo.ts)
- La migración `20261117020000` quedó aplicada y registrada en el Supabase compartido por staging y
  producción. El guardado devolvía `PGRST204` antes de aplicarla. Después, la API respondió HTTP 200
  al consultar `avatar_id`. [Migración](supabase/migrations/20261117020000_avatares_de_cuenta.sql)
- Pasaron 2.178 pruebas unitarias y la verificación de TypeScript. Se probó el selector en Chromium
  de escritorio y móvil con persistencia simulada. El código de la funcionalidad sigue en el árbol
  de trabajo de `develop`, pendiente de commit y despliegue.

### Avatares en los listados de estudiantes · 18 de noviembre de 2026

- El resumen de estudiantes se completa desde el servidor con `usuario.avatar_id`, usando la
  cuenta vinculada por `estudiante.usuario_id` y los registros permitidos por la consulta
  principal. El registro, las fichas, el inicio y el selector de prácticas usan `AvatarCuenta`.
  Sin avatar seleccionado, se muestran las iniciales. [Consultas](src/lib/estudiantes/queries.ts)
- Se verificó en Chromium con una cuenta de administrador que el avatar Brújula del Estudiante 7
  aparece en Inicio, Estudiantes (escritorio y móvil), la ficha del estudiante, la ficha del docente
  y el selector de prácticas. Pasaron las 2.181 pruebas de Vitest, TypeScript, ESLint y Prettier en
  los archivos comprobados. El usuario confirmó que la corrección funciona.

## Para retomar

- Lee [AGENTS.md](AGENTS.md) y la documentación de Next.js instalada antes de modificar código.
  [README.md](README.md) describe la arquitectura y los comandos del proyecto.
- [La guía del orquestador](docs/orquestador.md#14-prueba-con-el-servicio-real) registra la prueba y
  las verificaciones pendientes con el servicio real. Las pruebas de navegador con IA usan la
  base compartida y consumen cuota. Usa cuentas de prueba y un solo worker.
- Conserva `main` y `develop` como ramas permanentes. La promoción a `main` pasa por una PR con
  los controles de GitHub en verde. Después, sincroniza `develop` con el commit de fusión.
