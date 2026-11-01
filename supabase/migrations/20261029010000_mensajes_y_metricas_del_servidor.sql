-- =============================================================================
-- Auditoría thermo-nuclear (2026-10-29): la conversación y sus métricas las escribe el servidor.
--
-- 1. El intercambio con el paciente lo guarda el servidor. Con su token y la clave publicable, el
--    estudiante podía escribir turnos del paciente (`remitente = 'npc'`) desde la consola del
--    navegador: falseaba la transcripción que califica el docente, inflaba los tokens de las
--    métricas y, como el historial que se envía a la IA sale de esta tabla, sembraba respuestas
--    del paciente que ya «aceptaban» revelar sus instrucciones (LLM01). `guardar_intercambio` solo
--    la ejecuta el servidor con la clave secreta después de llamar a la IA, y vuelve a comprobar
--    dentro de un bloqueo que la práctica sigue en curso y que no superó el tope de
--    intervenciones (antes, peticiones en paralelo lo pasaban). El permiso de inserción del
--    cliente se quita en 20261029030000.
-- 2. Las métricas que ve el docente no las decide el navegador: las intervenciones se cuentan de
--    los mensajes guardados y las latencias y los indicadores se acotan. Toda sesión que pasa a
--    `finalizada` tiene su fila de `metrica`, también si se cerró sin pasar por
--    `guardar_metricas_cierre` (el cierre de respaldo del navegador).
-- =============================================================================

-- Esta migración solo añade: funciona con el código anterior y con el nuevo. Quitar el permiso de
-- inserción del cliente va aparte (20261029030000), después de desplegar el código que usa
-- `guardar_intercambio`.

-- -----------------------------------------------------------------------------
-- 1. `mensaje`: el servidor guarda el intercambio
-- -----------------------------------------------------------------------------
-- Guarda la intervención del estudiante y la respuesta del paciente en una sola transacción.
-- Devuelve los ids de ambas filas. Errores: P0002 si la sesión no existe, 55000 si ya no está en
-- curso o no ha comenzado, 54000 si se alcanzó el tope de intervenciones de la práctica.
create function public.guardar_intercambio(
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

  select count(*) into v_intervenciones
    from public.mensaje m
   where m.sesion_id = p_sesion_id
     and m.remitente = 'estudiante'
     and m.descartado_en is null;
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

comment on function public.guardar_intercambio(uuid, text, text, text, integer, integer, integer) is
  'Guarda la intervención del estudiante y la respuesta del paciente. Solo la llama el servidor (/api/npc/chat).';

revoke execute on function
  public.guardar_intercambio(uuid, text, text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function
  public.guardar_intercambio(uuid, text, text, text, integer, integer, integer)
  to service_role;

-- -----------------------------------------------------------------------------
-- 2. Métricas calculadas en la base de datos
-- -----------------------------------------------------------------------------
-- Al pasar a `finalizada`, la sesión recibe su fila de `metrica` con lo que el servidor sabe:
-- intervenciones vigentes, duración y tokens. `guardar_metricas_cierre` la completa después con
-- lo que solo mide el navegador (latencia percibida y proximidad).
create function public.sesion_registrar_metrica()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.metrica (
    sesion_id, total_mensajes, duracion_segundos, tokens_entrada, tokens_salida
  )
  select
    new.id,
    count(*) filter (where m.remitente = 'estudiante' and m.descartado_en is null),
    greatest(0, round(extract(epoch from (new.fin - new.inicio)))::integer),
    coalesce(sum(m.tokens_entrada), 0),
    coalesce(sum(m.tokens_salida), 0)
  from public.mensaje m
  where m.sesion_id = new.id
  on conflict (sesion_id) do nothing;
  return null;
end;
$$;

comment on function public.sesion_registrar_metrica() is
  'Toda sesión finalizada tiene su fila de metrica, calculada con los mensajes guardados.';

revoke execute on function public.sesion_registrar_metrica() from public, anon, authenticated;

create trigger sesion_registrar_metrica
  after update of estado on public.sesion
  for each row
  when (old.estado = 'en_curso' and new.estado = 'finalizada')
  execute function public.sesion_registrar_metrica();

-- Misma firma que en 20261025010000 (el Route Handler no cambia). `p_total_mensajes` se ignora:
-- se conserva solo para no romper a los clientes que todavía lo envían.
create or replace function public.guardar_metricas_cierre(
  p_sesion_id uuid,
  p_total_mensajes integer,
  p_latencia_promedio_ms integer default null,
  p_latencia_maxima_ms integer default null,
  p_indicadores jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Una respuesta tarda como mucho 30 s (maxDuration de la función); el margen cubre la red.
  c_latencia_maxima constant integer := 120000;
  c_indicadores_bytes constant integer := 2048;
  v_usuario uuid := (select auth.uid());
  v_estado public.estado_sesion;
  v_comenzada boolean;
  v_promedio integer := p_latencia_promedio_ms;
  v_maxima integer := p_latencia_maxima_ms;
  v_indicadores jsonb := p_indicadores;
  v_id uuid;
begin
  if v_usuario is null or not (select public.es_estudiante()) then
    raise exception 'Solo el estudiante puede terminar su práctica.' using errcode = '42501';
  end if;

  select s.estado, s.comenzada
    into v_estado, v_comenzada
    from public.sesion s
    join public.estudiante e on e.id = s.estudiante_id
   where s.id = p_sesion_id and e.usuario_id = v_usuario
     for update of s;

  if not found then
    raise exception 'La sesión no existe o no es tuya.' using errcode = 'P0002';
  end if;
  if v_estado <> 'en_curso' or not v_comenzada then
    raise exception 'La práctica ya terminó o todavía no comienza.' using errcode = '55000';
  end if;

  -- Lo que mide el navegador se acota: fuera de rango no se guarda.
  if v_promedio is null or v_maxima is null
     or v_promedio < 0 or v_maxima > c_latencia_maxima or v_maxima < v_promedio then
    v_promedio := null;
    v_maxima := null;
  end if;
  if v_indicadores is not null
     and (jsonb_typeof(v_indicadores) <> 'object'
          or pg_column_size(v_indicadores) > c_indicadores_bytes) then
    v_indicadores := null;
  end if;

  -- El trigger `sesion_asignar_fin` fija `fin` y `sesion_registrar_metrica` crea la fila.
  update public.sesion set estado = 'finalizada' where id = p_sesion_id;

  update public.metrica
     set latencia_promedio_ms = v_promedio,
         latencia_maxima_ms = v_maxima,
         indicadores = v_indicadores
   where sesion_id = p_sesion_id
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.guardar_metricas_cierre(uuid, integer, integer, integer, jsonb) is
  'Marca la sesión del estudiante como finalizada y completa sus métricas con lo medido en el navegador.';
