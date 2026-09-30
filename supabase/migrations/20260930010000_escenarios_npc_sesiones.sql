-- =============================================================================
-- Sprint 2 — Modelo de datos de la simulación
--   HU-06 · T01 — Tablas `escenario` y `npc` (catálogo de casos clínicos)
--   HU-06 · T04 — Tabla `sesion` (registro de cada simulación)
--   HU-07 · T01 — Tabla `configuracion_guardada` (configuraciones del docente)
--   HU-09 · T03 — Bucket público `modelos-3d` en Supabase Storage
-- =============================================================================

create type public.categoria_escenario as enum ('clinico', 'cotidiano');
create type public.dificultad_escenario as enum ('basico', 'intermedio', 'avanzado');
create type public.estado_sesion as enum ('en_curso', 'finalizada', 'interrumpida');

-- -----------------------------------------------------------------------------
-- Helper de autorización: ¿el JWT de la petición pertenece a un docente?
-- El claim `rol_usuario` lo añade el Custom Access Token Hook (migración del Sprint 1),
-- así que las políticas no necesitan consultar la tabla `usuario` en cada fila.
-- -----------------------------------------------------------------------------
create function public.es_docente()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'rol_usuario') = 'docente', false);
$$;

comment on function public.es_docente() is
  'true si el JWT de la petición incluye el claim rol_usuario = docente.';

revoke execute on function public.es_docente() from public, anon;
grant execute on function public.es_docente() to authenticated;

-- -----------------------------------------------------------------------------
-- escenario: catálogo de casos. Solo lectura para los docentes.
-- -----------------------------------------------------------------------------
create table public.escenario (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  descripcion text not null,
  categoria public.categoria_escenario not null,
  dificultad public.dificultad_escenario not null,
  competencia_central text not null,
  activo boolean not null default true,
  -- Ruta (relativa a /public) del JSON que describe la escena 3D. Ver public/scenes/README.md.
  configuracion_3d text not null,
  creado_en timestamptz not null default now(),

  constraint escenario_codigo_key unique (codigo),
  constraint escenario_codigo_check check (codigo ~ '^E-[0-9]{2}$'),
  constraint escenario_titulo_check check (char_length(btrim(titulo)) between 1 and 120),
  constraint escenario_descripcion_check check (char_length(btrim(descripcion)) between 1 and 1000),
  constraint escenario_competencia_check
    check (char_length(btrim(competencia_central)) between 1 and 120),
  constraint escenario_configuracion_3d_check
    check (configuracion_3d ~ '^scenes/[a-z0-9-]+\.json$')
);

comment on table public.escenario is 'Catálogo de escenarios clínicos (E-01 a E-06).';
comment on column public.escenario.configuracion_3d is
  'Ruta relativa a /public del JSON de la escena 3D, p. ej. scenes/e-01.json.';

-- -----------------------------------------------------------------------------
-- npc: paciente virtual de cada escenario (relación 1:1).
-- -----------------------------------------------------------------------------
create table public.npc (
  id uuid primary key default gen_random_uuid(),
  escenario_id uuid not null references public.escenario (id) on delete cascade,
  nombre text not null,
  edad smallint not null,
  perfil_clinico text not null,
  prompt_sistema text not null,
  creado_en timestamptz not null default now(),

  constraint npc_escenario_id_key unique (escenario_id),
  constraint npc_nombre_check check (char_length(btrim(nombre)) between 1 and 80),
  constraint npc_edad_check check (edad between 1 and 110),
  constraint npc_perfil_clinico_check check (char_length(btrim(perfil_clinico)) between 1 and 2000),
  constraint npc_prompt_sistema_check check (char_length(btrim(prompt_sistema)) between 20 and 8000)
);

comment on table public.npc is 'Paciente virtual (NPC) asociado a cada escenario.';
comment on column public.npc.prompt_sistema is
  'Prompt base del modelo de lenguaje. El docente puede personalizarlo por sesión.';

-- -----------------------------------------------------------------------------
-- sesion: cada simulación iniciada por un docente para un estudiante.
-- -----------------------------------------------------------------------------
create table public.sesion (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.usuario (id) on delete cascade,
  escenario_id uuid not null references public.escenario (id) on delete restrict,
  codigo_estudiante text not null,
  nombre_estudiante text not null,
  -- Prompt efectivo de la sesión: se copia al iniciar para que editar el NPC o una
  -- configuración guardada no altere sesiones pasadas ni en curso.
  prompt_sistema text not null,
  inicio timestamptz not null default now(),
  fin timestamptz,
  estado public.estado_sesion not null default 'en_curso',

  constraint sesion_codigo_estudiante_check check (codigo_estudiante ~ '^[0-9]{5,12}$'),
  constraint sesion_nombre_estudiante_check
    check (char_length(btrim(nombre_estudiante)) between 2 and 120),
  constraint sesion_prompt_sistema_check check (char_length(btrim(prompt_sistema)) between 20 and 8000),
  constraint sesion_fin_check check (fin is null or fin >= inicio),
  constraint sesion_estado_fin_check check ((estado = 'en_curso') = (fin is null))
);

comment on table public.sesion is 'Sesiones de simulación. Cada docente solo ve las suyas.';
comment on column public.sesion.prompt_sistema is
  'Copia del prompt usado en la sesión (personalizado por el docente o el del NPC).';

create index sesion_usuario_inicio_idx on public.sesion (usuario_id, inicio desc);
create index sesion_escenario_id_idx on public.sesion (escenario_id);

-- -----------------------------------------------------------------------------
-- configuracion_guardada: configuraciones reutilizables de cada docente.
-- -----------------------------------------------------------------------------
create table public.configuracion_guardada (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null default auth.uid() references public.usuario (id) on delete cascade,
  escenario_id uuid not null references public.escenario (id) on delete cascade,
  nombre_configuracion varchar(150) not null,
  prompt_personalizado text not null,
  creado_en timestamptz not null default now(),

  constraint configuracion_guardada_nombre_check
    check (char_length(btrim(nombre_configuracion)) between 3 and 150),
  constraint configuracion_guardada_prompt_check
    check (char_length(btrim(prompt_personalizado)) between 20 and 8000),
  constraint configuracion_guardada_docente_nombre_key unique (docente_id, nombre_configuracion)
);

comment on table public.configuracion_guardada is
  'Configuraciones de escenario guardadas por cada docente (HU-07).';

create index configuracion_guardada_docente_creado_idx
  on public.configuracion_guardada (docente_id, creado_en desc);
create index configuracion_guardada_escenario_id_idx
  on public.configuracion_guardada (escenario_id);

-- -----------------------------------------------------------------------------
-- Seguridad: RLS en todas las tablas y privilegios mínimos por columna.
-- -----------------------------------------------------------------------------
alter table public.escenario enable row level security;
alter table public.npc enable row level security;
alter table public.sesion enable row level security;
alter table public.configuracion_guardada enable row level security;

revoke all on table public.escenario, public.npc, public.sesion, public.configuracion_guardada
  from anon, authenticated;

-- Catálogo: solo lectura. Altas y cambios se hacen con migraciones o la clave secreta.
grant select on table public.escenario, public.npc to authenticated;

create policy "escenario: los docentes leen los escenarios activos"
  on public.escenario for select to authenticated
  using ((select public.es_docente()) and activo);

create policy "npc: los docentes leen los NPC de escenarios activos"
  on public.npc for select to authenticated
  using (
    (select public.es_docente())
    and exists (select 1 from public.escenario e where e.id = escenario_id and e.activo)
  );

-- Sesiones: el docente crea y lee las suyas. Solo puede cerrar una sesión (estado y fin);
-- los datos del estudiante y el prompt quedan inmutables una vez creada.
grant select on table public.sesion to authenticated;
grant insert (escenario_id, codigo_estudiante, nombre_estudiante, prompt_sistema)
  on table public.sesion to authenticated;
grant update (estado, fin) on table public.sesion to authenticated;

create policy "sesion: el docente lee sus sesiones"
  on public.sesion for select to authenticated
  using ((select public.es_docente()) and usuario_id = (select auth.uid()));

create policy "sesion: el docente crea sesiones a su nombre"
  on public.sesion for insert to authenticated
  with check ((select public.es_docente()) and usuario_id = (select auth.uid()));

create policy "sesion: el docente actualiza sus sesiones en curso"
  on public.sesion for update to authenticated
  using ((select public.es_docente()) and usuario_id = (select auth.uid()) and estado = 'en_curso')
  with check ((select public.es_docente()) and usuario_id = (select auth.uid()));

-- Configuraciones guardadas: CRUD limitado a las del propio docente.
grant select, delete on table public.configuracion_guardada to authenticated;
grant insert (escenario_id, nombre_configuracion, prompt_personalizado)
  on table public.configuracion_guardada to authenticated;
grant update (nombre_configuracion, prompt_personalizado)
  on table public.configuracion_guardada to authenticated;

create policy "configuracion_guardada: el docente lee las suyas"
  on public.configuracion_guardada for select to authenticated
  using ((select public.es_docente()) and docente_id = (select auth.uid()));

create policy "configuracion_guardada: el docente crea a su nombre"
  on public.configuracion_guardada for insert to authenticated
  with check ((select public.es_docente()) and docente_id = (select auth.uid()));

create policy "configuracion_guardada: el docente modifica las suyas"
  on public.configuracion_guardada for update to authenticated
  using ((select public.es_docente()) and docente_id = (select auth.uid()))
  with check ((select public.es_docente()) and docente_id = (select auth.uid()));

create policy "configuracion_guardada: el docente elimina las suyas"
  on public.configuracion_guardada for delete to authenticated
  using ((select public.es_docente()) and docente_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Storage: bucket público para los modelos 3D (GLB comprimidos con Draco).
-- Lectura pública sin autenticación (el navegador los descarga directamente);
-- la escritura solo es posible con la clave secreta (scripts/subir-modelos.ts).
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('modelos-3d', 'modelos-3d', true, 52428800, array['model/gltf-binary'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
