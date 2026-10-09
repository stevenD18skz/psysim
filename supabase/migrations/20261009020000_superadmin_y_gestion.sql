-- =============================================================================
-- Administración de la plataforma y gestión de estudiantes
--
--   1. El Administrador (`superadmin`) trabaja también como docente: `es_docente()` lo incluye,
--      así todas las políticas del panel del docente le aplican sin cambios.
--   2. Cuentas desactivadas (`usuario.activo`): el JWT deja de llevar el rol y la aplicación les
--      niega el acceso. Supabase Auth, además, las bloquea (lo hace el servidor con `ban`).
--   3. Contraseña temporal (`usuario.contrasena_temporal`): la que genera el Administrador al crear
--      una cuenta o restablecerla. La aplicación pide cambiarla.
--   4. `admin_docentes()`: resumen de docentes y administradores para el panel del Administrador.
--      Crear, editar o eliminar cuentas lo hace el servidor con la clave secreta, tras verificar
--      el rol (ver src/lib/admin/actions.ts).
--   5. `eliminar_estudiante()`: el docente elimina a un estudiante con todo su historial.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Roles
-- -----------------------------------------------------------------------------
create function public.es_superadmin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'rol_usuario') = 'superadmin', false);
$$;

comment on function public.es_superadmin() is
  'true si el JWT de la petición incluye el claim rol_usuario = superadmin.';

revoke execute on function public.es_superadmin() from public, anon;
grant execute on function public.es_superadmin() to authenticated;

create or replace function public.es_docente()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'rol_usuario') in ('docente', 'superadmin'), false);
$$;

comment on function public.es_docente() is
  'true si el JWT de la petición es de un docente o del Administrador (que también es docente).';

-- El estudiante ve el nombre de quien lo registró, sea docente o Administrador.
drop policy "usuario: el estudiante lee a sus docentes" on public.usuario;

create policy "usuario: el estudiante lee a sus docentes"
  on public.usuario for select to authenticated
  using (
    (select public.es_estudiante())
    and rol in ('docente', 'superadmin')
    and exists (
      select 1 from public.estudiante e
      where e.docente_id = usuario.id and e.usuario_id = (select auth.uid())
    )
  );

create policy "usuario: el Administrador lee todas las cuentas"
  on public.usuario for select to authenticated
  using ((select public.es_superadmin()));

-- -----------------------------------------------------------------------------
-- 2. Cuentas activas y contraseñas temporales
-- -----------------------------------------------------------------------------
alter table public.usuario
  add column activo boolean not null default true,
  add column contrasena_temporal boolean not null default false;

comment on column public.usuario.activo is
  'false = cuenta desactivada por el Administrador: no puede entrar a la plataforma.';
comment on column public.usuario.contrasena_temporal is
  'true mientras use la contraseña que generó el Administrador (la aplicación pide cambiarla).';

-- Una cuenta desactivada no recibe rol en el JWT: el proxy le niega el acceso de inmediato.
create or replace function public.custom_access_token_hook(event jsonb)
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
   where u.id = (event ->> 'user_id')::uuid
     and u.activo;

  if rol_actual is null then
    claims := claims - 'rol_usuario';
  else
    claims := jsonb_set(claims, '{rol_usuario}', to_jsonb(rol_actual));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Resumen de docentes para el Administrador
-- -----------------------------------------------------------------------------
create function public.admin_docentes()
returns table (
  id uuid,
  nombre text,
  correo text,
  codigo_institucional text,
  rol public.rol_usuario,
  activo boolean,
  contrasena_temporal boolean,
  creado_en timestamptz,
  ultimo_acceso timestamptz,
  proveedores text[],
  estudiantes integer,
  sesiones integer,
  sesiones_en_curso integer,
  pendientes_retroalimentacion integer,
  casos_propios integer,
  ultima_sesion timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.es_superadmin()) then
    return;
  end if;

  return query
  select
    u.id,
    u.nombre,
    u.correo,
    u.codigo_institucional,
    u.rol,
    u.activo,
    u.contrasena_temporal,
    u.creado_en,
    au.last_sign_in_at,
    coalesce(
      (select array_agg(distinct i.provider order by i.provider)
       from auth.identities i where i.user_id = u.id),
      '{}'::text[]
    ),
    (select count(*) from public.estudiante e where e.docente_id = u.id)::integer,
    (select count(*) from public.sesion s where s.usuario_id = u.id)::integer,
    (select count(*) from public.sesion s where s.usuario_id = u.id and s.estado = 'en_curso')::integer,
    (
      select count(*)
      from public.sesion s
      left join public.retroalimentacion r on r.sesion_id = s.id
      where s.usuario_id = u.id and s.estado <> 'en_curso' and r.publicada_en is null
    )::integer,
    (select count(*) from public.escenario x where x.docente_id = u.id)::integer,
    (select max(s.inicio) from public.sesion s where s.usuario_id = u.id)
  from public.usuario u
  left join auth.users au on au.id = u.id
  where u.rol in ('docente', 'superadmin')
  order by u.activo desc, u.nombre;
end;
$$;

comment on function public.admin_docentes() is
  'Docentes y administradores con su actividad. Solo responde al Administrador.';

revoke execute on function public.admin_docentes() from public, anon;
grant execute on function public.admin_docentes() to authenticated;

-- -----------------------------------------------------------------------------
-- 4. El docente elimina a un estudiante
-- -----------------------------------------------------------------------------
-- `security definer`: el docente no tiene permiso de borrar sesiones (el historial es inmutable
-- para él). La función verifica que el estudiante sea suyo y borra primero sus sesiones (con
-- sus mensajes y retroalimentación) y luego el registro (con sus códigos de acceso).
-- Devuelve la cuenta del estudiante (o null) para que el servidor elimine la cuenta si ya ningún
-- docente lo tiene registrado.
create function public.eliminar_estudiante(p_estudiante_id uuid)
returns table (eliminado boolean, usuario_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid;
begin
  if not (select public.es_docente()) then
    return query select false, null::uuid;
    return;
  end if;

  select e.usuario_id into v_usuario
  from public.estudiante e
  where e.id = p_estudiante_id and e.docente_id = (select auth.uid())
  for update;

  if not found then
    return query select false, null::uuid;
    return;
  end if;

  delete from public.sesion where estudiante_id = p_estudiante_id;
  delete from public.estudiante where id = p_estudiante_id;

  return query select true, v_usuario;
end;
$$;

comment on function public.eliminar_estudiante(uuid) is
  'El docente elimina a uno de sus estudiantes con sus sesiones, mensajes, retroalimentación y códigos.';

revoke execute on function public.eliminar_estudiante(uuid) from public, anon;
grant execute on function public.eliminar_estudiante(uuid) to authenticated;
