-- =============================================================================
-- HU-02 · T01 — Tabla `usuario` (perfil de la plataforma, sección 4.3.1)
-- HU-03 · T02 — Rol del usuario en el JWT mediante un Custom Access Token Hook
-- =============================================================================

-- Roles de la plataforma. Por ahora solo los docentes tienen acceso; el tipo se puede
-- ampliar más adelante con `alter type public.rol_usuario add value '...'`.
create type public.rol_usuario as enum ('docente');

-- Perfil 1:1 con auth.users. Supabase Auth gestiona credenciales y sesiones;
-- esta tabla guarda los datos de dominio y el rol.
create table public.usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  correo text not null,
  codigo_institucional text not null,
  rol public.rol_usuario not null,
  creado_en timestamptz not null default now(),

  constraint usuario_nombre_check check (char_length(btrim(nombre)) between 1 and 120),
  constraint usuario_correo_check check (correo = lower(btrim(correo)) and correo like '%_@_%'),
  constraint usuario_codigo_institucional_check
    check (char_length(btrim(codigo_institucional)) between 1 and 30),
  constraint usuario_correo_key unique (correo),
  constraint usuario_codigo_institucional_key unique (codigo_institucional)
);

comment on table public.usuario is
  'Perfil de los usuarios de la plataforma. id = auth.users.id. Solo lectura desde el cliente.';
comment on column public.usuario.correo is
  'Copia del correo de auth.users en minúsculas, para consultas y reportes.';

-- -----------------------------------------------------------------------------
-- Seguridad: RLS activado y privilegios mínimos.
-- Los clientes solo pueden LEER su propio perfil. Altas, cambios y bajas se hacen con
-- la clave secreta desde el servidor (scripts/seed-docentes.ts).
-- -----------------------------------------------------------------------------
alter table public.usuario enable row level security;

revoke all on table public.usuario from anon, authenticated;
grant select on table public.usuario to authenticated;

create policy "usuario: cada usuario lee su propio perfil"
  on public.usuario
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- -----------------------------------------------------------------------------
-- Custom Access Token Hook: añade el claim `rol_usuario` a cada JWT emitido.
-- Permite que el proxy de Next.js verifique el rol sin consultar la base de datos
-- en cada petición. Si el usuario no tiene perfil, el claim no se incluye.
-- Se activa en Authentication > Hooks (o en supabase/config.toml en local).
-- -----------------------------------------------------------------------------
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb := event -> 'claims';
  rol_actual public.rol_usuario;
begin
  select u.rol
    into rol_actual
    from public.usuario as u
   where u.id = (event ->> 'user_id')::uuid;

  if rol_actual is null then
    claims := claims - 'rol_usuario';
  else
    claims := jsonb_set(claims, '{rol_usuario}', to_jsonb(rol_actual));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'Hook de Supabase Auth: añade el claim rol_usuario (tabla public.usuario) al JWT.';

-- Solo el servicio de Auth puede ejecutar el hook y leer los roles.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;

grant select on table public.usuario to supabase_auth_admin;

create policy "usuario: el servicio de auth lee los roles"
  on public.usuario
  for select
  to supabase_auth_admin
  using (true);
