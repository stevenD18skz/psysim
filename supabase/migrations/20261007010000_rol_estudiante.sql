-- =============================================================================
-- Rol `estudiante`
--
-- Los estudiantes ahora tienen cuenta propia: el docente los registra con su correo institucional
-- y ellos inician sesión con Google. Va en una migración aparte porque PostgreSQL no permite usar
-- un valor nuevo de un enum en la misma transacción en la que se añade.
-- =============================================================================

alter type public.rol_usuario add value if not exists 'estudiante';
