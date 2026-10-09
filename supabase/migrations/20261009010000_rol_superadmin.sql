-- =============================================================================
-- Rol `superadmin` (Administrador)
--
-- Gestiona a los docentes (los crea, edita, desactiva o elimina) y además trabaja como docente.
-- Va en una migración aparte porque PostgreSQL no permite usar un valor nuevo de un enum en la
-- misma transacción en la que se añade.
-- =============================================================================

alter type public.rol_usuario add value if not exists 'superadmin';
