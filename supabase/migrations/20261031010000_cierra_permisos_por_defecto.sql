-- =============================================================================
-- Revisión de los asesores de Supabase (2026-10-31).
--
-- 1. `peticion_ia` era la única tabla sin `revoke all`: conservaba los privilegios que Supabase
--    concede por defecto a `anon` y `authenticated` en toda tabla nueva. RLS sin políticas ocultaba
--    las filas, pero `truncate` no pasa por RLS. Solo la usa `reservar_peticion_ia()`, que es
--    `security definer`, así que nadie necesita acceso directo.
-- 2. Quita esos privilegios por defecto: una tabla nueva nace cerrada y se abre a propósito, por
--    columnas. Antes, olvidar el `revoke all` no fallaba en ningún lado.
-- 3. Las funciones de trigger `security definer` no se ejecutan por RPC, pero quedaban concedidas a
--    `anon`. Postgres comprueba `execute` al crear el trigger, no al dispararlo: siguen funcionando.
-- 4. Índice para `retroalimentacion.docente_id`, la única clave foránea sin él.
--
-- Solo quita permisos que ningún código usa y añade un índice: funciona con el código anterior y
-- con el nuevo.
-- =============================================================================

revoke all on table public.peticion_ia from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

revoke execute on function public.estudiante_vincular_cuenta() from public, anon, authenticated;
revoke execute on function public.usuario_vincular_registros() from public, anon, authenticated;
revoke execute on function public.mensaje_registrar_actividad() from public, anon, authenticated;
revoke execute on function public.sesion_registrar_metrica() from public, anon, authenticated;

create index if not exists retroalimentacion_docente_id_idx
  on public.retroalimentacion (docente_id);
