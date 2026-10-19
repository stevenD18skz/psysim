-- =============================================================================
-- Límite de mensajes por estudiante y por minuto (RNF-03.7).
--
-- Cada intervención del estudiante es una llamada a la IA, que tiene cuota y costo. La interfaz
-- ya impide enviar mientras el paciente responde, pero un script con la cookie del estudiante
-- podría llamar a /api/npc/chat sin esa espera. El Route Handler reserva un turno antes de
-- llamar a la IA; si el estudiante ya usó los del último minuto, responde 429.
--
-- El conteo vive en la base de datos (no en la memoria de la función) porque Vercel reparte las
-- peticiones entre varias instancias. Un bloqueo por estudiante evita que varias peticiones
-- simultáneas lean el mismo conteo y pasen todas.
-- =============================================================================

create table public.peticion_ia (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  creada_en timestamptz not null default now()
);

comment on table public.peticion_ia is
  'Llamadas a la IA del último minuto por estudiante (límite de mensajes). Solo la escribe reservar_peticion_ia.';

create index peticion_ia_usuario_creada_idx on public.peticion_ia (usuario_id, creada_en);

-- Sin políticas: nadie la lee ni la escribe directamente.
alter table public.peticion_ia enable row level security;

-- -----------------------------------------------------------------------------
-- Reservar un turno para llamar a la IA.
--
-- Devuelve 0 si el turno quedó reservado o, si el estudiante alcanzó el límite, los segundos que
-- faltan para que se libere el más antiguo. Borra los registros vencidos del estudiante, así la
-- tabla nunca guarda más de un minuto por persona.
-- -----------------------------------------------------------------------------
create function public.reservar_peticion_ia()
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
  if v_usuario is null or not (select public.es_estudiante()) then
    raise exception 'Solo un estudiante puede conversar con el paciente.' using errcode = '42501';
  end if;

  -- Serializa las reservas del mismo estudiante hasta el final de la transacción.
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
  'Reserva una llamada a la IA para el estudiante (10 por minuto). 0 = reservada; si no, segundos de espera.';

revoke execute on function public.reservar_peticion_ia() from public, anon;
grant execute on function public.reservar_peticion_ia() to authenticated;
