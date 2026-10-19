/**
 * Aplica una migración en Supabase con la Management API y la registra en
 * supabase_migrations.schema_migrations (el CLI de Supabase no puede conectarse a este proyecto).
 * Corre todo en una sola transacción: si algo falla, no queda nada. Si la versión ya está
 * registrada, no hace nada.
 *
 *   node --env-file=.env.local scripts/aplicar-migracion.mjs supabase/migrations/<archivo>.sql
 *
 * Requiere SUPABASE_ACCESS_TOKEN en .env.local. No imprime el token.
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const PROYECTO = 'afqofsneoblsjjdvktsu';

const archivo = process.argv[2];
const partes = archivo && /^(\d{14})_(\w+)\.sql$/.exec(basename(archivo));
if (!partes) {
  console.error('Uso: node --env-file=.env.local scripts/aplicar-migracion.mjs <migración>.sql');
  process.exit(1);
}
const [, version, nombre] = partes;

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

const registrada = async () => {
  const [{ n }] = await consultar(
    `select count(*)::int as n from supabase_migrations.schema_migrations where version = '${version}'`,
    true
  );
  return n === 1;
};

if (await registrada()) {
  console.log(`La migración ${version} ya estaba aplicada.`);
  process.exit(0);
}

const sql = readFileSync(archivo, 'utf8');
const registro = `insert into supabase_migrations.schema_migrations (version, name, statements)
  values ('${version}', '${nombre}', array[$registro$${sql}$registro$]);`;

await consultar(`begin;\n${sql}\n${registro}\ncommit;`);

console.log(
  (await registrada())
    ? `Migración ${version} aplicada y registrada.`
    : 'ATENCIÓN: la migración no quedó registrada.'
);
