-- =============================================================================
-- Ensayar otra respuesta: el estudiante vuelve a un momento de la conversación.
--
-- Durante la práctica, el estudiante puede reformular una de sus intervenciones: esa intervención
-- y todo lo que vino después quedan descartados y la conversación sigue desde ese punto. Nada se
-- borra (normas INACSL de integridad profesional): los mensajes descartados se marcan con la hora
-- en que se descartaron y el docente los ve en la revisión como «intento reformulado». El paciente
-- deja de recordarlos (el historial que se envía a la IA ya no los incluye).
-- =============================================================================

alter table public.mensaje add column descartado_en timestamptz;

comment on column public.mensaje.descartado_en is
  'Cuándo el estudiante reformuló desde este punto (null = forma parte de la conversación).';

create index mensaje_sesion_vigentes_idx
  on public.mensaje (sesion_id, creado_en)
  where descartado_en is null;

-- -----------------------------------------------------------------------------
-- Reformular desde un mensaje propio de una sesión en curso.
--
-- `security definer`: el estudiante no tiene permiso de UPDATE sobre `mensaje` (los mensajes no
-- se editan); la función solo marca, nunca cambia el contenido. Devuelve cuántos mensajes quedaron
-- descartados (0 si el mensaje no es suyo, no es de una sesión en curso o ya estaba descartado).
-- -----------------------------------------------------------------------------
create function public.reformular_desde(p_mensaje_id uuid)
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
  for update of s;

  if not found then
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

comment on function public.reformular_desde(uuid) is
  'El estudiante vuelve a un momento de su práctica en curso: descarta (sin borrar) desde ese mensaje.';

revoke execute on function public.reformular_desde(uuid) from public, anon;
grant execute on function public.reformular_desde(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Las intervenciones del resumen del estudiante cuentan solo la conversación vigente.
-- (Misma definición que en 20261012010000, con el filtro de descartados.)
-- -----------------------------------------------------------------------------
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
  (count(s.id) filter (where s.estado <> 'en_curso' and r.publicada_en is null))::integer
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
