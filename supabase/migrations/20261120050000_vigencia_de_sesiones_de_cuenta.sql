-- El plazo se mide por sesión de Auth. Renovar el JWT no cuenta como interacción.
create table public.actividad_cuenta (
  sesion_id uuid primary key references auth.sessions(id) on delete cascade,
  ultima_actividad timestamptz not null
);

alter table public.actividad_cuenta enable row level security;
revoke all on table public.actividad_cuenta from public, anon, authenticated, service_role;

create function public.segundos_sesion_cuenta()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(0, floor(extract(epoch from least(
    s.created_at + interval '12 hours',
    coalesce(a.ultima_actividad, s.created_at) + interval '2 hours'
  ) - statement_timestamp()))::integer)
  from auth.sessions s
  left join public.actividad_cuenta a on a.sesion_id = s.id
  where s.user_id = (select auth.uid())
    and s.id = case
      when ((select auth.jwt()) ->> 'session_id') ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
        then ((select auth.jwt()) ->> 'session_id')::uuid
    end;
$$;

create function public.registrar_actividad_cuenta()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(public.segundos_sesion_cuenta(), 0) <= 0 then return 0; end if;

  insert into public.actividad_cuenta as a (sesion_id, ultima_actividad)
  select s.id, statement_timestamp()
    from auth.sessions s
   where s.user_id = (select auth.uid())
     and s.id = ((select auth.jwt()) ->> 'session_id')::uuid
  on conflict (sesion_id) do update set ultima_actividad = excluded.ultima_actividad
    where a.ultima_actividad <= excluded.ultima_actividad - interval '1 minute';

  return public.segundos_sesion_cuenta();
end;
$$;

revoke execute on function public.segundos_sesion_cuenta(), public.registrar_actividad_cuenta()
  from public, anon;
grant execute on function public.segundos_sesion_cuenta(), public.registrar_actividad_cuenta()
  to authenticated;

-- La aplicación nueva comprueba el plazo desde el servidor desde el primer despliegue.
-- RLS se activa en una migración posterior cuando producción ya registra la actividad.
create function public.vigencia_cuenta_en_rls()
returns boolean
language sql
stable
set search_path = ''
as $$
  select false;
$$;

revoke execute on function public.vigencia_cuenta_en_rls() from public, anon, authenticated;

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
    )
    and case when (select public.vigencia_cuenta_en_rls())
      then (select public.segundos_sesion_cuenta()) > 0
      else true
    end;
$$;
