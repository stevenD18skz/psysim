-- =============================================================================
-- Auditoría del 16 de noviembre de 2026 (docs/auditoria-fable.md): P2-02 y P2-06.
--
-- 1. `turno_ia`: una marca de «turno en curso» por práctica. Hasta ahora nada impedía dos turnos
--    a la vez de la misma práctica (dos pestañas) y, si una respuesta del orquestador no llegaba
--    a guardarse, el turno siguiente se enviaba sin comprobar que los dos historiales coincidían:
--    el paciente podía recordar un intercambio que el docente no ve en la transcripción.
--    Con la marca, un segundo turno simultáneo se rechaza y un turno que encuentra una marca sin
--    guardar concilia con el orquestador antes de enviar. La marca lleva además el identificador
--    que el navegador le dio a la intervención: un reintento se reconoce por él y no por el texto
--    (el estudiante puede repetir a propósito lo que acaba de decir).
-- 2. `guardar_intercambio_ia` termina la práctica cuando el paciente la cierra (crisis o trato
--    inapropiado). Antes solo anotaba el motivo y la práctica seguía `en_curso` hasta que el
--    navegador avisaba: si el estudiante cerraba la pestaña, quedaba `interrumpida` y sin
--    métricas. También deja en Gemini una práctica del orquestador cuyo turno respondió Gemini.
-- 3. `reformular_desde` no descarta nada de una práctica que el paciente ya cerró.
-- 4. `guardar_metricas_cierre` acepta, una sola vez, lo que midió el navegador de una práctica
--    que el servidor acaba de terminar: sin esto, esas medidas se perderían.
--
-- Solo añade: las cuatro funciones conservan su firma y `turno_ia` es nueva. El código de `main`
-- no llama a `guardar_intercambio_ia`; el de `develop` anterior a este cambio recibe un 409 al
-- guardar métricas de una práctica ya terminada, que ya trata como «terminada». Se puede aplicar
-- antes de desplegar; el código nuevo funciona también si todavía no se aplicó (sin la marca).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Turno en curso de cada práctica
-- -----------------------------------------------------------------------------
create table public.turno_ia (
  sesion_id uuid primary key references public.sesion (id) on delete cascade,
  -- Identificador que el navegador le dio a la intervención (el mismo al reintentar).
  turno_id uuid,
  -- Quién tomó el turno: solo esa petición puede soltarlo.
  marca uuid not null,
  estado text not null check (estado in ('en_curso', 'guardado', 'sin_guardar')),
  tomado_en timestamptz not null
);

comment on table public.turno_ia is
  'Último turno del paciente de cada práctica: en curso, guardado o sin guardar. Solo la lee y la escribe el servidor.';
comment on column public.turno_ia.estado is
  'en_curso: una petición lo está respondiendo. guardado: el intercambio quedó en la transcripción. sin_guardar: terminó sin guardarse y el proveedor pudo quedarse con él.';

alter table public.turno_ia enable row level security;

-- Sin políticas: nadie la lee ni la escribe con la clave publicable.
revoke all on table public.turno_ia from anon, authenticated;
grant select, insert, update, delete on table public.turno_ia to service_role;

-- -----------------------------------------------------------------------------
-- 2. Tomar el turno de una práctica
--
-- Devuelve `ocupado` si otra petición lo está respondiendo; si no, lo toma y devuelve la marca:
-- `libre` cuando el turno anterior quedó guardado (o es el primero) y `pendiente` cuando terminó
-- sin guardarse o su petición murió sin soltarlo: quien llama debe conciliar con el proveedor
-- antes de enviar otro mensaje. La vigencia cubre el plazo de una petición (55 s de 60 s).
-- Bloquea la fila de la práctica para que dos peticiones simultáneas no lean el mismo estado, y
-- usa `clock_timestamp()` porque `now()` conserva la hora en que empezó a esperar el bloqueo.
-- -----------------------------------------------------------------------------
create function public.tomar_turno_ia(
  p_sesion_id uuid,
  p_turno_id uuid default null,
  p_vigencia_s integer default 65
)
returns table (resultado text, marca uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actual public.turno_ia%rowtype;
  v_marca uuid := gen_random_uuid();
  v_ahora timestamptz;
begin
  perform 1 from public.sesion s where s.id = p_sesion_id for update;
  if not found then
    raise exception 'La sesión no existe.' using errcode = 'P0002';
  end if;
  v_ahora := clock_timestamp();

  select t.* into v_actual from public.turno_ia t where t.sesion_id = p_sesion_id;
  if not found then
    insert into public.turno_ia (sesion_id, turno_id, marca, estado, tomado_en)
    values (p_sesion_id, p_turno_id, v_marca, 'en_curso', v_ahora);
    return query select 'libre'::text, v_marca;
    return;
  end if;

  if v_actual.estado = 'en_curso'
     and v_actual.tomado_en > v_ahora - make_interval(secs => greatest(coalesce(p_vigencia_s, 65), 1))
  then
    return query select 'ocupado'::text, null::uuid;
    return;
  end if;

  update public.turno_ia t
     set turno_id = p_turno_id, marca = v_marca, estado = 'en_curso', tomado_en = v_ahora
   where t.sesion_id = p_sesion_id;

  return query
    select (case when v_actual.estado = 'guardado' then 'libre' else 'pendiente' end)::text,
           v_marca;
end;
$$;

comment on function public.tomar_turno_ia(uuid, uuid, integer) is
  'Toma el turno del paciente de una práctica (libre, pendiente u ocupado). Solo la llama el servidor (/api/npc/chat).';

revoke execute on function public.tomar_turno_ia(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.tomar_turno_ia(uuid, uuid, integer) to service_role;

-- -----------------------------------------------------------------------------
-- 3. Guardar el intercambio: suelta el turno, termina la práctica si el paciente la cerró y deja
--    en Gemini la práctica cuyo turno respondió Gemini
--
-- Misma función de 20261111010000 (misma firma y mismos errores) con tres añadidos al final.
-- -----------------------------------------------------------------------------
create or replace function public.guardar_intercambio_ia(
  p_sesion_id uuid,
  p_mensaje text,
  p_respuesta text,
  p_emocion text,
  p_latencia_ms integer,
  p_tokens_entrada integer,
  p_tokens_salida integer,
  p_proveedor text,
  p_modelo text default null,
  p_severidad numeric default null,
  p_banderas text[] default '{}',
  p_emocion_deducida boolean default false,
  p_cierre text default null
)
returns table (id_estudiante uuid, id_npc uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.sesion_ia i
     where i.sesion_id = p_sesion_id and i.cierre_motivo is not null
  ) then
    raise exception 'La práctica ya terminó.' using errcode = '55000';
  end if;

  select g.id_estudiante, g.id_npc into id_estudiante, id_npc
    from public.guardar_intercambio(
      p_sesion_id, p_mensaje, p_respuesta, p_emocion, p_latencia_ms, p_tokens_entrada,
      p_tokens_salida
    ) g;

  insert into public.mensaje_ia (
    mensaje_id, sesion_id, proveedor, modelo, severidad, banderas, emocion_deducida
  )
  values (
    id_npc, p_sesion_id, p_proveedor, left(p_modelo, 80), p_severidad,
    coalesce(p_banderas, '{}'), coalesce(p_emocion_deducida, false)
  );

  -- Una práctica que siempre fue de Gemini no pasó por `asignar_cuenta_orquestador`.
  insert into public.sesion_ia (sesion_id, proveedor)
  values (p_sesion_id, p_proveedor)
  on conflict (sesion_id) do nothing;

  update public.sesion_ia i
     set severidad = coalesce(p_severidad, i.severidad),
         cierre_motivo = coalesce(p_cierre, i.cierre_motivo),
         cierre_en = case when p_cierre is null then i.cierre_en else now() end
   where i.sesion_id = p_sesion_id
     and (p_severidad is not null or p_cierre is not null);

  -- Este intercambio no lo tiene el orquestador: su historial ya no coincide con la
  -- transcripción y la práctica no puede volver a él. Normalmente el servidor ya lo anotó antes
  -- de llamar a Gemini (`fijarGemini`); esto cubre el caso en que esa escritura falló.
  if p_proveedor = 'gemini' then
    update public.sesion_ia i
       set proveedor = 'gemini',
           cambio_motivo = coalesce(i.cambio_motivo, 'turno_de_gemini'),
           cambio_en = coalesce(i.cambio_en, now())
     where i.sesion_id = p_sesion_id
       and i.proveedor = 'orquestador'
       and i.sesion_orquestador is not null;
    if found then
      insert into public.orquestador_evento (sesion_id, tipo, detalle)
      values (p_sesion_id, 'respaldo', 'turno_de_gemini');
    end if;
  end if;

  if p_cierre is not null then
    insert into public.orquestador_evento (sesion_id, tipo, detalle)
    values (p_sesion_id, 'cierre', p_cierre);

    -- El paciente dio por terminada la consulta: la práctica termina aquí, avise o no el
    -- navegador. `sesion_asignar_fin` fija la hora y `sesion_registrar_metrica` crea la fila de
    -- métricas con la conversación guardada.
    update public.sesion s set estado = 'finalizada'
     where s.id = p_sesion_id and s.estado = 'en_curso';
  end if;

  update public.turno_ia t set estado = 'guardado'
   where t.sesion_id = p_sesion_id and t.estado = 'en_curso';

  return next;
end;
$$;

comment on function public.guardar_intercambio_ia(
  uuid, text, text, text, integer, integer, integer, text, text, numeric, text[], boolean, text
) is
  'Guarda el intercambio y los datos de la IA, suelta el turno y termina la práctica si el paciente la cerró. Solo la llama el servidor (/api/npc/chat).';

revoke execute on function public.guardar_intercambio_ia(
  uuid, text, text, text, integer, integer, integer, text, text, numeric, text[], boolean, text
) from public, anon, authenticated;
grant execute on function public.guardar_intercambio_ia(
  uuid, text, text, text, integer, integer, integer, text, text, numeric, text[], boolean, text
) to service_role;

-- -----------------------------------------------------------------------------
-- 4. Reformular: no después de que el paciente cerró la consulta
--
-- Misma función de 20261018010000 con una condición más. Con el punto 3 la práctica ya no está
-- `en_curso` tras un cierre; la condición cubre además las que se cerraron antes de esta
-- migración y siguen abiertas.
-- -----------------------------------------------------------------------------
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
  'El estudiante vuelve a un momento de su práctica en curso: descarta (sin borrar) desde ese mensaje. No aplica si el paciente ya cerró la consulta.';

revoke execute on function public.reformular_desde(uuid) from public, anon;
grant execute on function public.reformular_desde(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Métricas de una práctica que el servidor acaba de terminar
--
-- Misma función de 20261029010000 (misma firma). Si la práctica ya está `finalizada` porque la
-- terminó el servidor (cierre del paciente o tiempo cumplido), el navegador todavía puede
-- entregar lo que solo él mide, una vez y en los 15 minutos siguientes. Lo demás no cambia: las
-- intervenciones, la duración y los tokens los calculó la base de datos al terminar.
-- -----------------------------------------------------------------------------
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
  -- Una respuesta tarda como mucho 60 s (maxDuration de la función); el margen cubre la red.
  c_latencia_maxima constant integer := 120000;
  c_indicadores_bytes constant integer := 2048;
  c_plazo_tras_cierre constant interval := interval '15 minutes';
  v_usuario uuid := (select auth.uid());
  v_estado public.estado_sesion;
  v_comenzada boolean;
  v_fin timestamptz;
  v_promedio integer := p_latencia_promedio_ms;
  v_maxima integer := p_latencia_maxima_ms;
  v_indicadores jsonb := p_indicadores;
  v_id uuid;
begin
  if v_usuario is null or not (select public.es_estudiante()) then
    raise exception 'Solo el estudiante puede terminar su práctica.' using errcode = '42501';
  end if;

  select s.estado, s.comenzada, s.fin
    into v_estado, v_comenzada, v_fin
    from public.sesion s
    join public.estudiante e on e.id = s.estudiante_id
   where s.id = p_sesion_id and e.usuario_id = v_usuario
     for update of s;

  if not found then
    raise exception 'La sesión no existe o no es tuya.' using errcode = 'P0002';
  end if;
  if not v_comenzada
     or v_estado = 'interrumpida'
     or (v_estado = 'finalizada' and (v_fin is null or v_fin < now() - c_plazo_tras_cierre))
  then
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

  if v_estado = 'en_curso' then
    -- El trigger `sesion_asignar_fin` fija `fin` y `sesion_registrar_metrica` crea la fila.
    update public.sesion set estado = 'finalizada' where id = p_sesion_id;

    update public.metrica
       set latencia_promedio_ms = v_promedio,
           latencia_maxima_ms = v_maxima,
           indicadores = v_indicadores
     where sesion_id = p_sesion_id
    returning id into v_id;
  else
    -- La terminó el servidor: solo se completa una fila que todavía no tiene nada del navegador.
    update public.metrica
       set latencia_promedio_ms = v_promedio,
           latencia_maxima_ms = v_maxima,
           indicadores = v_indicadores
     where sesion_id = p_sesion_id
       and latencia_promedio_ms is null
       and latencia_maxima_ms is null
       and indicadores is null
    returning id into v_id;
    if v_id is null then
      raise exception 'La práctica ya terminó o todavía no comienza.' using errcode = '55000';
    end if;
  end if;

  return v_id;
end;
$$;

comment on function public.guardar_metricas_cierre(uuid, integer, integer, integer, jsonb) is
  'Marca la sesión del estudiante como finalizada y completa sus métricas con lo medido en el navegador; si el servidor ya la terminó, solo las completa.';

revoke execute on function public.guardar_metricas_cierre(uuid, integer, integer, integer, jsonb)
  from public, anon;
grant execute on function public.guardar_metricas_cierre(uuid, integer, integer, integer, jsonb)
  to authenticated;

-- -----------------------------------------------------------------------------
-- 6. `orquestador_caso`: una fila por contenido enviado (P2-04)
--
-- Solo documentación: la tabla no cambia. El servidor deja de actualizar el perfil y el escenario
-- de un caso (las prácticas en curso los comparten) y crea otros cuando el contenido cambia; cada
-- uno se anota bajo la huella de lo que se envió. Las filas anteriores (`''` y la huella del
-- prompt) se siguen leyendo mientras su contenido coincida.
-- -----------------------------------------------------------------------------
comment on column public.orquestador_caso.variante is
  'Huella del contenido enviado al orquestador (igual a `huella`). En filas anteriores al 2026-11-16: vacío para el caso, o la huella del prompt ajustado.';
comment on table public.orquestador_caso is
  'Perfil y escenario del orquestador de cada versión del contenido de un caso. No se actualizan: una versión nueva crea otros.';
