-- =============================================================================
-- El paciente responde con el orquestador de NPC (docs/orquestador.md).
--
-- PsySim sigue siendo la fuente de verdad de la conversación: el orquestador (un servicio externo
-- con su propia base de datos) es el motor que responde como paciente, con Gemini de respaldo.
-- Esta migración añade lo que el servidor necesita para eso:
--
--   1. `sesion_ia`: qué proveedor atiende cada práctica, con qué cuenta del orquestador, la sesión
--      que tiene allá, su severidad y, si la cerró por crisis o conducta inapropiada, el motivo.
--   2. `mensaje_ia`: proveedor, modelo y severidad de cada respuesta del paciente. No va en
--      `mensaje` porque el estudiante puede leer todas las columnas de sus mensajes.
--   3. `orquestador_caso`: el perfil y el escenario del orquestador que corresponden a cada caso.
--   4. `orquestador_turno`: turnero. El orquestador acepta 10 mensajes por minuto por cuenta; el
--      servidor reserva un cupo antes de cada llamada para no recibir un 429.
--   5. `orquestador_evento`: errores, esperas y cambios de proveedor, para el Administrador.
--   6. `ajuste_plataforma`: tope de prácticas simultáneas por cuenta (desactivado por defecto).
--
-- Nada de esto lo ve ni lo escribe el navegador: ninguna tabla tiene políticas ni permisos para
-- `authenticated`, y las funciones que escriben solo las ejecuta el servidor con la clave secreta
-- (`service_role`), después de verificar la práctica con RLS.
--
-- Solo añade: funciona con el código desplegado en `main` (que sigue usando
-- `guardar_intercambio`, sin cambios) y con el nuevo. No necesita una segunda migración.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Proveedor de cada práctica
-- -----------------------------------------------------------------------------
create table public.sesion_ia (
  sesion_id uuid primary key references public.sesion (id) on delete cascade,
  proveedor text not null check (proveedor in ('orquestador', 'gemini')),
  -- Huella del correo de la cuenta del orquestador dueña de la sesión (nunca el correo).
  cuenta text check (cuenta ~ '^[0-9a-f]{16}$'),
  sesion_orquestador uuid,
  severidad numeric(4, 2) check (severidad between 0 and 5),
  cambio_motivo text check (char_length(cambio_motivo) <= 40),
  cambio_en timestamptz,
  cierre_motivo text check (cierre_motivo in ('crisis', 'inapropiada')),
  cierre_en timestamptz,
  cerrada_en_orquestador timestamptz,
  creado_en timestamptz not null default now()
);

comment on table public.sesion_ia is
  'Proveedor de IA de cada práctica y su sesión en el orquestador. Solo la lee y la escribe el servidor.';
comment on column public.sesion_ia.cuenta is
  'Cuenta del orquestador dueña de la sesión (huella del correo). La práctica queda fija a ella.';
comment on column public.sesion_ia.cambio_motivo is
  'Por qué la práctica pasó a Gemini (red, servidor, reformulacion…). Una vez en Gemini, se queda.';
comment on column public.sesion_ia.cierre_motivo is
  'El orquestador cerró la práctica por crisis o por conducta inapropiada del estudiante.';

create index sesion_ia_cuenta_idx on public.sesion_ia (cuenta) where proveedor = 'orquestador';
-- Sesiones que PsySim ya terminó y todavía falta cerrar en el orquestador.
create index sesion_ia_por_cerrar_idx on public.sesion_ia (creado_en)
  where sesion_orquestador is not null and cerrada_en_orquestador is null;

-- -----------------------------------------------------------------------------
-- 2. Datos de la IA por respuesta del paciente
-- -----------------------------------------------------------------------------
create table public.mensaje_ia (
  mensaje_id uuid primary key references public.mensaje (id) on delete cascade,
  sesion_id uuid not null references public.sesion (id) on delete cascade,
  proveedor text not null check (proveedor in ('orquestador', 'gemini')),
  modelo text check (char_length(modelo) <= 80),
  severidad numeric(4, 2) check (severidad between 0 and 5),
  banderas text[] not null default '{}',
  -- La emoción no vino en la etiqueta del modelo: se dedujo de la severidad.
  emocion_deducida boolean not null default false
);

comment on table public.mensaje_ia is
  'Proveedor, modelo y severidad de cada respuesta del paciente. El docente la ve a través del servidor.';

create index mensaje_ia_sesion_idx on public.mensaje_ia (sesion_id);

-- -----------------------------------------------------------------------------
-- 3. Casos sincronizados con el orquestador
-- -----------------------------------------------------------------------------
create table public.orquestador_caso (
  escenario_id uuid not null references public.escenario (id) on delete cascade,
  -- '' = el caso tal cual; si el docente ajustó el prompt al asignar, la huella de ese prompt.
  variante text not null default '' check (variante = '' or variante ~ '^[0-9a-f]{16}$'),
  -- Huella de lo último que se envió: si no cambia, no hace falta actualizar nada.
  huella text not null check (huella ~ '^[0-9a-f]{16}$'),
  perfil_id uuid not null,
  escenario_orquestador_id uuid not null,
  actualizado_en timestamptz not null default now(),
  primary key (escenario_id, variante)
);

comment on table public.orquestador_caso is
  'Perfil y escenario del orquestador de cada caso (y de cada variante ajustada por un docente).';

-- -----------------------------------------------------------------------------
-- 4. Turnero por cuenta del orquestador
-- -----------------------------------------------------------------------------
create table public.orquestador_turno (
  id bigint generated always as identity primary key,
  cuenta text not null,
  creado_en timestamptz not null
);

comment on table public.orquestador_turno is
  'Llamadas al orquestador del último minuto por cuenta. Solo la escribe reservar_turno_orquestador.';

create index orquestador_turno_cuenta_idx on public.orquestador_turno (cuenta, creado_en);

-- -----------------------------------------------------------------------------
-- 5. Eventos para el Administrador
-- -----------------------------------------------------------------------------
create table public.orquestador_evento (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  sesion_id uuid references public.sesion (id) on delete set null,
  cuenta text,
  tipo text not null check (tipo in ('error', 'respaldo', 'espera', 'limite', 'cierre', 'caso')),
  -- Código corto (red, servidor, crisis, recreado…). Nunca texto de la conversación.
  detalle text not null check (detalle ~ '^[a-z_0-9]{1,40}$'),
  espera_ms integer check (espera_ms >= 0)
);

comment on table public.orquestador_evento is
  'Errores del orquestador, esperas del turnero, cambios a Gemini y cierres automáticos.';

create index orquestador_evento_creado_idx on public.orquestador_evento (creado_en);

-- -----------------------------------------------------------------------------
-- 6. Ajustes de la plataforma (una sola fila)
-- -----------------------------------------------------------------------------
create table public.ajuste_plataforma (
  unica boolean primary key default true check (unica),
  -- null = sin tope. Se aplica por cuenta del orquestador, no por docente.
  tope_practicas_por_cuenta integer check (tope_practicas_por_cuenta between 1 and 100),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.usuario (id) on delete set null
);

comment on table public.ajuste_plataforma is
  'Ajustes que el Administrador cambia desde su panel. Hoy: tope de prácticas simultáneas por cuenta.';

insert into public.ajuste_plataforma default values;

-- -----------------------------------------------------------------------------
-- Permisos: todo cerrado al navegador
-- -----------------------------------------------------------------------------
alter table public.sesion_ia enable row level security;
alter table public.mensaje_ia enable row level security;
alter table public.orquestador_caso enable row level security;
alter table public.orquestador_turno enable row level security;
alter table public.orquestador_evento enable row level security;
alter table public.ajuste_plataforma enable row level security;

-- Sin políticas: nadie las lee ni las escribe con la clave publicable.
revoke all on table public.sesion_ia, public.mensaje_ia, public.orquestador_caso,
  public.orquestador_turno, public.orquestador_evento, public.ajuste_plataforma
  from anon, authenticated;

grant select, insert, update, delete on table
  public.sesion_ia, public.mensaje_ia, public.orquestador_caso, public.orquestador_turno,
  public.orquestador_evento, public.ajuste_plataforma
  to service_role;

-- -----------------------------------------------------------------------------
-- 7. Reservar un turno en una cuenta del orquestador
--
-- Devuelve 0 si el turno quedó reservado o, si la cuenta ya usó su cupo del último minuto, los
-- milisegundos que faltan para que se libere el más antiguo. El bloqueo por cuenta serializa las
-- reservas: varias funciones de Vercel corren a la vez y sin él todas leerían el mismo conteo.
-- Usa `clock_timestamp()` y no `now()`: una transacción que esperó el bloqueo conserva en `now()`
-- la hora en que empezó, y anotaría el turno antes de cuando realmente sale.
-- -----------------------------------------------------------------------------
create function public.reservar_turno_orquestador(p_cuenta text, p_cupo integer default 9)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_ventana constant interval := interval '1 minute';
  v_total integer;
  v_mas_antiguo timestamptz;
begin
  if p_cuenta is null or p_cupo is null or p_cupo < 1 then
    raise exception 'Cuenta o cupo no válidos.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('orquestador_turno:' || p_cuenta, 0));

  delete from public.orquestador_turno t
   where t.cuenta = p_cuenta
     and t.creado_en <= clock_timestamp() - c_ventana;

  select count(*), min(t.creado_en) into v_total, v_mas_antiguo
    from public.orquestador_turno t
   where t.cuenta = p_cuenta;

  if v_total >= p_cupo then
    return greatest(
      1,
      ceil(extract(epoch from v_mas_antiguo + c_ventana - clock_timestamp()) * 1000)::integer
    );
  end if;

  insert into public.orquestador_turno (cuenta, creado_en) values (p_cuenta, clock_timestamp());
  return 0;
end;
$$;

comment on function public.reservar_turno_orquestador(text, integer) is
  'Reserva una llamada al orquestador para la cuenta (cupo por minuto). 0 = reservada; si no, milisegundos de espera.';

revoke execute on function public.reservar_turno_orquestador(text, integer)
  from public, anon, authenticated;
grant execute on function public.reservar_turno_orquestador(text, integer) to service_role;

-- -----------------------------------------------------------------------------
-- 8. Fijar la práctica a una cuenta del orquestador
--
-- Elige, entre las cuentas configuradas (en ese orden), la que tiene menos prácticas activas y
-- deja la práctica fija a ella. Una práctica cuenta como activa si está en curso y tuvo actividad
-- en los últimos 15 minutos: PsySim interrumpe las que llevan 10 minutos sin actividad (el barrido
-- pasa cada 5), así que una práctica abandonada deja de ocupar cupo como mucho a los 15.
-- Si el Administrador activó el tope y la cuenta menos cargada ya lo alcanzó, no asigna nada y
-- devuelve `sin_cupo` con el total de prácticas activas. Si la práctica ya tenía fila, la devuelve
-- sin cambios. El bloqueo global hace atómica la elección entre peticiones simultáneas.
-- -----------------------------------------------------------------------------
create function public.asignar_cuenta_orquestador(p_sesion_id uuid, p_cuentas text[])
returns table (
  cuenta_asignada text,
  proveedor_fijado text,
  sin_cupo boolean,
  practicas_en_curso integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_inactiva constant interval := interval '15 minutes';
  v_actual public.sesion_ia%rowtype;
  v_tope integer;
  v_cuenta text;
  v_carga integer;
  v_total integer;
begin
  if coalesce(cardinality(p_cuentas), 0) = 0 then
    raise exception 'No hay cuentas del orquestador configuradas.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('orquestador_asignacion', 0));

  select i.* into v_actual from public.sesion_ia i where i.sesion_id = p_sesion_id;
  if found then
    return query select v_actual.cuenta, v_actual.proveedor, false, 0;
    return;
  end if;

  select a.tope_practicas_por_cuenta into v_tope from public.ajuste_plataforma a;

  select c.clave, count(s.id)::integer, (sum(count(s.id)) over ())::integer
    into v_cuenta, v_carga, v_total
    from unnest(p_cuentas) with ordinality as c (clave, orden)
    left join public.sesion_ia i on i.cuenta = c.clave and i.proveedor = 'orquestador'
    left join public.sesion s
      on s.id = i.sesion_id
     and s.estado = 'en_curso'
     and s.ultima_actividad > now() - c_inactiva
   group by c.clave, c.orden
   order by count(s.id), c.orden
   limit 1;

  if v_tope is not null and v_carga >= v_tope then
    return query select null::text, 'orquestador'::text, true, v_total;
    return;
  end if;

  insert into public.sesion_ia (sesion_id, proveedor, cuenta)
  values (p_sesion_id, 'orquestador', v_cuenta);

  return query select v_cuenta, 'orquestador'::text, false, v_total;
end;
$$;

comment on function public.asignar_cuenta_orquestador(uuid, text[]) is
  'Fija la práctica a la cuenta del orquestador con menos prácticas activas, respetando el tope.';

revoke execute on function public.asignar_cuenta_orquestador(uuid, text[])
  from public, anon, authenticated;
grant execute on function public.asignar_cuenta_orquestador(uuid, text[]) to service_role;

-- -----------------------------------------------------------------------------
-- 9. Guardar el intercambio con los datos de la IA
--
-- Hace lo mismo que `guardar_intercambio` (a la que llama: mismas comprobaciones y mismos
-- errores P0002, 55000 y 54000) y además anota el proveedor, el modelo y la severidad de la
-- respuesta. Si el orquestador decidió cerrar la práctica (`p_cierre`), deja el motivo en
-- `sesion_ia`; a partir de ahí no se guardan más intercambios (55000).
-- -----------------------------------------------------------------------------
create function public.guardar_intercambio_ia(
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

  if p_cierre is not null then
    insert into public.orquestador_evento (sesion_id, tipo, detalle)
    values (p_sesion_id, 'cierre', p_cierre);
  end if;

  return next;
end;
$$;

comment on function public.guardar_intercambio_ia(
  uuid, text, text, text, integer, integer, integer, text, text, numeric, text[], boolean, text
) is
  'Guarda el intercambio y los datos de la IA de la respuesta. Solo la llama el servidor (/api/npc/chat).';

revoke execute on function public.guardar_intercambio_ia(
  uuid, text, text, text, integer, integer, integer, text, text, numeric, text[], boolean, text
) from public, anon, authenticated;
grant execute on function public.guardar_intercambio_ia(
  uuid, text, text, text, integer, integer, integer, text, text, numeric, text[], boolean, text
) to service_role;

-- -----------------------------------------------------------------------------
-- 10. Métricas de la IA para el Administrador
--
-- Los números los calcula la base de datos con lo que guardó el servidor. Solo responde al
-- Administrador (comprobado en la tabla, no en el JWT). `p_dias`: periodo, de 1 a 365.
-- -----------------------------------------------------------------------------
create function public.admin_metricas_ia(p_dias integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_desde timestamptz :=
    now() - make_interval(days => least(greatest(coalesce(p_dias, 30), 1), 365));
begin
  if not (select public.es_superadmin()) then
    raise exception 'Solo el Administrador consulta las métricas de la IA.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'desde', v_desde,
    'tope_practicas_por_cuenta',
      (select a.tope_practicas_por_cuenta from public.ajuste_plataforma a),
    'proveedores', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.proveedor)
        from (
          select i.proveedor,
                 count(*)::integer as turnos,
                 round(avg(m.latencia_ms))::integer as latencia_media_ms,
                 round(percentile_cont(0.95) within group (order by m.latencia_ms))::integer
                   as latencia_p95_ms,
                 coalesce(sum(m.tokens_entrada), 0)::bigint as tokens_entrada,
                 coalesce(sum(m.tokens_salida), 0)::bigint as tokens_salida,
                 round(avg(i.severidad), 2) as severidad_media,
                 (count(*) filter (where i.emocion_deducida))::integer as emociones_deducidas
            from public.mensaje_ia i
            join public.mensaje m on m.id = i.mensaje_id
           where m.creado_en >= v_desde
           group by i.proveedor
        ) p
    ), '[]'::jsonb),
    'practicas', (
      select jsonb_build_object(
        'total', count(*)::integer,
        'en_orquestador', (count(*) filter (where i.proveedor = 'orquestador'))::integer,
        'pasaron_a_gemini', (count(*) filter (where i.cambio_en is not null))::integer,
        'cierres_por_crisis', (count(*) filter (where i.cierre_motivo = 'crisis'))::integer,
        'cierres_por_conducta', (count(*) filter (where i.cierre_motivo = 'inapropiada'))::integer
      )
        from public.sesion_ia i
       where i.creado_en >= v_desde
    ),
    -- Respuestas que dio Gemini en prácticas que habían empezado en el orquestador.
    'turnos_de_respaldo', (
      select count(*)::integer
        from public.mensaje_ia i
        join public.mensaje m on m.id = i.mensaje_id
        join public.sesion_ia s on s.sesion_id = i.sesion_id
       where m.creado_en >= v_desde and i.proveedor = 'gemini' and s.cambio_en is not null
    ),
    'cambios', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.practicas desc, c.motivo)
        from (
          select i.cambio_motivo as motivo, count(*)::integer as practicas
            from public.sesion_ia i
           where i.cambio_en >= v_desde
           group by i.cambio_motivo
        ) c
    ), '[]'::jsonb),
    'eventos', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.tipo, e.veces desc, e.detalle)
        from (
          select ev.tipo, ev.detalle, count(*)::integer as veces,
                 round(avg(ev.espera_ms))::integer as espera_media_ms,
                 max(ev.espera_ms) as espera_maxima_ms
            from public.orquestador_evento ev
           where ev.creado_en >= v_desde
           group by ev.tipo, ev.detalle
        ) e
    ), '[]'::jsonb),
    'cuentas', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.practicas desc, c.cuenta)
        from (
          select i.cuenta,
                 count(*)::integer as practicas,
                 (count(*) filter (
                   where s.estado = 'en_curso'
                     and s.ultima_actividad > now() - interval '15 minutes'
                 ))::integer as activas,
                 (
                   select count(*)::integer from public.orquestador_turno t
                    where t.cuenta = i.cuenta and t.creado_en > now() - interval '1 minute'
                 ) as turnos_ultimo_minuto
            from public.sesion_ia i
            join public.sesion s on s.id = i.sesion_id
           where i.cuenta is not null and i.creado_en >= v_desde
           group by i.cuenta
        ) c
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.admin_metricas_ia(integer) is
  'Uso de la IA por proveedor, cambios a Gemini, errores del orquestador y uso de sus cuentas. Solo responde al Administrador.';

revoke execute on function public.admin_metricas_ia(integer) from public, anon;
grant execute on function public.admin_metricas_ia(integer) to authenticated;
