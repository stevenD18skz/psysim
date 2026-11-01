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

/**
 * HU-24 · T01 — Los seis primeros pacientes (E-01 a E-06) ganan «Cómo conversas» y «Lo que
 * guardas» en una migración que añade texto al prompt sembrado en el Sprint 2.
 */
const MIGRACION_ORIGINALES = path.resolve(
  process.cwd(),
  'supabase/migrations/20261018020000_pacientes_lo_que_guardan.sql'
);
const SIEMBRA_ORIGINAL = path.resolve(
  process.cwd(),
  'supabase/migrations/20260930010100_sembrar_escenarios.sql'
);

function leerExtras() {
  const sql = readFileSync(MIGRACION_ORIGINALES, 'utf8');
  const patron = /\('(E-\d+)', \$p\$([\s\S]*?)\$p\$\)/g;
  return [...sql.matchAll(patron)].map(([, codigo, extra]) => ({
    codigo: codigo!,
    extra: extra!,
  }));
}

function leerSembrados() {
  const sql = readFileSync(SIEMBRA_ORIGINAL, 'utf8');
  const patron = /\('(E-\d+)', '([^']+)', (\d+)::smallint,[\s\S]*?\$p\$([\s\S]*?)\$p\$\)/g;
  return [...sql.matchAll(patron)].map(([, codigo, nombre, edad, prompt]) => ({
    codigo: codigo!,
    nombre: nombre!,
    edad: Number(edad),
    prompt: prompt!,
  }));
}

describe('prompts definitivos de los escenarios E-01 a E-06 (HU-24 · T01)', () => {
  const extras = leerExtras();
  const sembrados = leerSembrados();
  const CODIGOS_ORIGINALES = ['E-01', 'E-02', 'E-03', 'E-04', 'E-05', 'E-06'];

  it('la siembra y la migración cubren los seis pacientes', () => {
    expect(sembrados.map(p => p.codigo)).toEqual(CODIGOS_ORIGINALES);
    expect(extras.map(p => p.codigo)).toEqual(CODIGOS_ORIGINALES);
  });

  it.each(extras)(
    '$codigo añade «Cómo conversas» y «Lo que guardas» con condiciones',
    ({ extra }) => {
      const conversa = extra.indexOf('Cómo conversas:');
      const guarda = extra.indexOf('Lo que guardas (no lo cuentes de entrada):');
      expect(conversa).toBe(0);
      expect(guarda).toBeGreaterThan(conversa);

      const secretos = extra
        .slice(guarda)
        .split('\n')
        .filter(linea => linea.startsWith('- '));
      expect(secretos.length).toBeGreaterThanOrEqual(2);
      // Cada dato guardado dice cuándo se revela («solo si…» o «solo cuando…»).
      for (const secreto of secretos) expect(secreto).toMatch(/Lo cuentas solo (si|cuando)/);
    }
  );

  it.each(sembrados)(
    '$codigo ($nombre) tiene una personalidad coherente con su perfil',
    ({ prompt, nombre, edad }) => {
      expect(prompt).toMatch(new RegExp(`^Eres ${nombre},`));
      expect(prompt).toContain(`${edad} años`);
      expect(prompt).toContain('Estado actual:');
      expect(prompt).not.toContain('Reglas de interpretación');
    }
  );

  it.each(sembrados)(
    '$codigo usa la misma frase de apertura que la portada',
    ({ codigo, prompt, nombre }) => {
      const publico = ESCENARIOS_PUBLICOS.find(e => e.codigo === codigo);
      expect(publico).toBeDefined();
      expect(prompt).toContain(`"${publico!.paciente.apertura}"`);
      expect(publico!.paciente.nombre).toBe(nombre);
    }
  );

  it('E-03 solo admite la ideación pasiva si se pregunta directo y no describe métodos', () => {
    const e03 = sembrados.find(p => p.codigo === 'E-03')!.prompt;
    expect(e03).toContain('pregunta de forma directa y respetuosa');
    expect(e03).toContain('No describas métodos');
  });
});
