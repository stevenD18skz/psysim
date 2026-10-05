-- =============================================================================
-- Casos personalizados del docente ("Mis casos")
--
-- Un caso propio es una fila de `escenario` (con su `npc`) cuyo dueño es un docente. Así la
-- sesión, la escena 3D y el chat funcionan igual para casos oficiales y propios.
--   - Las reglas comunes de interpretación dejan de guardarse dentro del prompt: el servidor las
--     añade siempre (src/lib/ia/reglas.ts).
--   - Las configuraciones guardadas se convierten en casos propios y la tabla se elimina.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columnas y restricciones de `escenario`
-- -----------------------------------------------------------------------------
alter table public.escenario
  add column docente_id uuid references public.usuario (id) on delete cascade,
  add column borrador jsonb;

-- El valor por defecto se fija después para que las filas existentes y las del catálogo queden en NULL.
alter table public.escenario alter column docente_id set default auth.uid();

comment on column public.escenario.docente_id is
  'Docente dueño del caso. NULL en los escenarios oficiales del catálogo.';
comment on column public.escenario.borrador is
  'Campos del constructor guiado, para volver a editar el caso. NULL si se redactó como texto.';

alter table public.escenario drop constraint escenario_codigo_check;
alter table public.escenario
  add constraint escenario_codigo_check
    check (codigo ~ '^E-[0-9]{2}$' or codigo ~ '^C-[0-9]{8}$'),
  add constraint escenario_borrador_check
    check (borrador is null or docente_id is not null);

create index escenario_docente_id_idx on public.escenario (docente_id);

-- -----------------------------------------------------------------------------
-- 2. Las reglas comunes salen del prompt guardado
-- -----------------------------------------------------------------------------
update public.npc
set prompt_sistema = btrim(left(prompt_sistema, position('Reglas de interpretación:' in prompt_sistema) - 1))
where position('Reglas de interpretación:' in prompt_sistema) > 21
  and char_length(btrim(left(prompt_sistema, position('Reglas de interpretación:' in prompt_sistema) - 1))) >= 20;

-- -----------------------------------------------------------------------------
-- 3. Configuraciones guardadas -> casos propios
-- -----------------------------------------------------------------------------
do $$
declare
  fila record;
  nuevo_id uuid;
  contador integer := 0;
  prompt_limpio text;
begin
  for fila in
    select cg.docente_id, cg.nombre_configuracion, cg.prompt_personalizado, cg.creado_en,
           e.descripcion, e.categoria, e.dificultad, e.competencia_central, e.configuracion_3d,
           n.nombre, n.edad, n.perfil_clinico
    from public.configuracion_guardada cg
    join public.escenario e on e.id = cg.escenario_id
    join public.npc n on n.escenario_id = e.id
    order by cg.creado_en
  loop
    contador := contador + 1;
    prompt_limpio := fila.prompt_personalizado;
    if position('Reglas de interpretación:' in prompt_limpio) > 21 then
      prompt_limpio := btrim(left(prompt_limpio, position('Reglas de interpretación:' in prompt_limpio) - 1));
    end if;

    insert into public.escenario
      (codigo, titulo, descripcion, categoria, dificultad, competencia_central,
       configuracion_3d, docente_id, creado_en)
    values
      ('C-' || (90000000 + contador), left(fila.nombre_configuracion, 120), fila.descripcion,
       fila.categoria, fila.dificultad, fila.competencia_central, fila.configuracion_3d,
       fila.docente_id, fila.creado_en)
    returning id into nuevo_id;

    insert into public.npc (escenario_id, nombre, edad, perfil_clinico, prompt_sistema)
    values (nuevo_id, fila.nombre, fila.edad, fila.perfil_clinico, prompt_limpio);
  end loop;
end
$$;

drop table public.configuracion_guardada;

-- -----------------------------------------------------------------------------
-- 4. Seguridad: el docente lee el catálogo y sus casos, y solo escribe en los suyos
-- -----------------------------------------------------------------------------
drop policy "escenario: los docentes leen los escenarios activos" on public.escenario;
drop policy "npc: los docentes leen los NPC de escenarios activos" on public.npc;

create policy "escenario: los docentes leen el catálogo y sus casos"
  on public.escenario for select to authenticated
  using (
    (select public.es_docente())
    and ((docente_id is null and activo) or docente_id = (select auth.uid()))
  );

-- La visibilidad del escenario (con sus propias reglas) decide la del NPC.
create policy "npc: los docentes leen los NPC de los casos que ven"
  on public.npc for select to authenticated
  using (
    (select public.es_docente())
    and exists (select 1 from public.escenario e where e.id = escenario_id)
  );

grant insert (codigo, titulo, descripcion, categoria, dificultad, competencia_central,
              configuracion_3d, docente_id, borrador)
  on table public.escenario to authenticated;
grant update (titulo, descripcion, categoria, dificultad, competencia_central,
              configuracion_3d, borrador, activo)
  on table public.escenario to authenticated;

grant insert (escenario_id, nombre, edad, perfil_clinico, prompt_sistema)
  on table public.npc to authenticated;
grant update (nombre, edad, perfil_clinico, prompt_sistema)
  on table public.npc to authenticated;

create policy "escenario: el docente crea sus casos"
  on public.escenario for insert to authenticated
  with check ((select public.es_docente()) and docente_id = (select auth.uid()));

-- Un caso propio no se borra (hay sesiones que lo referencian): se archiva con `activo = false`.
create policy "escenario: el docente modifica sus casos"
  on public.escenario for update to authenticated
  using ((select public.es_docente()) and docente_id = (select auth.uid()))
  with check ((select public.es_docente()) and docente_id = (select auth.uid()));

create policy "npc: el docente crea el NPC de sus casos"
  on public.npc for insert to authenticated
  with check (
    (select public.es_docente())
    and exists (
      select 1 from public.escenario e
      where e.id = escenario_id and e.docente_id = (select auth.uid())
    )
  );

create policy "npc: el docente modifica el NPC de sus casos"
  on public.npc for update to authenticated
  using (
    (select public.es_docente())
    and exists (
      select 1 from public.escenario e
      where e.id = escenario_id and e.docente_id = (select auth.uid())
    )
  )
  with check (
    (select public.es_docente())
    and exists (
      select 1 from public.escenario e
      where e.id = escenario_id and e.docente_id = (select auth.uid())
    )
  );
