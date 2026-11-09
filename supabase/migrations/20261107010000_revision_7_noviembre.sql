-- =============================================================================
-- Revisión del 2026-11-07.
--
-- 1. `guardar_intercambio` cuenta el tope de 150 intervenciones igual que /api/npc/chat: también
--    las reformuladas, que ya gastaron una llamada a la IA. Antes la ruta y la función contaban
--    distinto y, con reformulaciones, la función dejaba pasar lo que la ruta ya rechazaba.
-- 2. El estudiante solo termina (`finalizada`) una práctica que comenzó. Antes podía marcar como
--    terminada, desde la consola, una práctica cuyas instrucciones ni siquiera leyó; el docente la
--    vería como una práctica real sin intervenciones. Cerrarla por inactividad (`interrumpida`)
--    sigue permitido en cualquier momento.
-- 3. El correo de un registro de estudiante no cambia si ya tiene prácticas. El historial sigue al
--    correo (trigger `estudiante_vincular_cuenta`): con el permiso `update (correo)` un docente
--    podía pasar, desde la consola, las prácticas de un estudiante a la cuenta de otro. La
--    aplicación ya lo impedía (src/lib/estudiantes/actions.ts); ahora también la base de datos.
--    Agregar el primer correo a un registro antiguo sigue permitido.
-- 4. Las funciones nuevas nacen sin `execute` para `public` (y por lo tanto para `authenticated`):
--    se conceden a propósito, como las tablas desde 20261031010000.
--
-- Solo añade o endurece reglas que el código actual ya cumple: funciona con el código desplegado
-- en `main` y en `develop`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tope de intervenciones con las reformuladas
-- -----------------------------------------------------------------------------
create or replace function public.guardar_intercambio(
  p_sesion_id uuid,
  p_mensaje text,
  p_respuesta text,
  p_emocion text,
  p_latencia_ms integer,
  p_tokens_entrada integer,
  p_tokens_salida integer
)
returns table (id_estudiante uuid, id_npc uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_intervenciones constant integer := 150;
  v_estado public.estado_sesion;
  v_comenzada boolean;
  v_intervenciones integer;
begin
  select s.estado, s.comenzada into v_estado, v_comenzada
    from public.sesion s
   where s.id = p_sesion_id
     for update;

  if not found then
    raise exception 'La sesión no existe.' using errcode = 'P0002';
  end if;
  if v_estado <> 'en_curso' or not v_comenzada then
    raise exception 'La práctica ya terminó o todavía no comienza.' using errcode = '55000';
  end if;

  -- Vigentes y reformuladas: cada una fue una llamada a la IA (igual que contarIntervenciones()).
  select count(*) into v_intervenciones
    from public.mensaje m
   where m.sesion_id = p_sesion_id
     and m.remitente = 'estudiante';
  if v_intervenciones >= c_max_intervenciones then
    raise exception 'Se alcanzó el tope de intervenciones.' using errcode = '54000';
  end if;

  insert into public.mensaje (sesion_id, remitente, contenido)
  values (p_sesion_id, 'estudiante', p_mensaje)
  returning id into id_estudiante;

  insert into public.mensaje (
    sesion_id, remitente, contenido, emocion, latencia_ms, tokens_entrada, tokens_salida
  )
  values (
    p_sesion_id, 'npc', p_respuesta, p_emocion, p_latencia_ms, p_tokens_entrada, p_tokens_salida
  )
  returning id into id_npc;

  return next;
end;
$$;

revoke execute on function
  public.guardar_intercambio(uuid, text, text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function
  public.guardar_intercambio(uuid, text, text, text, integer, integer, integer)
  to service_role;

-- -----------------------------------------------------------------------------
-- 2. El estudiante solo termina una práctica que comenzó
-- -----------------------------------------------------------------------------
drop policy "sesion: el estudiante actualiza su sesión en curso" on public.sesion;

create policy "sesion: el estudiante actualiza su sesión en curso"
  on public.sesion for update to authenticated
  using (
    (select public.es_estudiante())
    and estado = 'en_curso'
    and exists (
      select 1 from public.estudiante e
      where e.id = estudiante_id and e.usuario_id = (select auth.uid())
    )
  )
  with check (
    (select public.es_estudiante())
    and (estado in ('en_curso', 'interrumpida') or (estado = 'finalizada' and comenzada))
    and exists (
      select 1 from public.estudiante e
      where e.id = estudiante_id and e.usuario_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 3. El correo de un registro con prácticas no cambia
-- -----------------------------------------------------------------------------
-- `security definer`: el docente que actualiza puede no ver con RLS todas las prácticas del
-- registro (las crea el canje del código), y la regla tiene que verlas todas.
create function public.estudiante_proteger_correo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.correo is not null
     and new.correo is distinct from old.correo
     and exists (select 1 from public.sesion s where s.estudiante_id = old.id) then
    raise exception 'No se puede cambiar el correo de un estudiante que ya practicó.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

comment on function public.estudiante_proteger_correo() is
  'Impide cambiar el correo (y con él la cuenta enlazada) de un registro de estudiante con prácticas.';

revoke execute on function public.estudiante_proteger_correo() from public, anon, authenticated;

-- El nombre empieza por «a» para correr antes que `estudiante_vincular_cuenta` (los triggers del
-- mismo evento se disparan en orden alfabético) y no enlazar nada si se rechaza.
create trigger a_estudiante_proteger_correo
  before update of correo on public.estudiante
  for each row execute function public.estudiante_proteger_correo();

-- -----------------------------------------------------------------------------
-- 4. Funciones nuevas cerradas por defecto
-- -----------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
