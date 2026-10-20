/**
 * Aplica la migración 20261018030000_sembrar_escenarios_e07_e12.sql en Supabase con la Management
 * API y la registra en supabase_migrations.schema_migrations (el CLI de Supabase no puede
 * conectarse a este proyecto). Corre todo en una sola transacción: si algo falla, no queda nada.
 * Es idempotente.
 *
 *   node --env-file=.env.local scripts/aplicar-migracion-e07-e12.mjs
 *
 * Requiere SUPABASE_ACCESS_TOKEN en .env.local. No imprime el token.
 */
import { readFileSync } from 'node:fs';

const PROYECTO = 'afqofsneoblsjjdvktsu';
const VERSION = '20261018030000';
const NOMBRE = 'sembrar_escenarios_e07_e12';
const ARCHIVO = `supabase/migrations/${VERSION}_${NOMBRE}.sql`;

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Falta SUPABASE_ACCESS_TOKEN en .env.local.');
  process.exit(1);
}

async function consultar(query, readOnly = false) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROYECTO}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, read_only: readOnly }),
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`Supabase respondió ${res.status}: ${texto}`);
  return JSON.parse(texto);
}

const sql = readFileSync(ARCHIVO, 'utf8');
const registro = `insert into supabase_migrations.schema_migrations (version, name, statements)
  values ('${VERSION}', '${NOMBRE}', array[$registro$${sql}$registro$])
  on conflict (version) do nothing;`;

await consultar(`begin;\n${sql}\n${registro}\ncommit;`);

const filas = await consultar(
  `select e.codigo, e.titulo, n.nombre, n.edad,
          position('Cómo conversas' in n.prompt_sistema) > 0 as como_conversas,
          position('Lo que guardas' in n.prompt_sistema) > 0 as lo_que_guardas
     from public.escenario e join public.npc n on n.escenario_id = e.id
    where e.codigo between 'E-07' and 'E-12' order by e.codigo`,
  true
);
console.table(filas);
const [{ n }] = await consultar(
  `select count(*)::int as n from supabase_migrations.schema_migrations where version = '${VERSION}'`,
  true
);
console.log(
  n === 1 ? `Migración ${VERSION} registrada.` : 'ATENCIÓN: la migración no quedó registrada.'
);
