-- =============================================================================
-- HU-23 — La simulación comienza cuando el estudiante confirma las instrucciones del caso.
--
-- El docente crea la sesión en /configuracion, pero antes de interactuar el estudiante lee el
-- caso en una pantalla de instrucciones. El tiempo de lectura no debe contar como duración de
-- la sesión, así que:
--   · `comenzada` indica si el estudiante ya confirmó (false al crear la sesión).
--   · Al pasar a true, un trigger reinicia `inicio` con la hora del servidor (mismo criterio
--     que `fin`: nunca se usa el reloj del cliente). El cliente no puede escribir `inicio`.
--   · Una sesión comenzada no puede volver atrás.
-- =============================================================================

alter table public.sesion add column comenzada boolean not null default false;

comment on column public.sesion.comenzada is
  'true cuando el estudiante confirmó las instrucciones del caso; desde ahí corre la sesión.';

-- Las sesiones anteriores a esta migración ya estaban en marcha.
update public.sesion set comenzada = true;

create function public.sesion_marcar_comienzo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.comenzada then
    -- Una vez comenzada, la sesión conserva su inicio y no se "descomienza".
    new.comenzada := true;
    new.inicio := old.inicio;
  elsif new.comenzada then
    new.inicio := now();
  end if;
  return new;
end;
$$;

comment on function public.sesion_marcar_comienzo() is
  'Fija sesion.inicio con la hora del servidor cuando el estudiante comienza la simulación.';

create trigger sesion_marcar_comienzo
  before update of comenzada on public.sesion
  for each row execute function public.sesion_marcar_comienzo();

grant update (comenzada) on table public.sesion to authenticated;
