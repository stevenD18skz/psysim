-- =============================================================================
-- Auditoría del 16 de noviembre de 2026 (docs/auditoria-fable.md): P1-02, P1-03 y P1-05.
--
-- 1. Una función nueva nacía ejecutable por cualquiera. `20261031010000` quitó `anon` de los
--    privilegios por defecto del esquema y `20261107010000` intentó quitar `public`, pero nadie
--    quitó `authenticated`, y lo de `public` no tuvo efecto: Postgres suma los privilegios por
--    defecto de un esquema a los globales, y el `execute` de `PUBLIC` sobre las funciones es
--    global (comprobado en seco: una función nueva nacía con `=X/postgres`). Una función pensada
--    solo para el servidor quedaba al alcance de `supabase.rpc(...)` si su migración olvidaba el
--    `revoke`. Desde aquí nace cerrada, y lo que el navegador puede ejecutar lleva su
--    `grant … to authenticated` escrito (lo vigila `src/lib/seguridad.test.ts`).
-- 2. La secuencia de `peticion_ia.id` conservaba los permisos con los que nació: `revoke all on
--    table` no alcanza a la secuencia de una columna `identity`. Solo la usa
--    `reservar_peticion_ia()`, que es `security definer`.
-- 3. Un código se podía canjear aunque el docente que lo generó estuviera desactivado: la práctica
--    gastaba IA y nadie la iba a revisar. Ahora responde `anulado`, que la aplicación ya conoce.
--    Si el Administrador reactiva al docente, sus códigos vuelven a servir.
--
-- Solo añade: no cambia ninguna firma ni quita permisos que algún código use. Funciona con el
-- código de `main` y con el de `develop`, así que se puede aplicar antes de desplegar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Funciones nuevas cerradas para todos
--
-- El primero es global a propósito (sin `in schema`): es la única forma de quitar el `execute`
-- que `PUBLIC` recibe por defecto. Afecta a las funciones que cree `postgres` en cualquier
-- esquema, también a las de una extensión que se instale después con una migración: si el
-- navegador debe usarlas, hay que concederlas a propósito. Las funciones que ya existen no
-- cambian.
-- -----------------------------------------------------------------------------
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from authenticated;

-- -----------------------------------------------------------------------------
-- 2. La secuencia de `peticion_ia`
-- -----------------------------------------------------------------------------
revoke all on sequence public.peticion_ia_id_seq
  from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. El canje comprueba que el docente siga activo
--
-- Misma función de 20261115020000 con una comprobación más antes de crear la práctica. Retomar
-- una práctica ya creada no cambia: lo que se impide es empezar una nueva.
-- -----------------------------------------------------------------------------
create or replace function public.canjear_codigo(p_codigo text)
returns table (resultado text, sesion_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asignacion public.asignacion%rowtype;
  v_estudiante public.estudiante%rowtype;
  v_estado public.estado_sesion;
  v_sesion uuid;
begin
  if not (select public.es_estudiante()) then
    return query select 'invalido'::text, null::uuid;
    return;
  end if;

  select a.* into v_asignacion
  from public.asignacion a
  where a.codigo = lower(btrim(p_codigo))
  for update;

  if not found then
    return query select 'invalido'::text, null::uuid;
    return;
  end if;

  select e.* into v_estudiante from public.estudiante e where e.id = v_asignacion.estudiante_id;

  -- Un código ajeno se responde igual que uno inexistente.
  if v_estudiante.usuario_id is distinct from (select auth.uid()) then
    return query select 'invalido'::text, null::uuid;
    return;
  end if;

  if v_asignacion.sesion_id is not null then
    select s.estado into v_estado from public.sesion s where s.id = v_asignacion.sesion_id;
    if v_estado = 'en_curso' then
      return query select 'ok'::text, v_asignacion.sesion_id;
    else
      return query select 'usado'::text, v_asignacion.sesion_id;
    end if;
    return;
  end if;

  if v_asignacion.anulada_en is not null then
    return query select 'anulado'::text, null::uuid;
    return;
  end if;

  -- La cuenta del docente se desactivó después de generar el código.
  if not exists (
    select 1 from public.usuario u where u.id = v_asignacion.docente_id and u.activo
  ) then
    return query select 'anulado'::text, null::uuid;
    return;
  end if;

  if v_asignacion.expira_en <= now() then
    return query select 'vencido'::text, null::uuid;
    return;
  end if;

  insert into public.sesion
    (usuario_id, escenario_id, estudiante_id, codigo_estudiante, nombre_estudiante, prompt_sistema,
     duracion_minutos)
  values
    (v_asignacion.docente_id, v_asignacion.escenario_id, v_estudiante.id, v_estudiante.codigo,
     v_estudiante.nombre, v_asignacion.prompt_sistema, v_asignacion.duracion_minutos)
  returning id into v_sesion;

  update public.asignacion set sesion_id = v_sesion where id = v_asignacion.id;

  return query select 'ok'::text, v_sesion;
end;
$$;

comment on function public.canjear_codigo(text) is
  'El estudiante canjea su código de acceso: crea (o retoma) la sesión configurada por el docente, si este sigue activo.';

revoke execute on function public.canjear_codigo(text) from public, anon;
grant execute on function public.canjear_codigo(text) to authenticated;
