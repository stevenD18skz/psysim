-- El resultado de cada turno se conserva aunque otra petición avance la conversación.
create table public.turno_ia_guardado (
  sesion_id uuid not null references public.sesion(id) on delete cascade,
  turno_id uuid not null,
  id_estudiante uuid not null references public.mensaje(id) on delete cascade,
  id_npc uuid not null references public.mensaje(id) on delete cascade,
  cierre text check (cierre in ('crisis', 'inapropiada')),
  primary key (sesion_id, turno_id)
);
alter table public.turno_ia_guardado enable row level security;
revoke all on table public.turno_ia_guardado from public, anon, authenticated;
grant select, insert on table public.turno_ia_guardado to service_role;

create function public.tomar_turno_chat(p_sesion_id uuid, p_turno_id uuid default null)
returns table (resultado text, marca uuid, id_estudiante uuid, id_npc uuid, cierre text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado public.sesion.estado%type;
  v_guardado public.turno_ia_guardado%rowtype;
begin
  select s.estado into v_estado from public.sesion s where s.id = p_sesion_id for update;
  if not found then return; end if;

  select g.* into v_guardado from public.turno_ia_guardado g
   where g.sesion_id = p_sesion_id and g.turno_id = p_turno_id;
  if found then
    return query select 'guardado'::text, null::uuid, v_guardado.id_estudiante,
                        v_guardado.id_npc, v_guardado.cierre;
  elsif exists (
    select 1 from public.turno_ia t
     where t.sesion_id = p_sesion_id and t.turno_id = p_turno_id and t.estado = 'guardado'
  ) then
    -- Compatibilidad con el último turno que guardaba la versión anterior.
    return query select 'guardado_anterior'::text, null::uuid, null::uuid, null::uuid, null::text;
  elsif v_estado <> 'en_curso' then
    return query select 'terminada'::text, null::uuid, null::uuid, null::uuid, null::text;
  else
    return query select t.resultado, t.marca, null::uuid, null::uuid, null::text
      from public.tomar_turno_ia(p_sesion_id, p_turno_id) t;
  end if;
end;
$$;

revoke execute on function public.tomar_turno_chat(uuid, uuid) from public, anon, authenticated;
grant execute on function public.tomar_turno_chat(uuid, uuid) to service_role;

create function public.guardar_turno_chat(
  p_sesion_id uuid, p_marca uuid, p_mensaje text, p_respuesta text, p_emocion text,
  p_latencia_ms integer, p_tokens_entrada integer, p_tokens_salida integer, p_proveedor text,
  p_modelo text default null, p_severidad numeric default null, p_banderas text[] default '{}',
  p_emocion_deducida boolean default false, p_cierre text default null
)
returns table (id_estudiante uuid, id_npc uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado public.sesion.estado%type;
  v_turno uuid;
begin
  select s.estado into v_estado from public.sesion s where s.id = p_sesion_id for update;
  if v_estado is distinct from 'en_curso' then
    raise exception 'La práctica ya terminó.' using errcode = '55000';
  end if;
  select t.turno_id into v_turno from public.turno_ia t
   where t.sesion_id = p_sesion_id and t.marca = p_marca and t.estado = 'en_curso'
     and t.tomado_en > clock_timestamp() - interval '65 seconds'
   for update;
  if not found then
    raise exception 'La petición ya no tiene reservado el turno.' using errcode = '55P03';
  end if;

  select g.id_estudiante, g.id_npc into id_estudiante, id_npc
    from public.guardar_intercambio_ia(
      p_sesion_id, p_mensaje, p_respuesta, p_emocion, p_latencia_ms,
      p_tokens_entrada, p_tokens_salida, p_proveedor, p_modelo, p_severidad,
      p_banderas, p_emocion_deducida, p_cierre
    ) g;
  if v_turno is not null then
    insert into public.turno_ia_guardado (sesion_id, turno_id, id_estudiante, id_npc, cierre)
    values (p_sesion_id, v_turno, id_estudiante, id_npc, p_cierre);
  end if;
  return next;
end;
$$;

revoke execute on function public.guardar_turno_chat(
  uuid, uuid, text, text, text, integer, integer, integer, text, text, numeric, text[], boolean, text
) from public, anon, authenticated;
grant execute on function public.guardar_turno_chat(
  uuid, uuid, text, text, text, integer, integer, integer, text, text, numeric, text[], boolean, text
) to service_role;

-- Reformular también cambia el historial. Se decide bajo el mismo bloqueo de la práctica.
create or replace function public.reformular_desde(p_mensaje_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sesion uuid;
  v_creado timestamptz;
  v_total integer;
begin
  if not (select public.es_estudiante()) then
    return 0;
  end if;

  select m.sesion_id, m.creado_en into v_sesion, v_creado
  from public.mensaje m
  join public.sesion s on s.id = m.sesion_id
  join public.estudiante e on e.id = s.estudiante_id
  where m.id = p_mensaje_id
    and m.remitente = 'estudiante'
    and m.descartado_en is null
    and s.estado = 'en_curso'
    and s.comenzada
    and e.usuario_id = (select auth.uid())
    and not exists (
      select 1 from public.sesion_ia i
       where i.sesion_id = s.id and i.cierre_motivo is not null
    )
  for update of s;

  if not found then
    return 0;
  end if;

  if exists (
    select 1 from public.turno_ia t
     where t.sesion_id = v_sesion and t.estado = 'en_curso'
       and t.tomado_en > clock_timestamp() - interval '65 seconds'
  ) then
    return 0;
  end if;

  -- El mensaje del estudiante y la respuesta del paciente se insertan juntos (misma hora): todo lo
  -- que tenga su hora o una posterior sale de la conversación.
  update public.mensaje
     set descartado_en = now()
   where sesion_id = v_sesion
     and descartado_en is null
     and creado_en >= v_creado;
  get diagnostics v_total = row_count;

  update public.sesion set ultima_actividad = now() where id = v_sesion;
  return v_total;
end;
$$;
