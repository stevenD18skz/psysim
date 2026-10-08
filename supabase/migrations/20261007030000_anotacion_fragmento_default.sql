-- =============================================================================
-- `anotacion.fragmento` lo calcula siempre el trigger `anotacion_validar`. Con un valor por
-- defecto, el cliente no necesita enviarlo (y no tiene permiso para escribirlo).
-- =============================================================================

alter table public.anotacion alter column fragmento set default '';
