-- =============================================================================
-- Sprint 3 — Historial de la conversación (tabla `mensaje`)
--
-- El Route Handler /api/npc/chat guarda cada intercambio (mensaje del estudiante + respuesta
-- del paciente) en cuanto la IA responde. Permite recuperar la conversación al recargar la
-- simulación y es la fuente del historial de la pantalla de resultados (Sprint 4, HU-21).
-- =============================================================================

create type public.remitente_mensaje as enum ('estudiante', 'npc');

create table public.mensaje (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesion (id) on delete cascade,
  remitente public.remitente_mensaje not null,
  contenido text not null,
  -- Solo en mensajes del paciente: tiempo de generación (medido en el servidor) y consumo de la IA.
  latencia_ms integer,
  tokens_entrada integer,
  tokens_salida integer,
  creado_en timestamptz not null default now(),

  constraint mensaje_contenido_check check (char_length(btrim(contenido)) between 1 and 4000),
  constraint mensaje_latencia_check check (latencia_ms is null or latencia_ms >= 0),
  constraint mensaje_tokens_check check (
    (tokens_entrada is null or tokens_entrada >= 0) and (tokens_salida is null or tokens_salida >= 0)
  ),
  constraint mensaje_metricas_solo_npc_check check (
    remitente = 'npc' or (latencia_ms is null and tokens_entrada is null and tokens_salida is null)
  )
);

comment on table public.mensaje is
  'Mensajes de cada sesión de simulación, en orden cronológico (creado_en).';

create index mensaje_sesion_creado_idx on public.mensaje (sesion_id, creado_en);

-- -----------------------------------------------------------------------------
-- Seguridad: el docente lee los mensajes de sus sesiones y solo puede añadir mensajes a una
-- sesión propia que siga en curso. Los mensajes no se editan ni se borran.
-- -----------------------------------------------------------------------------
alter table public.mensaje enable row level security;

revoke all on table public.mensaje from anon, authenticated;
grant select on table public.mensaje to authenticated;
grant insert (sesion_id, remitente, contenido, latencia_ms, tokens_entrada, tokens_salida)
  on table public.mensaje to authenticated;

create policy "mensaje: el docente lee los mensajes de sus sesiones"
  on public.mensaje for select to authenticated
  using (
    (select public.es_docente())
    and exists (
      select 1 from public.sesion s
       where s.id = sesion_id and s.usuario_id = (select auth.uid())
    )
  );

create policy "mensaje: el docente escribe en sus sesiones en curso"
  on public.mensaje for insert to authenticated
  with check (
    (select public.es_docente())
    and exists (
      select 1 from public.sesion s
       where s.id = sesion_id and s.usuario_id = (select auth.uid()) and s.estado = 'en_curso'
    )
  );
