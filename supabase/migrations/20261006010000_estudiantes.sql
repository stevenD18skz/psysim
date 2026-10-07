-- =============================================================================
-- Registro de estudiantes y métricas básicas
--
-- Cada docente guarda a sus estudiantes (código institucional y nombre) para reconocerlos cuando
-- vuelven a practicar. La sesión sigue recibiendo el código y el nombre como hasta ahora: un
-- trigger registra (o actualiza) al estudiante y enlaza la sesión, todo en la misma inserción.
--   - `sesion.codigo_estudiante` / `nombre_estudiante` se conservan como copia histórica: si el
--     nombre se corrige después, las sesiones pasadas muestran el que tenían.
--   - `estudiante_resumen` (vista con los permisos de quien consulta) da las métricas básicas.
--   - Calificaciones, chat por estudiante y métricas detalladas quedan para más adelante.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabla `estudiante` (por docente: cada uno solo ve a los suyos)
-- -----------------------------------------------------------------------------
create table public.estudiante (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null default auth.uid() references public.usuario (id) on delete cascade,
  codigo text not null,
  nombre text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint estudiante_docente_codigo_key unique (docente_id, codigo),
  constraint estudiante_codigo_check check (codigo ~ '^[0-9]{5,12}$'),
  constraint estudiante_nombre_check check (char_length(btrim(nombre)) between 2 and 120)
);

comment on table public.estudiante is
  'Estudiantes registrados por cada docente (código institucional y nombre).';

alter table public.estudiante enable row level security;
revoke all on table public.estudiante from anon, authenticated;

grant select on table public.estudiante to authenticated;
-- `docente_id` se puede escribir para que el trigger de la sesión lo copie, pero la política de
-- inserción exige que sea el propio docente.
grant insert (docente_id, codigo, nombre) on table public.estudiante to authenticated;
grant update (nombre) on table public.estudiante to authenticated;

create policy "estudiante: el docente lee los suyos"
  on public.estudiante for select to authenticated
  using ((select public.es_docente()) and docente_id = (select auth.uid()));

create policy "estudiante: el docente registra a su nombre"
  on public.estudiante for insert to authenticated
  with check ((select public.es_docente()) and docente_id = (select auth.uid()));

create policy "estudiante: el docente corrige los suyos"
  on public.estudiante for update to authenticated
  using ((select public.es_docente()) and docente_id = (select auth.uid()))
  with check ((select public.es_docente()) and docente_id = (select auth.uid()));

create function public.estudiante_tocar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger estudiante_tocar_actualizado
  before update on public.estudiante
  for each row execute function public.estudiante_tocar_actualizado();

-- -----------------------------------------------------------------------------
-- 2. La sesión apunta al estudiante
-- -----------------------------------------------------------------------------
alter table public.sesion
  add column estudiante_id uuid references public.estudiante (id) on delete restrict;

comment on column public.sesion.estudiante_id is
  'Estudiante que practicó. Lo asigna el trigger sesion_registrar_estudiante.';

-- Sesiones anteriores: un estudiante por docente y código, con el nombre más reciente.
insert into public.estudiante (docente_id, codigo, nombre, creado_en)
select distinct on (usuario_id, codigo_estudiante)
  usuario_id, codigo_estudiante, nombre_estudiante,
  min(inicio) over (partition by usuario_id, codigo_estudiante)
from public.sesion
order by usuario_id, codigo_estudiante, inicio desc;

update public.sesion s
set estudiante_id = e.id
from public.estudiante e
where e.docente_id = s.usuario_id and e.codigo = s.codigo_estudiante;

alter table public.sesion alter column estudiante_id set not null;

create index sesion_estudiante_id_idx on public.sesion (estudiante_id, inicio desc);

-- -----------------------------------------------------------------------------
-- 3. Trigger: registrar (o actualizar) al estudiante al crear la sesión
-- -----------------------------------------------------------------------------
-- Se ejecuta con los permisos de quien inserta (security invoker): para un docente, RLS de
-- `estudiante` aplica igual que si lo hiciera la aplicación. El estudiante queda a nombre del
-- dueño de la sesión (`usuario_id`, que el cliente no puede escribir: es `auth.uid()`), así
-- también funciona con la clave secreta (scripts), donde `auth.uid()` es nulo.
create function public.sesion_registrar_estudiante()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.estudiante (docente_id, codigo, nombre)
  values (new.usuario_id, new.codigo_estudiante, new.nombre_estudiante)
  on conflict (docente_id, codigo) do update
    -- El nombre escrito en la sesión más reciente corrige el registrado.
    set nombre = excluded.nombre
    where public.estudiante.nombre is distinct from excluded.nombre
  returning id into new.estudiante_id;

  -- Sin cambio de nombre, `do update ... where` no devuelve fila: se busca la existente.
  if new.estudiante_id is null then
    select id into new.estudiante_id
    from public.estudiante
    where docente_id = new.usuario_id and codigo = new.codigo_estudiante;
  end if;

  return new;
end;
$$;

comment on function public.sesion_registrar_estudiante() is
  'Registra o actualiza al estudiante de una sesión nueva y asigna sesion.estudiante_id.';

create trigger sesion_registrar_estudiante
  before insert on public.sesion
  for each row execute function public.sesion_registrar_estudiante();

-- -----------------------------------------------------------------------------
-- 4. Métricas básicas por estudiante
-- -----------------------------------------------------------------------------
-- `security_invoker`: la vista respeta el RLS de quien consulta (cada docente, sus estudiantes).
create view public.estudiante_resumen
with (security_invoker = true)
as
select
  e.id,
  e.codigo,
  e.nombre,
  e.creado_en,
  count(s.id)::integer as sesiones_total,
  (count(s.id) filter (where s.estado = 'finalizada'))::integer as sesiones_finalizadas,
  -- Solo cuenta el tiempo de las sesiones finalizadas que llegaron a comenzar (HU-23).
  coalesce(
    sum(extract(epoch from s.fin - s.inicio)) filter (where s.estado = 'finalizada' and s.comenzada),
    0
  )::integer as segundos_practica,
  count(distinct s.escenario_id)::integer as casos_distintos,
  coalesce(sum(m.intervenciones), 0)::integer as intervenciones,
  max(s.inicio) as ultima_sesion
from public.estudiante e
left join public.sesion s on s.estudiante_id = e.id
left join lateral (
  select count(*) as intervenciones
  from public.mensaje
  where mensaje.sesion_id = s.id and mensaje.remitente = 'estudiante'
) m on true
group by e.id;

comment on view public.estudiante_resumen is
  'Métricas básicas por estudiante: sesiones, tiempo de práctica, casos e intervenciones.';

revoke all on table public.estudiante_resumen from anon, authenticated;
grant select on table public.estudiante_resumen to authenticated;
