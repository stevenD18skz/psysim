-- Las métricas cuentan como pendientes las interrupciones con intervenciones vigentes.

create or replace view public.estudiante_resumen
with (security_invoker = true)
as
select
  e.id,
  e.codigo,
  e.nombre,
  e.correo,
  (e.usuario_id is not null) as cuenta_vinculada,
  e.creado_en,
  count(s.id)::integer as sesiones_total,
  (count(s.id) filter (where s.estado = 'finalizada'))::integer as sesiones_finalizadas,
  (count(s.id) filter (where s.estado = 'en_curso'))::integer as sesiones_en_curso,
  (count(s.id) filter (where s.estado <> 'en_curso' and s.comenzada
    and (s.estado <> 'interrumpida' or m.intervenciones > 0)
    and r.publicada_en is null))::integer
    as pendientes_retroalimentacion,
  round(avg(r.nota) filter (where r.publicada_en is not null), 1) as nota_promedio,
  coalesce(
    sum(extract(epoch from s.fin - s.inicio)) filter (
      where s.estado in ('finalizada', 'interrumpida') and s.comenzada and s.fin is not null
    ),
    0
  )::integer as segundos_practica,
  count(distinct s.escenario_id)::integer as casos_distintos,
  coalesce(sum(m.intervenciones), 0)::integer as intervenciones,
  max(s.inicio) as ultima_sesion,
  (
    select count(*)
    from public.asignacion a
    where a.estudiante_id = e.id
      and a.sesion_id is null
      and a.anulada_en is null
      and a.expira_en > now()
  )::integer as codigos_pendientes
from public.estudiante e
left join public.sesion s on s.estudiante_id = e.id
left join public.retroalimentacion r on r.sesion_id = s.id
left join lateral (
  select count(*) as intervenciones
  from public.mensaje
  where mensaje.sesion_id = s.id
    and mensaje.remitente = 'estudiante'
    and mensaje.descartado_en is null
) m on true
group by e.id;

create or replace function public.admin_docentes()
returns table (
  id uuid,
  nombre text,
  correo text,
  codigo_institucional text,
  rol public.rol_usuario,
  activo boolean,
  contrasena_temporal boolean,
  creado_en timestamptz,
  ultimo_acceso timestamptz,
  proveedores text[],
  estudiantes integer,
  sesiones integer,
  sesiones_en_curso integer,
  pendientes_retroalimentacion integer,
  casos_propios integer,
  ultima_sesion timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.es_superadmin()) then
    return;
  end if;

  return query
  select
    u.id,
    u.nombre,
    u.correo,
    u.codigo_institucional,
    u.rol,
    u.activo,
    u.contrasena_temporal,
    u.creado_en,
    au.last_sign_in_at,
    coalesce(
      (select array_agg(distinct i.provider order by i.provider)
       from auth.identities i where i.user_id = u.id),
      '{}'::text[]
    ),
    (select count(*) from public.estudiante e where e.docente_id = u.id)::integer,
    (select count(*) from public.sesion s where s.usuario_id = u.id)::integer,
    (select count(*) from public.sesion s where s.usuario_id = u.id and s.estado = 'en_curso')::integer,
    (
      select count(*)
      from public.sesion s
      left join public.retroalimentacion r on r.sesion_id = s.id
      where s.usuario_id = u.id and s.estado <> 'en_curso' and s.comenzada
        and r.publicada_en is null
        and (s.estado <> 'interrumpida' or exists (
          select 1 from public.mensaje m
          where m.sesion_id = s.id and m.remitente = 'estudiante' and m.descartado_en is null
        ))
    )::integer,
    (select count(*) from public.escenario x where x.docente_id = u.id)::integer,
    (select max(s.inicio) from public.sesion s where s.usuario_id = u.id)
  from public.usuario u
  left join auth.users au on au.id = u.id
  where u.rol in ('docente', 'superadmin')
  order by u.activo desc, u.nombre;
end;
$$;
