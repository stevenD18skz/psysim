import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ESCENARIOS_PUBLICOS } from '@/lib/landing/escenarios';

const MIGRACION = path.resolve(
  process.cwd(),
  'supabase/migrations/20261018030000_sembrar_escenarios_e07_e12.sql'
);

/** Pacientes de la migración: código, nombre, edad y prompt (el texto entre `$p$`). */
function leerPrompts() {
  const sql = readFileSync(MIGRACION, 'utf8');
  const patron = /\('(E-\d+)', '([^']+)', (\d+)::smallint,[\s\S]*?\$p\$([\s\S]*?)\$p\$\)/g;
  return [...sql.matchAll(patron)].map(([, codigo, nombre, edad, prompt]) => ({
    codigo: codigo!,
    nombre: nombre!,
    edad: Number(edad),
    prompt: prompt!,
  }));
}

const pacientes = leerPrompts();
const CODIGOS_NUEVOS = ['E-07', 'E-08', 'E-09', 'E-10', 'E-11', 'E-12'];

describe('prompts de los escenarios E-07 a E-12', () => {
  it('la migración siembra los seis pacientes', () => {
    expect(pacientes.map(p => p.codigo)).toEqual(CODIGOS_NUEVOS);
  });

  it.each(pacientes)('$codigo ($nombre) trae «Cómo conversas» y «Lo que guardas»', ({ prompt }) => {
    const conversa = prompt.indexOf('Cómo conversas:');
    const guarda = prompt.indexOf('Lo que guardas (no lo cuentes de entrada):');
    const apertura = prompt.indexOf('Frase de apertura (úsala en tu primera respuesta): "');

    // Con la misma forma y el mismo orden que arma el constructor de casos.
    expect(conversa).toBeGreaterThan(-1);
    expect(guarda).toBeGreaterThan(conversa);
    expect(apertura).toBeGreaterThan(guarda);

    const secretos = prompt
      .slice(guarda, apertura)
      .split('\n')
      .filter(linea => linea.startsWith('- '));
    expect(secretos).toHaveLength(2);
    for (const secreto of secretos) expect(secreto).toContain('Lo cuentas solo si');
  });

  it.each(pacientes)('$codigo no trae las reglas comunes del servidor', ({ prompt }) => {
    // Las añade `componerInstrucciones`; si se guardaran aquí quedarían recortadas o duplicadas.
    expect(prompt).not.toContain('Reglas de interpretación');
  });

  it.each(pacientes)(
    '$codigo declara el riesgo y habla en segunda persona',
    ({ prompt, nombre }) => {
      expect(prompt).toMatch(new RegExp(`^Eres ${nombre},`));
      expect(prompt).toContain('Riesgo:');
    }
  );

  it.each(pacientes)(
    '$codigo usa la misma frase de apertura que la portada',
    ({ codigo, prompt }) => {
      const publico = ESCENARIOS_PUBLICOS.find(e => e.codigo === codigo);
      expect(publico).toBeDefined();
      expect(prompt).toContain(`"${publico!.paciente.apertura}"`);
      expect(publico!.paciente.nombre).toBe(pacientes.find(p => p.codigo === codigo)!.nombre);
    }
  );
});
