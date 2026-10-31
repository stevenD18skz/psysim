-- =============================================================================
-- Reflexión del estudiante (INACSL: conversación posterior / debriefing)
--
-- Al terminar la práctica, el estudiante puede escribir qué momento funcionó y qué haría distinto.
-- Antes ese cuadro no se guardaba. Ahora la reflexión es opcional, queda con la sesión y la lee el
-- docente al revisar: es el punto de partida de la conversación posterior, que sigue siendo del
-- docente. Una reflexión por sesión; el estudiante puede corregirla o retirarla (texto vacío).
--
-- Solo se escribe con `guardar_reflexion`: comprueba que la sesión es del estudiante y que ya
-- terminó (no se escribe mientras practica).
-- =============================================================================

create table public.reflexion (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesion (id) on delete cascade,
  contenido text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint reflexion_sesion_id_key unique (sesion_id),
  constraint reflexion_contenido_check check (char_length(btrim(contenido)) between 1 and 2000)
);

comment on table public.reflexion is
  'Reflexión opcional del estudiante al terminar su práctica. La lee su docente al revisar.';

-- Se lee con la sesión: el estudiante la suya y el docente la de sus estudiantes.
alter table public.reflexion enable row level security;

revoke all on table public.reflexion from anon, authenticated;
grant select on table public.reflexion to authenticated;

create policy "reflexion: se leen con la sesión"
  on public.reflexion for select to authenticated
  using (exists (select 1 from public.sesion s where s.id = reflexion.sesion_id));

-- -----------------------------------------------------------------------------
-- Guardar, corregir o retirar la reflexión (texto vacío = retirarla).
-- -----------------------------------------------------------------------------
create function public.guardar_reflexion(p_sesion_id uuid, p_contenido text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_estado public.estado_sesion;
  v_comenzada boolean;
begin
  if v_usuario is null or not (select public.es_estudiante()) then
    raise exception 'Solo el estudiante puede escribir su reflexión.' using errcode = '42501';
  end if;

  select s.estado, s.comenzada
    into v_estado, v_comenzada
    from public.sesion s
    join public.estudiante e on e.id = s.estudiante_id
   where s.id = p_sesion_id and e.usuario_id = v_usuario;

  if not found then
    raise exception 'La sesión no existe o no es tuya.' using errcode = 'P0002';
  end if;
  if v_estado = 'en_curso' or not v_comenzada then
    raise exception 'La reflexión se escribe al terminar la práctica.' using errcode = '55000';
  end if;

  if btrim(coalesce(p_contenido, '')) = '' then
    delete from public.reflexion where sesion_id = p_sesion_id;
    return;
  end if;

  insert into public.reflexion (sesion_id, contenido)
  values (p_sesion_id, btrim(p_contenido))
  on conflict (sesion_id) do update
    set contenido = excluded.contenido, actualizado_en = now();
end;
$$;

comment on function public.guardar_reflexion(uuid, text) is
  'Guarda, corrige o retira la reflexión del estudiante sobre una práctica ya terminada.';

revoke execute on function public.guardar_reflexion(uuid, text) from public, anon;
grant execute on function public.guardar_reflexion(uuid, text) to authenticated;
