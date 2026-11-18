-- =============================================================================
-- Auditoría del 16 de noviembre de 2026 (docs/auditoria-fable.md): P3-01.
--
-- Modo presencial: el docente entrega su computador a un estudiante. PsySim cierra la sesión del
-- docente, pero no la de Google de ese navegador: el estudiante podía volver al acceso, pulsar
-- «Continuar con Google» y elegir la cuenta del docente, que no pide contraseña. Lo único que lo
-- impedía era una cookie del mismo navegador que el estudiante tiene en las manos.
--
-- `usuario.entrega_hasta` guarda la entrega en el servidor: hasta esa hora, la cuenta que entregó
-- el equipo no entra con Google (exista o no la cookie) y recupera el acceso con su correo y su
-- contraseña, que es lo que demuestra que quien entra es el docente. Entrar con contraseña la
-- borra.
--
-- Solo la escribe y la lee el servidor con la clave secreta: `authenticated` solo tiene `select`
-- sobre `id, nombre, rol`, así que la columna nueva no queda al alcance del navegador.
--
-- Solo añade una columna que el código anterior no conoce: funciona con el de `main` y con el de
-- `develop`. El código nuevo requiere la columna para iniciar una entrega.
-- =============================================================================

alter table public.usuario
  add column entrega_hasta timestamptz;

comment on column public.usuario.entrega_hasta is
  'Modo presencial: hasta cuándo la cuenta no entra con Google porque entregó su equipo a un estudiante. Entrar con contraseña la borra. Solo la escribe el servidor.';
