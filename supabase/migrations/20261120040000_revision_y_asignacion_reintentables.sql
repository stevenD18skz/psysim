-- El identificador de una generación se conserva hasta confirmar el código recibido.
grant insert (id) on public.asignacion to authenticated;
grant insert (id) on public.anotacion to authenticated;

create or replace function public.retroalimentacion_preparar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ahora timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    new.actualizado_en := v_ahora;
    if new.publicada_en is not null then new.publicada_en := v_ahora; end if;
    return new;
  end if;

  v_ahora := greatest(v_ahora, old.actualizado_en + interval '1 microsecond');
  if old.publicada_en is not null then
    new.publicada_en := old.publicada_en;
  elsif new.publicada_en is not null then
    new.publicada_en := v_ahora;
  end if;

  if (new.comentario_general, new.nota, new.publicada_en, new.actualizado_en)
    is distinct from (old.comentario_general, old.nota, old.publicada_en, old.actualizado_en) then
    new.actualizado_en := v_ahora;
  end if;
  return new;
end;
$$;

-- Esta fecha también representa cambios en los comentarios que el estudiante ya puede leer.
create function public.anotacion_fechar_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.comentario is not distinct from new.comentario then
    return null;
  end if;

  update public.retroalimentacion
     set actualizado_en = greatest(clock_timestamp(), actualizado_en + interval '1 microsecond')
   where sesion_id = coalesce(new.sesion_id, old.sesion_id) and publicada_en is not null;
  return null;
end;
$$;

revoke execute on function public.anotacion_fechar_revision() from public, anon, authenticated;

create trigger anotacion_fechar_revision
  after insert or update of comentario or delete on public.anotacion
  for each row execute function public.anotacion_fechar_revision();

create function public.guardar_revision(
  p_sesion_id uuid, p_modo text, p_version timestamptz, p_comentario text, p_nota numeric
)
returns table (
  resultado text, comentario_general text, nota numeric,
  publicada_en timestamptz, actualizado_en timestamptz
)
language plpgsql
set search_path = ''
as $$
declare
  v_revision public.retroalimentacion%rowtype;
  v_resultado text := 'guardado';
begin
  if not (select public.es_docente()) then
    raise exception 'La cuenta no puede revisar la práctica.' using errcode = '42501';
  end if;
  if p_modo is null or p_modo not in ('borrador', 'publicar', 'editar') then
    raise exception 'Modo de guardado inválido.' using errcode = '22023';
  end if;

  if p_version is null and p_modo <> 'editar' then
    insert into public.retroalimentacion as r (sesion_id, comentario_general, nota, publicada_en)
    values (p_sesion_id, p_comentario, p_nota, case when p_modo = 'publicar' then now() end)
    on conflict (sesion_id) do nothing
    returning r.* into v_revision;
    if found then
      return query select v_resultado, v_revision.comentario_general, v_revision.nota,
                          v_revision.publicada_en, v_revision.actualizado_en;
      return;
    end if;
  end if;

  select r.* into v_revision from public.retroalimentacion r
   where r.sesion_id = p_sesion_id for no key update;
  if not found then
    raise exception 'La práctica no está disponible para revisión.' using errcode = '42501';
  end if;

  if (v_revision.publicada_en is not null) = (p_modo <> 'borrador')
    and (v_revision.comentario_general, v_revision.nota) is not distinct from (p_comentario, p_nota) then
    -- Reintento de un guardado ya confirmado. Se conserva también la fecha.
    null;
  elsif v_revision.actualizado_en is distinct from p_version
    or (v_revision.publicada_en is not null) <> (p_modo = 'editar') then
    v_resultado := 'conflicto';
  else
    update public.retroalimentacion as r
       set comentario_general = p_comentario, nota = p_nota,
           publicada_en = case when p_modo = 'publicar' then now() else r.publicada_en end
     where r.sesion_id = p_sesion_id
     returning r.* into v_revision;
  end if;

  return query select v_resultado, v_revision.comentario_general, v_revision.nota,
                      v_revision.publicada_en, v_revision.actualizado_en;
end;
$$;

revoke execute on function public.guardar_revision(uuid, text, timestamptz, text, numeric)
  from public, anon;
grant execute on function public.guardar_revision(uuid, text, timestamptz, text, numeric)
  to authenticated;

create function public.crear_anotacion_revision(
  p_id uuid, p_sesion_id uuid, p_mensaje_id uuid, p_inicio integer, p_fin integer, p_comentario text
)
returns setof public.anotacion
language plpgsql
rows 1
set search_path = ''
as $$
declare
  v_anotacion public.anotacion%rowtype;
begin
  if not (select public.es_docente()) then
    raise exception 'La cuenta no puede anotar la práctica.' using errcode = '42501';
  end if;

  perform 1 from public.retroalimentacion r where r.sesion_id = p_sesion_id for no key update;
  if not found then
    insert into public.retroalimentacion (sesion_id) values (p_sesion_id)
    on conflict (sesion_id) do nothing;
    perform 1 from public.retroalimentacion r where r.sesion_id = p_sesion_id for no key update;
  end if;

  select a.* into v_anotacion from public.anotacion a
   where a.id = p_id and a.sesion_id = p_sesion_id;
  if found then
    if (v_anotacion.mensaje_id, v_anotacion.inicio, v_anotacion.fin)
      is distinct from (p_mensaje_id, p_inicio, p_fin) then
      raise exception 'El identificador pertenece a otro comentario.' using errcode = '23505';
    end if;
    return next v_anotacion;
    return;
  end if;

  insert into public.anotacion (id, sesion_id, mensaje_id, inicio, fin, comentario)
  values (p_id, p_sesion_id, p_mensaje_id, p_inicio, p_fin, p_comentario)
  returning * into v_anotacion;
  return next v_anotacion;
end;
$$;

revoke execute on function public.crear_anotacion_revision(uuid, uuid, uuid, integer, integer, text)
  from public, anon;
grant execute on function public.crear_anotacion_revision(uuid, uuid, uuid, integer, integer, text)
  to authenticated;
