-- =============================================================================
-- Sprint 4 — Métricas de la sesión (HU-18, HU-19, HU-21)
--
-- Al terminar la práctica el navegador envía los indicadores que midió (latencia percibida de cada
-- respuesta del paciente, intervenciones y proximidad al paciente) a /api/metrics/save. El Route
-- Handler llama a `guardar_metricas_cierre`, que en una sola transacción guarda la fila de
-- `metrica` y marca la sesión como finalizada: no puede quedar una sesión cerrada sin métricas
-- (ni métricas de una sesión abierta) aunque la red falle a mitad del cierre.
--
-- La duración y el consumo de la IA no los manda el navegador: la duración sale de las horas de
-- inicio y fin que fija la base de datos y los tokens se suman de los mensajes ya guardados.
-- =============================================================================

create table public.metrica (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesion (id) on delete cascade,
  -- Intervenciones del estudiante (sin contar las que reformuló).
  total_mensajes integer not null,
  -- Latencia percibida de las respuestas del paciente (ms); nulas si no hubo ninguna.
  latencia_promedio_ms integer,
  latencia_maxima_ms integer,
  -- Segundos entre que comenzó y terminó la práctica (fin - inicio de la sesión).
  duracion_segundos integer not null,
  tokens_entrada integer not null default 0,
  tokens_salida integer not null default 0,
  -- Indicadores medidos solo en el navegador, p. ej. {"proximidad_promedio": 1.8} (metros).
  indicadores jsonb,
  creado_en timestamptz not null default now(),

  constraint metrica_sesion_id_key unique (sesion_id),
  constraint metrica_total_mensajes_check check (total_mensajes >= 0),
  constraint metrica_latencias_check check (
    (latencia_promedio_ms is null) = (latencia_maxima_ms is null)
    and (latencia_promedio_ms is null
         or (latencia_promedio_ms >= 0 and latencia_maxima_ms >= latencia_promedio_ms))
  ),
  constraint metrica_duracion_check check (duracion_segundos >= 0),
  constraint metrica_tokens_check check (tokens_entrada >= 0 and tokens_salida >= 0),
  constraint metrica_indicadores_check
    check (indicadores is null or jsonb_typeof(indicadores) = 'object')
);

comment on table public.metrica is
  'Indicadores de desempeño de una sesión terminada (HU-18). Una fila por sesión; solo la escribe guardar_metricas_cierre.';

-- -----------------------------------------------------------------------------
-- Seguridad: se lee con la sesión (el docente ve las de sus estudiantes; el estudiante, las suyas).
-- Nadie inserta ni modifica directamente: la única puerta es la función de abajo.
-- -----------------------------------------------------------------------------
alter table public.metrica enable row level security;

revoke all on table public.metrica from anon, authenticated;
grant select on table public.metrica to authenticated;

create policy "metrica: se leen con la sesión"
  on public.metrica for select to authenticated
  using (exists (select 1 from public.sesion s where s.id = metrica.sesion_id));

-- -----------------------------------------------------------------------------
-- Guardar las métricas y cerrar la sesión (atómico).
--
-- `security definer`: el estudiante no puede insertar en `metrica` ni leer los tokens de la IA de
-- forma agregada; la función comprueba antes que la sesión es suya, que ya comenzó y que sigue en
-- curso. Devuelve el id de la fila de `metrica`.
-- -----------------------------------------------------------------------------
create function public.guardar_metricas_cierre(
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
  v_usuario uuid := (select auth.uid());
  v_estado public.estado_sesion;
  v_comenzada boolean;
  v_inicio timestamptz;
  v_fin timestamptz;
  v_tokens_entrada integer;
  v_tokens_salida integer;
  v_id uuid;
begin
  if v_usuario is null or not (select public.es_estudiante()) then
    raise exception 'Solo el estudiante puede terminar su práctica.' using errcode = '42501';
  end if;

  select s.estado, s.comenzada, s.inicio
    into v_estado, v_comenzada, v_inicio
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

  -- El trigger `sesion_asignar_fin` fija `fin` con la hora del servidor.
  update public.sesion set estado = 'finalizada' where id = p_sesion_id
    returning fin into v_fin;

  select coalesce(sum(m.tokens_entrada), 0), coalesce(sum(m.tokens_salida), 0)
    into v_tokens_entrada, v_tokens_salida
    from public.mensaje m
   where m.sesion_id = p_sesion_id;

  insert into public.metrica (
    sesion_id, total_mensajes, latencia_promedio_ms, latencia_maxima_ms,
    duracion_segundos, tokens_entrada, tokens_salida, indicadores
  )
  values (
    p_sesion_id, p_total_mensajes, p_latencia_promedio_ms, p_latencia_maxima_ms,
    greatest(0, round(extract(epoch from (v_fin - v_inicio)))::integer),
    v_tokens_entrada, v_tokens_salida, p_indicadores
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.guardar_metricas_cierre(uuid, integer, integer, integer, jsonb) is
  'Guarda las métricas y marca la sesión del estudiante como finalizada, en una sola transacción.';

revoke execute on function public.guardar_metricas_cierre(uuid, integer, integer, integer, jsonb)
  from public, anon;
grant execute on function public.guardar_metricas_cierre(uuid, integer, integer, integer, jsonb)
  to authenticated;
