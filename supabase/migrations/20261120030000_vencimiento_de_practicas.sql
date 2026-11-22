-- El primer plazo que vence determina el cierre. En empate prima el tiempo de consulta.
create function public.resolver_vencimiento_sesion(p_sesion_id uuid, p_latido boolean)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_sesion public.sesion%rowtype;
  v_ahora timestamptz;
  v_inactividad timestamptz;
  v_consulta timestamptz;
begin
  select s.* into v_sesion from public.sesion s
   where s.id = p_sesion_id and s.estado = 'en_curso' for update;
  if not found then return null; end if;

  v_ahora := clock_timestamp();
  v_inactividad := v_sesion.ultima_actividad + public.sesion_limite_inactividad();
  v_consulta := v_sesion.consulta_inicio + make_interval(mins => v_sesion.duracion_minutos + 5);
  if v_consulta <= v_ahora and v_consulta <= v_inactividad then
    update public.sesion set estado = 'finalizada', fin_motivo = 'tiempo'
     where id = p_sesion_id;
    return null;
  elsif v_inactividad <= v_ahora then
    update public.sesion set estado = 'interrumpida' where id = p_sesion_id;
    return null;
  end if;

  if p_latido then
    update public.sesion set ultima_actividad = v_ahora where id = p_sesion_id;
    v_inactividad := v_ahora + public.sesion_limite_inactividad();
  end if;
  return ceil(extract(epoch from v_inactividad - v_ahora))::integer;
end;
$$;

revoke execute on function public.resolver_vencimiento_sesion(uuid, boolean)
  from public, anon, authenticated;

create or replace function public.sesion_asignar_fin()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ahora timestamptz;
  v_inactividad timestamptz;
  v_consulta timestamptz;
begin
  -- Las versiones desplegadas solicitan la interrupción con un UPDATE directo.
  -- El trigger comprueba los plazos con la fila ya bloqueada.
  if old.estado = 'en_curso' and new.estado = 'interrumpida'
    and current_user = 'authenticated' and (select public.es_estudiante()) then
    v_ahora := clock_timestamp();
    v_inactividad := old.ultima_actividad + public.sesion_limite_inactividad();
    v_consulta := old.consulta_inicio + make_interval(mins => old.duracion_minutos + 5);
    if v_consulta <= v_ahora and v_consulta <= v_inactividad then
      new.estado := 'finalizada';
      new.fin_motivo := 'tiempo';
    elsif v_inactividad > v_ahora then
      return null;
    end if;
  end if;

  if new.estado = 'en_curso' then
    new.fin := null;
  elsif old.estado <> 'en_curso' then
    new.fin := old.fin;
  elsif new.estado = 'interrumpida' then
    new.fin := greatest(least(old.ultima_actividad, clock_timestamp()), old.inicio);
  elsif new.fin_motivo = 'tiempo' and old.consulta_inicio is not null then
    new.fin := greatest(old.consulta_inicio + make_interval(mins => old.duracion_minutos + 5),
                        old.inicio);
  else
    new.fin := greatest(now(), old.inicio);
  end if;
  return new;
end;
$$;

create function public.verificar_vencimiento_sesion(p_sesion_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.es_estudiante()) or not exists (
    select 1 from public.sesion s join public.estudiante e on e.id = s.estudiante_id
     where s.id = p_sesion_id and e.usuario_id = (select auth.uid())
  ) then
    return null;
  end if;
  return public.resolver_vencimiento_sesion(p_sesion_id, false);
end;
$$;

revoke execute on function public.verificar_vencimiento_sesion(uuid) from public, anon;
grant execute on function public.verificar_vencimiento_sesion(uuid) to authenticated;

create or replace function public.registrar_actividad_sesion(p_sesion_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.es_estudiante()) or not exists (
    select 1 from public.sesion s join public.estudiante e on e.id = s.estudiante_id
     where s.id = p_sesion_id and e.usuario_id = (select auth.uid())
  ) then
    return false;
  end if;
  return public.resolver_vencimiento_sesion(p_sesion_id, true) is not null;
end;
$$;

create or replace function public.cerrar_sesiones_inactivas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_cerradas integer := 0;
  v_ahora timestamptz := clock_timestamp();
begin
  for v_id in
    select s.id from public.sesion s
    where s.estado = 'en_curso'
      and (s.ultima_actividad + public.sesion_limite_inactividad() <= v_ahora
        or s.consulta_inicio + make_interval(mins => s.duracion_minutos + 5) <= v_ahora)
    order by s.id for update skip locked
  loop
    if public.resolver_vencimiento_sesion(v_id, false) is null then
      v_cerradas := v_cerradas + 1;
    end if;
  end loop;
  return v_cerradas;
end;
$$;
