-- La cuenta guarda una opción del catálogo de PsySim. NULL muestra las iniciales.
alter table public.usuario
  add column avatar_id text
  constraint usuario_avatar_id_check check (avatar_id in (
    'brote', 'sol', 'marea', 'luna', 'flor', 'brujula', 'montana', 'horizonte',
    'orbita', 'concha', 'hoja', 'destello', 'prisma', 'brisa', 'pluma'
  ));

comment on column public.usuario.avatar_id is
  'Identificador del avatar predefinido de PsySim. NULL muestra las iniciales.';
