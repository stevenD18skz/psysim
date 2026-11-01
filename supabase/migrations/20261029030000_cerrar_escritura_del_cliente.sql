-- =============================================================================
-- Auditoría thermo-nuclear (2026-10-29): quita al cliente lo que ya hace el servidor.
--
-- APLICAR SOLO DESPUÉS DE DESPLEGAR el código de la rama fix/auditoria-thermos en todos los
-- entornos que usan esta base de datos (staging y producción). El código anterior inserta los
-- mensajes con el cliente del estudiante y lee el perfil completo de `usuario` con el del
-- usuario: con esta migración aplicada, la conversación dejaría de guardarse y nadie podría
-- entrar.
--
-- 1. El estudiante ya no inserta en `mensaje`. Con su token y la clave publicable podía escribir
--    turnos del paciente desde la consola del navegador; ahora el único camino es
--    `guardar_intercambio` (20261029010000), que solo ejecuta el servidor.
-- 2. El estudiante solo ve el nombre de sus docentes. El permiso de lectura era de la tabla
--    completa y RLS filtra filas, no columnas: con `select=*` leía también el correo, el código
--    institucional y si el docente sigue con la contraseña temporal del Administrador. El perfil
--    completo lo lee el servidor con la clave secreta después de validar la sesión
--    (src/lib/auth/dal.ts).
-- =============================================================================

drop policy "mensaje: el estudiante escribe en su sesión en curso" on public.mensaje;
revoke insert on table public.mensaje from authenticated;

revoke select on table public.usuario from authenticated;
grant select (id, nombre, rol) on table public.usuario to authenticated;
