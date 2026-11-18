/**
 * Sincroniza los casos oficiales (E-01 a E-12) con el orquestador de NPC: crea o actualiza el
 * perfil y el escenario `-3D-` de cada uno y guarda sus id en PsySim (`orquestador_caso`).
 *
 * No hace falta correrlo para que la plataforma funcione: cada caso se sincroniza solo la primera
 * vez que se practica. Sirve para dejarlos listos antes de una clase y para volver a crearlos si
 * se borraron los datos de prueba del orquestador.
 *
 * Uso:  pnpm orquestador:sincronizar              → crea o actualiza lo que haya cambiado
 *       pnpm orquestador:sincronizar --recrear    → vuelve a crear todos (tras un borrado allá)
 *       pnpm orquestador:sincronizar --simular    → muestra qué enviaría, sin llamar al orquestador
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, ORQUESTADOR_URL,
 * ORQUESTADOR_CORREO y ORQUESTADOR_CONTRASENA (docs/orquestador.md). Con --simular bastan las dos
 * primeras.
 */
import { cuentasNecesarias } from '@/lib/orquestador/cuentas';
import { escenarioDelCaso, perfilDelCaso } from '@/lib/orquestador/mapeo';
import { leerCasoParaOrquestador, sincronizarOficiales } from '@/lib/orquestador/sincronizar';
import { createAdminClient } from '@/lib/supabase/admin';

const argumentos = new Set(process.argv.slice(2));
const recrear = argumentos.has('--recrear');
const simular = argumentos.has('--simular');

if (simular) {
  const { data, error } = await createAdminClient()
    .from('escenario')
    .select('id, codigo')
    .is('docente_id', null)
    .eq('activo', true)
    .order('codigo');
  if (error) {
    console.error('No pudimos leer los casos oficiales.');
    process.exit(1);
  }
  for (const { id, codigo } of data) {
    const guardado = await leerCasoParaOrquestador(id);
    if (!guardado) {
      console.info(`${codigo}  sin paciente: no se sincroniza`);
      continue;
    }
    const perfil = perfilDelCaso(guardado.caso);
    const escenario = escenarioDelCaso(guardado.caso);
    console.info(
      `${codigo}  ${perfil.name} · severidad ${escenario.severity} ` +
        `(rango ${perfil.behavior.behavior_min}–${perfil.behavior.behavior_max}) · ` +
        `banderas [${escenario.risk_flags.join(', ')}] · contexto de ${escenario.context.length} caracteres`
    );
  }
  console.info(`\n${data.length} casos. No se llamó al orquestador.`);
  console.info(
    `Para un curso de 30 estudiantes hacen falta ${cuentasNecesarias(30)} cuentas del grupo.`
  );
  process.exit(0);
}

const resultados = await sincronizarOficiales({ recrear });
const ETIQUETA = { al_dia: 'al día', sincronizado: 'sincronizado', error: 'ERROR' } as const;
for (const { codigo, estado } of resultados) console.info(`${codigo}  ${ETIQUETA[estado]}`);

const fallidos = resultados.filter(resultado => resultado.estado === 'error').length;
console.info(
  fallidos === 0
    ? `\n${resultados.length} casos oficiales listos en el orquestador.`
    : `\n${fallidos} de ${resultados.length} casos no se pudieron sincronizar. Revisa las credenciales y vuelve a intentarlo.`
);
process.exit(fallidos === 0 ? 0 : 1);
