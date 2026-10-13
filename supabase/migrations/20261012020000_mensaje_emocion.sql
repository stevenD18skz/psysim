-- =============================================================================
-- Emoción del paciente en cada respuesta.
--
-- La emoción que la IA elige en cada respuesta ([triste], [abrumado]…) solo vivía en la memoria
-- del navegador: al recargar o salir y volver, el paciente reaparecía "neutral" aunque la
-- conversación lo hubiera dejado abrumado. Ahora se guarda con el mensaje y la simulación
-- retoma la última emoción al cargar la sesión.
-- =============================================================================
alter table public.mensaje add column emocion text;

alter table public.mensaje
  add constraint mensaje_emocion_check check (
    emocion is null
    or (
      remitente = 'npc'
      and emocion in ('neutral', 'tranquilo', 'triste', 'ansioso', 'abrumado', 'molesto', 'aliviado')
    )
  );

comment on column public.mensaje.emocion is
  'Emoción que expresó el paciente en esta respuesta (solo mensajes del npc).';

grant insert (emocion) on table public.mensaje to authenticated;
