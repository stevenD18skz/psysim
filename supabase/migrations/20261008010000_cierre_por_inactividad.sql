-- =============================================================================
-- Cierre automático de las sesiones abandonadas.
--
-- Una sesión solo terminaba si el estudiante pulsaba "Finalizar" o el docente la daba por
-- interrumpida: si el estudiante cerraba la pestaña, quedaba `en_curso` para siempre (no se
-- podía retroalimentar y la ficha del docente se refrescaba sin fin). Ahora:
--   · `ultima_actividad` registra la última interacción del estudiante. La actualizan el
--     latido de la simulación (`registrar_actividad_sesion`), cada mensaje y el comienzo.
--   · Tras 10 minutos sin actividad la sesión pasa a `interrumpida`. La simulación avisa y la
--     cierra ella misma; si el navegador se cerró, lo hace `cerrar_sesiones_inactivas` con
--     pg_cron cada 5 minutos.
--   · La hora de fin de una sesión interrumpida es la de su última actividad: el tiempo que
--     quedó abandonada no cuenta como duración.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columna y límite de inactividad
-- -----------------------------------------------------------------------------
alter table public.sesion add column ultima_actividad timestamptz not null default now();

comment on column public.sesion.ultima_actividad is
  'Última interacción del estudiante (hora del servidor). Tras 10 minutos sin actividad la sesión se interrumpe.';

-- Sesiones anteriores: su último mensaje o, si no hay, su inicio.
update public.sesion s
set ultima_actividad = greatest(
  s.inicio,
  coalesce((select max(m.creado_en) from public.mensaje m where m.sesion_id = s.id), s.inicio)
);

-- El barrido solo recorre las sesiones en curso.
create index sesion_en_curso_actividad_idx
  on public.sesion (ultima_actividad)
  where estado = 'en_curso';

grant select (ultima_actividad) on table public.sesion to authenticated;

create function public.sesion_limite_inactividad()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '10 minutes';
$$;

comment on function public.sesion_limite_inactividad() is
  'Tiempo sin actividad tras el cual una sesión en curso se da por interrumpida.';

-- -----------------------------------------------------------------------------
-- 2. Hora de fin: una sesión interrumpida termina en su última actividad
-- -----------------------------------------------------------------------------
create or replace function public.sesion_asignar_fin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'en_curso' then
    new.fin := null;
  elsif old.estado = 'en_curso' then
    if new.estado = 'interrumpida' then
      -- Abandonada: el tiempo sin actividad no cuenta como duración.
      new.fin := greatest(least(old.ultima_actividad, now()), old.inicio);
    else
      new.fin := greatest(now(), old.inicio);
    end if;
  else
    -- Una sesión ya cerrada conserva su hora de fin original.
    new.fin := old.fin;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Qué cuenta como actividad: comenzar la simulación y cada mensaje
-- -----------------------------------------------------------------------------
create or replace function public.sesion_marcar_comienzo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.comenzada then
    -- Una vez comenzada, la sesión conserva su inicio y no se "descomienza".
    new.comenzada := true;
    new.inicio := old.inicio;
  elsif new.comenzada then
    new.inicio := now();
    new.ultima_actividad := now();
  end if;
  return new;
end;
$$;

-- `security definer`: el estudiante no puede escribir `ultima_actividad` directamente.
create function public.mensaje_registrar_actividad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sesion
  set ultima_actividad = now()
  where id = new.sesion_id and estado = 'en_curso';
  return null;
end;
$$;

comment on function public.mensaje_registrar_actividad() is
  'Cada mensaje guardado cuenta como actividad de la sesión.';

revoke execute on function public.mensaje_registrar_actividad() from public, anon, authenticated;

create trigger mensaje_registrar_actividad
  after insert on public.mensaje
  for each row execute function public.mensaje_registrar_actividad();

-- -----------------------------------------------------------------------------
-- 4. Barrido de sesiones inactivas (pg_cron)
-- -----------------------------------------------------------------------------
create function public.cerrar_sesiones_inactivas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cerradas integer;
begin
  update public.sesion
  set estado = 'interrumpida'
  where estado = 'en_curso'
    and ultima_actividad < now() - public.sesion_limite_inactividad();
  get diagnostics v_cerradas = row_count;
  return v_cerradas;
end;
$$;

comment on function public.cerrar_sesiones_inactivas() is
  'Da por interrumpidas las sesiones en curso sin actividad reciente. La ejecuta pg_cron.';

revoke execute on function public.cerrar_sesiones_inactivas() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'cerrar-sesiones-inactivas',
  '*/5 * * * *',
  'select public.cerrar_sesiones_inactivas()'
);

-- -----------------------------------------------------------------------------
-- 5. Latido de la simulación
-- -----------------------------------------------------------------------------
-- El estudiante avisa que sigue interactuando. Si la sesión ya venció (p. ej. volvió tras salir
-- al panel), se interrumpe en ese momento aunque el barrido aún no haya pasado.
-- Devuelve true si la sesión sigue en curso.
create function public.registrar_actividad_sesion(p_sesion_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ultima timestamptz;
begin
  if not (select public.es_estudiante()) then
    return false;
  end if;

  select s.ultima_actividad into v_ultima
  from public.sesion s
  join public.estudiante e on e.id = s.estudiante_id
  where s.id = p_sesion_id
    and s.estado = 'en_curso'
    and e.usuario_id = (select auth.uid())
  for update of s;

  if not found then
    return false;
  end if;

  if v_ultima < now() - public.sesion_limite_inactividad() then
    update public.sesion set estado = 'interrumpida' where id = p_sesion_id;
    return false;
  end if;

  update public.sesion set ultima_actividad = now() where id = p_sesion_id;
  return true;
end;
$$;

comment on function public.registrar_actividad_sesion(uuid) is
  'Latido de la simulación: registra actividad del estudiante en su sesión en curso.';

revoke execute on function public.registrar_actividad_sesion(uuid) from public, anon;
grant execute on function public.registrar_actividad_sesion(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. El estudiante también puede cerrar su sesión por inactividad
-- -----------------------------------------------------------------------------
-- Cuando el aviso de inactividad de la simulación llega a cero, la sesión pasa a `interrumpida`.
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
    and estado in ('en_curso', 'finalizada', 'interrumpida')
    and exists (
      select 1 from public.estudiante e
      where e.id = estudiante_id and e.usuario_id = (select auth.uid())
    )
  );
