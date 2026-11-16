-- =============================================================================
-- Tiempo de consulta: una práctica tiene un marco de tiempo y un punto final conocidos.
--
-- Hasta ahora una práctica terminaba cuando el estudiante pulsaba «Terminar práctica», por
-- inactividad o por un cierre del paciente (crisis o trato inapropiado). Faltaba un fin normal:
-- si el fin depende de que el paciente se calme, las prácticas bien llevadas son las más cortas.
-- Siguiendo el estándar de diseño de simulación de INACSL, cada práctica tiene una duración de
-- consulta que el docente elige al asignarla (10, 15, 20 o 30 minutos; 15 por defecto).
--
--   · `asignacion.duracion_minutos`: lo que eligió el docente. `canjear_codigo` lo copia a la
--     práctica.
--   · `sesion.duracion_minutos`: duración de la consulta de esa práctica.
--   · `sesion.consulta_inicio`: cuándo empezó la consulta, con la hora de la base de datos. No
--     es `inicio` (el estudiante confirma las instrucciones y todavía camina por el consultorio):
--     el tiempo corre desde su primera intervención guardada.
--   · `sesion.fin_motivo`: `tiempo` si la práctica terminó al cumplirse el tiempo de la consulta
--     y su margen de cierre. Lo anota el servidor al terminar; es un dato neutro, no una falta.
--   · `tiempo_de_consulta(sesion)`: duración y tiempo transcurrido, calculados con `now()`. El
--     reloj del navegador nunca decide nada.
--
-- Solo añade (columnas con valor por defecto, una función nueva y dos `create or replace` con la
-- misma firma): funciona con el código desplegado más viejo, que ni lee ni escribe estas
-- columnas. No necesita una segunda migración.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columnas
-- -----------------------------------------------------------------------------
alter table public.asignacion
  add column duracion_minutos smallint not null default 15
  constraint asignacion_duracion_minutos_check check (duracion_minutos in (10, 15, 20, 30));

comment on column public.asignacion.duracion_minutos is
  'Duración de la consulta que eligió el docente al asignar la práctica (minutos).';

alter table public.sesion
  add column duracion_minutos smallint not null default 15
  constraint sesion_duracion_minutos_check check (duracion_minutos in (10, 15, 20, 30)),
  add column consulta_inicio timestamptz,
  add column fin_motivo text
  constraint sesion_fin_motivo_check check (fin_motivo in ('tiempo'));

comment on column public.sesion.duracion_minutos is
  'Duración de la consulta (minutos). Tras cumplirse hay un margen para cerrar la entrevista.';
comment on column public.sesion.consulta_inicio is
  'Primera intervención guardada del estudiante (hora del servidor): desde ahí corre la consulta.';
comment on column public.sesion.fin_motivo is
  'Por qué terminó, si no fue el estudiante: «tiempo» = se cumplió el tiempo de la consulta.';

-- `asignacion` concede `select` de toda la tabla al docente (RLS: solo las suyas); el `insert` es
-- por columna. `sesion` concede `select` por columna: el estudiante debe conocer su tiempo.
grant insert (duracion_minutos) on table public.asignacion to authenticated;
grant select (duracion_minutos, consulta_inicio, fin_motivo) on table public.sesion to authenticated;

-- -----------------------------------------------------------------------------
-- 2. La consulta empieza con la primera intervención guardada
--
-- Misma función de 20261008010000 (cada mensaje cuenta como actividad), que además anota cuándo
-- empezó la consulta. El intercambio lo guarda solo el servidor (`guardar_intercambio`), así que
-- el estudiante no puede adelantar ni atrasar este momento.
-- -----------------------------------------------------------------------------
create or replace function public.mensaje_registrar_actividad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sesion
     set ultima_actividad = now(),
         consulta_inicio = case
           when new.remitente = 'estudiante' then coalesce(consulta_inicio, now())
           else consulta_inicio
         end
   where id = new.sesion_id and estado = 'en_curso';
  return null;
end;
$$;

comment on function public.mensaje_registrar_actividad() is
  'Cada mensaje guardado cuenta como actividad; la primera intervención marca el inicio de la consulta.';

revoke execute on function public.mensaje_registrar_actividad() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. El canje copia la duración que eligió el docente
--
-- Misma función de 20261007020000 con una columna más en el `insert`.
-- -----------------------------------------------------------------------------
create or replace function public.canjear_codigo(p_codigo text)
returns table (resultado text, sesion_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asignacion public.asignacion%rowtype;
  v_estudiante public.estudiante%rowtype;
  v_estado public.estado_sesion;
  v_sesion uuid;
begin
  if not (select public.es_estudiante()) then
    return query select 'invalido'::text, null::uuid;
    return;
  end if;

  select a.* into v_asignacion
  from public.asignacion a
  where a.codigo = lower(btrim(p_codigo))
  for update;

  if not found then
    return query select 'invalido'::text, null::uuid;
    return;
  end if;

  select e.* into v_estudiante from public.estudiante e where e.id = v_asignacion.estudiante_id;

  -- Un código ajeno se responde igual que uno inexistente.
  if v_estudiante.usuario_id is distinct from (select auth.uid()) then
    return query select 'invalido'::text, null::uuid;
    return;
  end if;

  if v_asignacion.sesion_id is not null then
    select s.estado into v_estado from public.sesion s where s.id = v_asignacion.sesion_id;
    if v_estado = 'en_curso' then
      return query select 'ok'::text, v_asignacion.sesion_id;
    else
      return query select 'usado'::text, v_asignacion.sesion_id;
    end if;
    return;
  end if;

  if v_asignacion.anulada_en is not null then
    return query select 'anulado'::text, null::uuid;
    return;
  end if;

  if v_asignacion.expira_en <= now() then
    return query select 'vencido'::text, null::uuid;
    return;
  end if;

  insert into public.sesion
    (usuario_id, escenario_id, estudiante_id, codigo_estudiante, nombre_estudiante, prompt_sistema,
     duracion_minutos)
  values
    (v_asignacion.docente_id, v_asignacion.escenario_id, v_estudiante.id, v_estudiante.codigo,
     v_estudiante.nombre, v_asignacion.prompt_sistema, v_asignacion.duracion_minutos)
  returning id into v_sesion;

  update public.asignacion set sesion_id = v_sesion where id = v_asignacion.id;

  return query select 'ok'::text, v_sesion;
end;
$$;

comment on function public.canjear_codigo(text) is
  'El estudiante canjea su código de acceso: crea (o retoma) la sesión configurada por el docente.';

revoke execute on function public.canjear_codigo(text) from public, anon;
grant execute on function public.canjear_codigo(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Cuánto lleva la consulta, con la hora de la base de datos
--
-- `security invoker`: se aplican RLS y los permisos por columna de quien pregunta (el estudiante
-- ve su práctica; el docente, las suyas). `transcurrido_s` es null si la consulta no ha empezado.
-- -----------------------------------------------------------------------------
create function public.tiempo_de_consulta(p_sesion_id uuid)
returns table (duracion_s integer, transcurrido_s integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.duracion_minutos * 60,
         case
           when s.consulta_inicio is null then null
           else greatest(0, floor(extract(epoch from (now() - s.consulta_inicio))))::integer
         end
    from public.sesion s
   where s.id = p_sesion_id;
$$;

comment on function public.tiempo_de_consulta(uuid) is
  'Duración de la consulta y segundos transcurridos desde la primera intervención, según el reloj de la base de datos.';

revoke execute on function public.tiempo_de_consulta(uuid) from public, anon;
grant execute on function public.tiempo_de_consulta(uuid) to authenticated, service_role;
