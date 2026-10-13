-- =============================================================================
-- Tiempo de práctica: también cuentan las sesiones interrumpidas.
--
-- `estudiante_resumen.segundos_practica` solo sumaba las sesiones `finalizada`. Pero la mayoría
-- de las sesiones terminan `interrumpida` (el estudiante cierra la pestaña o se agota la
-- inactividad), así que el tiempo de práctica aparecía en "—" aunque hubiera practicado.
--
-- Desde el cierre por inactividad, la hora de fin de una sesión interrumpida es la de su última
-- actividad, de modo que `fin - inicio` es tiempo real de práctica. Solo se descartan las
-- sesiones que nunca comenzaron (el estudiante no pasó de las instrucciones) y las en curso.
-- =============================================================================
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
  where mensaje.sesion_id = s.id and mensaje.remitente = 'estudiante'
) m on true
group by e.id;
