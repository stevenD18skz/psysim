-- =============================================================================
-- Revisión del inicio de sesión del 17 de noviembre de 2026 (con Codex, `docs/estado-del-proyecto.md`).
--
-- Las reglas de con qué se abre una sesión vivían solo en la DAL de Next.js
-- (`src/lib/auth/dal.ts`): el estudiante entra con Google, y el docente que entregó su equipo
-- (modo presencial) no vale con una sesión de Google abierta después. Pero RLS no las conocía:
-- quien saca un token directamente de Supabase Auth y consulta la API de datos desde la consola
-- no pasa por la DAL. Por ejemplo, en el computador entregado, con la sesión de Google del docente
-- todavía abierta, el estudiante podía pedir un token de esa cuenta a Auth y leer por REST las
-- prácticas de todos sus estudiantes.
--
-- Ahora las funciones de rol (`es_docente()`, `es_estudiante()`, `es_superadmin()`), que usan
-- todas las políticas y las funciones que ejecuta el navegador, también exigen que la sesión sea
-- válida según `public.sesion_permitida`, que repite `src/lib/auth/politica-acceso.ts`:
--
-- 1. Se abrió con un método que esa cuenta puede usar: el estudiante con Google (`oauth`; las
--    cuentas de prueba `@psysim.test`, también con contraseña); el docente y el Administrador con
--    contraseña o con Google. El código de la aplicación de autenticación (`totp`) puede acompañar.
--    Cualquier otro método (enlace mágico, código por correo, recuperación…) no vale, y tampoco un
--    token que no diga con qué se entró.
-- 2. El estudiante tiene el correo institucional (`@correounivalle.edu.co`).
-- 3. El docente que entregó su equipo no vale con una sesión de Google abierta durante la entrega.
--
-- Solo endurece lo que la DAL de `main` y de `develop` ya exige: funciona con el código de las dos
-- ramas. El segundo factor y la duración máxima de la sesión llegan en `20261118020000`, que se
-- aplica después de desplegar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ¿Vale la sesión de quien llama para esa cuenta?
-- -----------------------------------------------------------------------------
-- La llaman las funciones de rol (`security definer`) con los datos de la fila de `usuario`, así
-- que no necesita leer tablas ni permisos propios. Lee el `amr` del JWT de la petición.
create or replace function public.sesion_permitida(
  p_rol public.rol_usuario,
  p_correo text,
  p_entrega_hasta timestamptz
)
returns boolean
language sql
stable
set search_path = ''
as $$
  with amr as (
    -- `amr` es una lista de `{ method, timestamp }` (o, en el formato antiguo, de textos).
    select case jsonb_typeof(e) when 'string' then e #>> '{}' else e ->> 'method' end as metodo,
           case when jsonb_typeof(e -> 'timestamp') = 'number'
                then (e ->> 'timestamp')::numeric end as momento
      from jsonb_array_elements(
             case when jsonb_typeof((select auth.jwt()) -> 'amr') = 'array'
                  then (select auth.jwt()) -> 'amr'
                  else '[]'::jsonb end
           ) as e
  ),
  cuenta as (
    select lower(p_correo) like '%@psysim.test' as de_prueba
  ),
  permitidos as (
    select case
             when p_rol <> 'estudiante' then array['password', 'oauth']
             when (select de_prueba from cuenta) then array['oauth', 'password']
             else array['oauth']
           end as metodos
  )
  select
    -- Al menos un método con el que esa cuenta puede abrir la sesión…
    exists (
      select 1 from amr, permitidos where amr.metodo = any (permitidos.metodos)
    )
    -- …y ninguno que PsySim no ofrezca.
    and not exists (
      select 1 from amr, permitidos
       where amr.metodo is null
          or not (amr.metodo = any (permitidos.metodos) or amr.metodo in ('totp', 'mfa/totp'))
    )
    -- El estudiante, con su correo institucional.
    and (
      p_rol <> 'estudiante'
      or (select de_prueba from cuenta)
      or lower(p_correo) like '%@correounivalle.edu.co'
    )
    -- Tras entregar su equipo, el docente no vale con Google abierto durante la entrega. La entrega
    -- dura 4 horas (`DURACION_ENTREGA_S` en `src/lib/equipo-compartido/entrega.ts`): empezó 14 400
    -- segundos antes de `entrega_hasta`. Sin la hora del acceso, se toma como posterior.
    and not (
      p_rol <> 'estudiante'
      and p_entrega_hasta is not null
      and p_entrega_hasta > now()
      and exists (
        select 1 from amr
         where amr.metodo = 'oauth'
           and (amr.momento is null
                or amr.momento >= floor(extract(epoch from p_entrega_hasta)) - 14400)
      )
    );
$$;

comment on function public.sesion_permitida(public.rol_usuario, text, timestamptz) is
  'true si la sesión de la petición (su `amr`) vale para una cuenta con ese rol, correo y entrega. Repite src/lib/auth/politica-acceso.ts.';

-- Solo la usan las funciones de rol, que corren como su dueño.
revoke execute on function public.sesion_permitida(public.rol_usuario, text, timestamptz)
  from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Las funciones de rol exigen además una sesión válida
-- -----------------------------------------------------------------------------
create or replace function public.es_docente()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuario u
     where u.id = (select auth.uid()) and u.activo and u.rol in ('docente', 'superadmin')
       and public.sesion_permitida(u.rol, u.correo, u.entrega_hasta)
  );
$$;

comment on function public.es_docente() is
  'true si quien llama es un docente o el Administrador con la cuenta activa (según la tabla, no el JWT) y una sesión válida (`sesion_permitida`).';

create or replace function public.es_estudiante()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuario u
     where u.id = (select auth.uid()) and u.activo and u.rol = 'estudiante'
       and public.sesion_permitida(u.rol, u.correo, u.entrega_hasta)
  );
$$;

comment on function public.es_estudiante() is
  'true si quien llama es un estudiante con la cuenta activa (según la tabla, no el JWT) y una sesión válida (`sesion_permitida`).';

create or replace function public.es_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuario u
     where u.id = (select auth.uid()) and u.activo and u.rol = 'superadmin'
       and public.sesion_permitida(u.rol, u.correo, u.entrega_hasta)
  );
$$;

comment on function public.es_superadmin() is
  'true si quien llama es el Administrador con la cuenta activa (según la tabla, no el JWT) y una sesión válida (`sesion_permitida`).';

-- `create or replace` conserva los permisos: se repiten para que se lean aquí.
revoke execute on function public.es_docente() from public, anon;
revoke execute on function public.es_estudiante() from public, anon;
revoke execute on function public.es_superadmin() from public, anon;
grant execute on function public.es_docente() to authenticated;
grant execute on function public.es_estudiante() to authenticated;
grant execute on function public.es_superadmin() to authenticated;
