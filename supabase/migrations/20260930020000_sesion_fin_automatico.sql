-- =============================================================================
-- Sprint 2 — La hora de fin de una sesión la asigna la base de datos.
--
-- Motivo: si el cliente envía `fin` con su propio reloj, un desfase de milisegundos respecto
-- al servidor viola `sesion_fin_check` (fin >= inicio) y, además, la duración de la sesión
-- (métrica del Sprint 4) dependería del reloj de cada equipo. Ahora el cliente solo cambia
-- `estado`; un trigger fija `fin` con la hora del servidor al salir de `en_curso`.
-- =============================================================================

create function public.sesion_asignar_fin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'en_curso' then
    new.fin := null;
  elsif old.estado = 'en_curso' then
    new.fin := greatest(now(), old.inicio);
  else
    -- Una sesión ya cerrada conserva su hora de fin original.
    new.fin := old.fin;
  end if;
  return new;
end;
$$;

comment on function public.sesion_asignar_fin() is
  'Asigna sesion.fin con la hora del servidor cuando la sesión deja el estado en_curso.';

create trigger sesion_asignar_fin
  before update of estado, fin on public.sesion
  for each row execute function public.sesion_asignar_fin();

-- El cliente ya no puede escribir `fin`: solo cambia `estado`.
revoke update (fin) on table public.sesion from authenticated;
