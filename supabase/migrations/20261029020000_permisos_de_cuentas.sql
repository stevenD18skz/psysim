-- =============================================================================
-- Auditoría thermo-nuclear (2026-10-29): permisos de las cuentas.
--
-- 1. Una cuenta desactivada o degradada pierde sus permisos en la base de datos de inmediato.
--    Antes, `es_docente()` y compañía confiaban en el claim del JWT ya emitido, que sigue vigente
--    hasta una hora: llamando a la API REST con ese token, un docente desactivado seguía
--    generando códigos y un Administrador degradado seguía leyendo todas las cuentas.
-- 2. El chat de prueba del constructor de casos también cuenta en el límite de llamadas a la IA.
-- 3. Un docente no puede apartar un código oficial `E-NN` para su caso propio.
--
-- Solo añade o reemplaza funciones: funciona con el código anterior y con el nuevo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Rol y estado leídos de la tabla `usuario`
-- -----------------------------------------------------------------------------
-- `security definer`: las políticas de `usuario` llaman a estas funciones; con los permisos del
-- invocador, leer `usuario` desde aquí volvería a evaluar esas mismas políticas.
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
  );
$$;

comment on function public.es_docente() is
  'true si quien llama es un docente o el Administrador con la cuenta activa (según la tabla, no el JWT).';

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
  );
$$;

comment on function public.es_estudiante() is
  'true si quien llama es un estudiante con la cuenta activa (según la tabla, no el JWT).';

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
  );
$$;

comment on function public.es_superadmin() is
  'true si quien llama es el Administrador con la cuenta activa (según la tabla, no el JWT).';

-- -----------------------------------------------------------------------------
-- 2. Límite de llamadas a la IA también para el docente
-- -----------------------------------------------------------------------------
create or replace function public.reservar_peticion_ia()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_limite constant integer := 10;
  c_ventana constant interval := interval '1 minute';
  v_usuario uuid := (select auth.uid());
  v_total integer;
  v_mas_antigua timestamptz;
begin
  if v_usuario is null
     or not ((select public.es_estudiante()) or (select public.es_docente())) then
    raise exception 'Solo un estudiante o un docente puede conversar con el paciente.'
      using errcode = '42501';
  end if;

  -- Serializa las reservas del mismo usuario hasta el final de la transacción.
  perform pg_advisory_xact_lock(hashtextextended('peticion_ia:' || v_usuario::text, 0));

  delete from public.peticion_ia
   where usuario_id = v_usuario
     and creada_en <= now() - c_ventana;

  select count(*), min(creada_en) into v_total, v_mas_antigua
    from public.peticion_ia
   where usuario_id = v_usuario;

  if v_total >= c_limite then
    return greatest(1, ceil(extract(epoch from v_mas_antigua + c_ventana - now()))::integer);
  end if;

  insert into public.peticion_ia (usuario_id) values (v_usuario);
  return 0;
end;
$$;

comment on function public.reservar_peticion_ia() is
  'Reserva una llamada a la IA (10 por minuto por usuario, estudiante o docente). 0 = reservada; si no, segundos de espera.';

-- -----------------------------------------------------------------------------
-- 3. Los códigos `E-NN` son solo del catálogo oficial
-- -----------------------------------------------------------------------------
-- `not valid`: se exige a las filas nuevas sin revisar las que ya existen.
alter table public.escenario
  add constraint escenario_codigo_propio_check
    check (docente_id is null or codigo ~ '^C-[0-9]{8}$') not valid;
