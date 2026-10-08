-- =============================================================================
-- Simulación a distancia: cuentas de estudiante, códigos de acceso y retroalimentación
--
-- Flujo nuevo:
--   1. El docente registra al estudiante (código, nombre y correo @correounivalle.edu.co). El
--      servidor le crea la cuenta (sin contraseña) y el estudiante entra con Google: Supabase
--      enlaza la identidad de Google a la cuenta existente por el correo.
--   2. El docente configura la simulación y genera un código de acceso individual
--      (`asignacion`, p. ej. "abc-defg-hij") con una vigencia. Se lo envía al estudiante.
--   3. El estudiante canjea el código (`canjear_codigo`): se crea la sesión con la configuración
--      del docente. La simulación corre en el equipo del estudiante; el docente solo ve que
--      está en progreso.
--   4. Al terminar, el docente revisa el chat: subraya frases con comentarios (`anotacion`),
--      escribe una retroalimentación general y una nota de 0.0 a 5.0 (`retroalimentacion`).
--      El estudiante la ve cuando el docente la publica.
--
-- El prompt del paciente sigue oculto para el estudiante: no puede leer `npc`, `escenario` ni la
-- columna `sesion.prompt_sistema`; el servidor los lee con la clave secreta tras verificar que
-- la sesión es suya.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper de autorización para el rol estudiante
-- -----------------------------------------------------------------------------
create function public.es_estudiante()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'rol_usuario') = 'estudiante', false);
$$;

comment on function public.es_estudiante() is
  'true si el JWT de la petición incluye el claim rol_usuario = estudiante.';

revoke execute on function public.es_estudiante() from public, anon;
grant execute on function public.es_estudiante() to authenticated;

-- Para registrar a un estudiante cuya cuenta de Auth ya existe (la clave secreta no puede buscar
-- usuarios de Auth por correo sin recorrerlos todos).
create function public.id_cuenta_por_correo(p_correo text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(btrim(p_correo)) limit 1;
$$;

comment on function public.id_cuenta_por_correo(text) is
  'Id de auth.users con ese correo. Solo para el servidor (service_role).';

revoke execute on function public.id_cuenta_por_correo(text) from public, anon, authenticated;
grant execute on function public.id_cuenta_por_correo(text) to service_role;

-- -----------------------------------------------------------------------------
-- 2. `estudiante`: correo institucional y enlace a la cuenta
-- -----------------------------------------------------------------------------
alter table public.estudiante
  add column correo text,
  add column usuario_id uuid references public.usuario (id) on delete set null;

comment on column public.estudiante.correo is
  'Correo con el que el estudiante inicia sesión con Google. NULL en registros anteriores a las cuentas.';
comment on column public.estudiante.usuario_id is
  'Cuenta del estudiante (rol estudiante). La asigna el trigger estudiante_vincular_cuenta.';

-- `psysim.test` es un dominio reservado (RFC 6761) para las cuentas de prueba: ninguna cuenta de
-- Google puede tenerlo. La aplicación solo acepta @correounivalle.edu.co.
alter table public.estudiante
  add constraint estudiante_correo_check check (
    correo is null
    or (correo = lower(btrim(correo)) and correo ~ '^[a-z0-9._%+-]+@(correounivalle\.edu\.co|psysim\.test)$')
  ),
  add constraint estudiante_docente_correo_key unique (docente_id, correo);

create index estudiante_usuario_id_idx on public.estudiante (usuario_id);
create index estudiante_correo_idx on public.estudiante (correo);

-- El enlace con la cuenta se deriva del correo: el cliente no puede elegir `usuario_id` (así un
-- docente no puede asignar sesiones a la cuenta de otra persona).
create function public.estudiante_vincular_cuenta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.correo := nullif(lower(btrim(new.correo)), '');
  if new.correo is null then
    new.usuario_id := null;
  else
    select u.id into new.usuario_id
    from public.usuario u
    where u.correo = new.correo and u.rol = 'estudiante';
  end if;
  return new;
end;
$$;

comment on function public.estudiante_vincular_cuenta() is
  'Enlaza el registro del estudiante con la cuenta (usuario de rol estudiante) de su correo.';

create trigger estudiante_vincular_cuenta
  before insert or update of correo on public.estudiante
  for each row execute function public.estudiante_vincular_cuenta();

-- Si la cuenta se crea después del registro (p. ej. con un script), los registros con ese correo
-- se enlazan en ese momento.
create function public.usuario_vincular_registros()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.estudiante
  set usuario_id = new.id
  where correo = new.correo and usuario_id is null;
  return new;
end;
$$;

comment on function public.usuario_vincular_registros() is
  'Enlaza los registros de estudiante que tienen el correo de una cuenta de estudiante nueva.';

create trigger usuario_vincular_registros
  after insert on public.usuario
  for each row
  when (new.rol = 'estudiante')
  execute function public.usuario_vincular_registros();

grant insert (correo) on table public.estudiante to authenticated;
grant update (correo) on table public.estudiante to authenticated;

-- El estudiante ve cómo lo registró cada docente (para su panel).
create policy "estudiante: el estudiante lee sus registros"
  on public.estudiante for select to authenticated
  using ((select public.es_estudiante()) and usuario_id = (select auth.uid()));

-- El estudiante ve el nombre de sus docentes.
create policy "usuario: el estudiante lee a sus docentes"
  on public.usuario for select to authenticated
  using (
    (select public.es_estudiante())
    and rol = 'docente'
    and exists (
      select 1 from public.estudiante e
      where e.docente_id = usuario.id and e.usuario_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 3. `asignacion`: código de acceso individual a una simulación configurada
-- -----------------------------------------------------------------------------
create table public.asignacion (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null default auth.uid() references public.usuario (id) on delete cascade,
  estudiante_id uuid not null references public.estudiante (id) on delete cascade,
  escenario_id uuid not null references public.escenario (id) on delete restrict,
  -- Copia del prompt configurado, como en `sesion`: editar el caso después no altera el código.
  prompt_sistema text not null,
  codigo text not null,
  expira_en timestamptz not null,
  anulada_en timestamptz,
  -- Sesión creada al canjear el código (una sola vez).
  sesion_id uuid references public.sesion (id) on delete set null,
  creado_en timestamptz not null default now(),

  constraint asignacion_codigo_key unique (codigo),
  constraint asignacion_sesion_id_key unique (sesion_id),
  constraint asignacion_codigo_check check (codigo ~ '^[a-z]{3}-[a-z]{4}-[a-z]{3}$'),
  constraint asignacion_prompt_check check (char_length(btrim(prompt_sistema)) between 20 and 8000),
  constraint asignacion_vigencia_check
    check (expira_en > creado_en and expira_en <= creado_en + interval '31 days'),
  constraint asignacion_anulada_o_usada_check check (anulada_en is null or sesion_id is null)
);

comment on table public.asignacion is
  'Códigos de acceso: simulación configurada por el docente para un estudiante (un solo uso).';
comment on column public.asignacion.codigo is
  'Código que el docente envía al estudiante, al estilo de Meet (abc-defg-hij).';

create index asignacion_docente_creado_idx on public.asignacion (docente_id, creado_en desc);
create index asignacion_estudiante_id_idx on public.asignacion (estudiante_id);
create index asignacion_escenario_id_idx on public.asignacion (escenario_id);

-- La hora de anulación la pone la base de datos y no se puede deshacer.
create function public.asignacion_marcar_anulada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.anulada_en is not null then
    new.anulada_en := old.anulada_en;
  elsif new.anulada_en is not null then
    new.anulada_en := now();
  end if;
  return new;
end;
$$;

create trigger asignacion_marcar_anulada
  before update of anulada_en on public.asignacion
  for each row execute function public.asignacion_marcar_anulada();

alter table public.asignacion enable row level security;
revoke all on table public.asignacion from anon, authenticated;

grant select on table public.asignacion to authenticated;
grant insert (estudiante_id, escenario_id, prompt_sistema, codigo, expira_en)
  on table public.asignacion to authenticated;
grant update (anulada_en) on table public.asignacion to authenticated;

create policy "asignacion: el docente lee las suyas"
  on public.asignacion for select to authenticated
  using ((select public.es_docente()) and docente_id = (select auth.uid()));

-- Solo para estudiantes propios con cuenta y casos que el docente puede ver (RLS de `escenario`).
create policy "asignacion: el docente crea a su nombre"
  on public.asignacion for insert to authenticated
  with check (
    (select public.es_docente())
    and docente_id = (select auth.uid())
    and exists (
      select 1 from public.estudiante e
      where e.id = estudiante_id
        and e.docente_id = (select auth.uid())
        and e.usuario_id is not null
    )
    and exists (select 1 from public.escenario x where x.id = escenario_id and x.activo)
  );

create policy "asignacion: el docente anula las pendientes"
  on public.asignacion for update to authenticated
  using (
    (select public.es_docente())
    and docente_id = (select auth.uid())
    and sesion_id is null
    and anulada_en is null
  )
  with check ((select public.es_docente()) and docente_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 4. `sesion`: la crea el estudiante al canjear el código y la usa solo él
-- -----------------------------------------------------------------------------
-- El registro automático del estudiante solo aplica si la sesión llega sin `estudiante_id`
-- (scripts y datos anteriores). El canje del código ya trae el estudiante.
create or replace function public.sesion_registrar_estudiante()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estudiante_id is not null then
    return new;
  end if;

  insert into public.estudiante (docente_id, codigo, nombre)
  values (new.usuario_id, new.codigo_estudiante, new.nombre_estudiante)
  on conflict (docente_id, codigo) do update
    set nombre = excluded.nombre
    where public.estudiante.nombre is distinct from excluded.nombre
  returning id into new.estudiante_id;

  if new.estudiante_id is null then
    select id into new.estudiante_id
    from public.estudiante
    where docente_id = new.usuario_id and codigo = new.codigo_estudiante;
  end if;

  return new;
end;
$$;

-- Las sesiones ya no se crean desde el cliente: solo con `canjear_codigo`.
drop policy "sesion: el docente crea sesiones a su nombre" on public.sesion;
revoke insert on table public.sesion from authenticated;

-- El prompt no se expone por la API: el estudiante podría leer cómo debe actuar el paciente.
revoke select on table public.sesion from authenticated;
grant select (id, usuario_id, escenario_id, estudiante_id, codigo_estudiante, nombre_estudiante,
              inicio, fin, estado, comenzada)
  on table public.sesion to authenticated;

drop policy "sesion: el docente lee sus sesiones" on public.sesion;
drop policy "sesion: el docente actualiza sus sesiones en curso" on public.sesion;

create policy "sesion: el docente lee sus sesiones"
  on public.sesion for select to authenticated
  using ((select public.es_docente()) and usuario_id = (select auth.uid()));

create policy "sesion: el estudiante lee sus sesiones"
  on public.sesion for select to authenticated
  using (
    (select public.es_estudiante())
    and exists (
      select 1 from public.estudiante e
      where e.id = estudiante_id and e.usuario_id = (select auth.uid())
    )
  );

-- El estudiante comienza (HU-23) y finaliza su propia sesión.
create policy "sesion: el estudiante actualiza su sesión en curso"
  on public.sesion for update to authenticated
  using (
    (select public.es_estudiante())
    and estado = 'en_curso'
    and exists (
      select 1 from public.estudiante e
      where e.id = estudiante_id and e.usuario_id = (select auth.uid())
    )
  )
  with check (
    (select public.es_estudiante())
    and estado in ('en_curso', 'finalizada')
    and exists (
      select 1 from public.estudiante e
      where e.id = estudiante_id and e.usuario_id = (select auth.uid())
    )
  );

-- El docente solo puede dar por interrumpida una sesión que el estudiante nunca terminó.
create policy "sesion: el docente interrumpe sus sesiones en curso"
  on public.sesion for update to authenticated
  using ((select public.es_docente()) and usuario_id = (select auth.uid()) and estado = 'en_curso')
  with check (
    (select public.es_docente())
    and usuario_id = (select auth.uid())
    and estado in ('en_curso', 'interrumpida')
  );

-- -----------------------------------------------------------------------------
-- 5. `mensaje`: escribe el estudiante; leen el estudiante y su docente
-- -----------------------------------------------------------------------------
drop policy "mensaje: el docente lee los mensajes de sus sesiones" on public.mensaje;
drop policy "mensaje: el docente escribe en sus sesiones en curso" on public.mensaje;

-- La visibilidad de la sesión (con sus propias reglas por rol) decide la de sus mensajes.
create policy "mensaje: se leen con la sesión"
  on public.mensaje for select to authenticated
  using (exists (select 1 from public.sesion s where s.id = mensaje.sesion_id));

create policy "mensaje: el estudiante escribe en su sesión en curso"
  on public.mensaje for insert to authenticated
  with check (
    (select public.es_estudiante())
    and exists (
      select 1
      from public.sesion s
      join public.estudiante e on e.id = s.estudiante_id
      where s.id = sesion_id
        and s.estado = 'en_curso'
        and s.comenzada
        and e.usuario_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 6. Canje del código
-- -----------------------------------------------------------------------------
-- `security definer`: el estudiante no puede leer `asignacion` ni insertar en `sesion`; la función
-- verifica que el código sea suyo y crea la sesión con la configuración del docente. Un código ya
-- canjeado devuelve la misma sesión mientras siga en curso (el estudiante puede retomarla).
create function public.canjear_codigo(p_codigo text)
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
    (usuario_id, escenario_id, estudiante_id, codigo_estudiante, nombre_estudiante, prompt_sistema)
  values
    (v_asignacion.docente_id, v_asignacion.escenario_id, v_estudiante.id, v_estudiante.codigo,
     v_estudiante.nombre, v_asignacion.prompt_sistema)
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
-- 7. Retroalimentación del docente
-- -----------------------------------------------------------------------------
create table public.retroalimentacion (
  sesion_id uuid primary key references public.sesion (id) on delete cascade,
  docente_id uuid not null default auth.uid() references public.usuario (id) on delete cascade,
  comentario_general text not null default '',
  -- Escala colombiana de 0.0 a 5.0, con un decimal.
  nota numeric(2, 1),
  -- NULL mientras es borrador. El estudiante solo la ve publicada.
  publicada_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint retroalimentacion_comentario_check check (char_length(comentario_general) <= 5000),
  constraint retroalimentacion_nota_check check (nota is null or nota between 0 and 5),
  constraint retroalimentacion_publicable_check check (
    publicada_en is null or (nota is not null and char_length(btrim(comentario_general)) > 0)
  )
);

comment on table public.retroalimentacion is
  'Retroalimentación general y nota de una sesión. Visible para el estudiante al publicarse.';

create table public.anotacion (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.retroalimentacion (sesion_id) on delete cascade,
  mensaje_id uuid not null references public.mensaje (id) on delete cascade,
  -- Posiciones en caracteres (puntos de código) dentro de `mensaje.contenido`: [inicio, fin).
  inicio integer not null,
  fin integer not null,
  -- Copia del texto subrayado; la calcula el trigger a partir del mensaje.
  fragmento text not null,
  comentario text not null,
  creado_en timestamptz not null default now(),

  constraint anotacion_rango_check check (inicio >= 0 and fin > inicio),
  constraint anotacion_comentario_check check (char_length(btrim(comentario)) between 1 and 2000)
);

comment on table public.anotacion is
  'Frases subrayadas por el docente en las intervenciones del estudiante, con su comentario.';

create index anotacion_sesion_id_idx on public.anotacion (sesion_id);
create index anotacion_mensaje_id_idx on public.anotacion (mensaje_id, inicio);

-- La publicación la fecha la base de datos y no se deshace; editar después la mantiene publicada.
create function public.retroalimentacion_preparar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.publicada_en is not null then
    new.publicada_en := old.publicada_en;
  elsif new.publicada_en is not null then
    new.publicada_en := now();
  end if;
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger retroalimentacion_preparar
  before insert or update on public.retroalimentacion
  for each row execute function public.retroalimentacion_preparar();

-- Valida que la anotación caiga en una intervención del estudiante de la misma sesión, sin
-- solaparse con otra, y guarda el fragmento subrayado.
create function public.anotacion_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_contenido text;
begin
  select m.contenido into v_contenido
  from public.mensaje m
  where m.id = new.mensaje_id and m.sesion_id = new.sesion_id and m.remitente = 'estudiante';

  if v_contenido is null then
    raise exception 'La anotación debe estar en una intervención del estudiante de esta sesión.'
      using errcode = '23514';
  end if;
  if new.fin > char_length(v_contenido) then
    raise exception 'La anotación se sale del mensaje.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.anotacion a
    where a.mensaje_id = new.mensaje_id
      and a.id <> new.id
      and a.inicio < new.fin
      and new.inicio < a.fin
  ) then
    raise exception 'La anotación se solapa con otra.' using errcode = '23P01';
  end if;

  new.fragmento := substr(v_contenido, new.inicio + 1, new.fin - new.inicio);
  return new;
end;
$$;

create trigger anotacion_validar
  before insert or update of mensaje_id, inicio, fin on public.anotacion
  for each row execute function public.anotacion_validar();

alter table public.retroalimentacion enable row level security;
alter table public.anotacion enable row level security;
revoke all on table public.retroalimentacion, public.anotacion from anon, authenticated;

grant select on table public.retroalimentacion to authenticated;
grant insert (sesion_id, comentario_general, nota, publicada_en)
  on table public.retroalimentacion to authenticated;
grant update (comentario_general, nota, publicada_en)
  on table public.retroalimentacion to authenticated;

grant select, delete on table public.anotacion to authenticated;
grant insert (sesion_id, mensaje_id, inicio, fin, comentario) on table public.anotacion to authenticated;
grant update (comentario) on table public.anotacion to authenticated;

create policy "retroalimentacion: el docente lee las suyas"
  on public.retroalimentacion for select to authenticated
  using ((select public.es_docente()) and docente_id = (select auth.uid()));

-- Solo sobre sesiones propias que ya terminaron (finalizadas o interrumpidas).
create policy "retroalimentacion: el docente la crea en sus sesiones terminadas"
  on public.retroalimentacion for insert to authenticated
  with check (
    (select public.es_docente())
    and docente_id = (select auth.uid())
    and exists (
      select 1 from public.sesion s
      where s.id = sesion_id and s.usuario_id = (select auth.uid()) and s.estado <> 'en_curso'
    )
  );

create policy "retroalimentacion: el docente modifica las suyas"
  on public.retroalimentacion for update to authenticated
  using ((select public.es_docente()) and docente_id = (select auth.uid()))
  with check ((select public.es_docente()) and docente_id = (select auth.uid()));

create policy "retroalimentacion: el estudiante lee la publicada"
  on public.retroalimentacion for select to authenticated
  using (
    (select public.es_estudiante())
    and publicada_en is not null
    and exists (select 1 from public.sesion s where s.id = retroalimentacion.sesion_id)
  );

create policy "anotacion: el docente gestiona las suyas"
  on public.anotacion for all to authenticated
  using (
    (select public.es_docente())
    and exists (
      select 1 from public.retroalimentacion r
      where r.sesion_id = anotacion.sesion_id and r.docente_id = (select auth.uid())
    )
  )
  with check (
    (select public.es_docente())
    and exists (
      select 1 from public.retroalimentacion r
      where r.sesion_id = anotacion.sesion_id and r.docente_id = (select auth.uid())
    )
  );

create policy "anotacion: el estudiante lee las publicadas"
  on public.anotacion for select to authenticated
  using (
    (select public.es_estudiante())
    and exists (
      select 1 from public.retroalimentacion r
      where r.sesion_id = anotacion.sesion_id and r.publicada_en is not null
    )
  );

-- -----------------------------------------------------------------------------
-- 8. Métricas por estudiante (con cuenta, sesiones en curso, pendientes y nota promedio)
-- -----------------------------------------------------------------------------
drop view public.estudiante_resumen;

create view public.estudiante_resumen
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
    sum(extract(epoch from s.fin - s.inicio)) filter (where s.estado = 'finalizada' and s.comenzada),
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

comment on view public.estudiante_resumen is
  'Métricas por estudiante: sesiones, en curso, pendientes de retroalimentación, nota y práctica.';

revoke all on table public.estudiante_resumen from anon, authenticated;
grant select on table public.estudiante_resumen to authenticated;
