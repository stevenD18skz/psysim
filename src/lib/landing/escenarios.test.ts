import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CONSULTORIOS } from '@/lib/casos/opciones';
import { avisoDeContenido, recursosDeApoyo } from '@/lib/escenarios/avisos';
import { avatarDeEscena } from '@/lib/pacientes/avatar';

import { ESCENARIOS_PUBLICOS } from './escenarios';

const PUBLIC = path.resolve(process.cwd(), 'public');
const escenas = readdirSync(path.join(PUBLIC, 'scenes')).filter(f => f.endsWith('.json'));

describe('escenarios de la portada', () => {
  it('hay una entrada por cada escena, de E-01 a E-12', () => {
    expect(ESCENARIOS_PUBLICOS.map(e => e.codigo)).toEqual(
      Array.from({ length: 12 }, (_, i) => `E-${String(i + 1).padStart(2, '0')}`)
    );
    expect(escenas).toHaveLength(ESCENARIOS_PUBLICOS.length);
  });

  it.each(ESCENARIOS_PUBLICOS)('$codigo tiene captura, foto, consultorio y aviso propio', e => {
    const ruta = `scenes/${e.codigo.toLowerCase()}.json`;
    expect(existsSync(path.join(PUBLIC, e.imagen.src))).toBe(true);
    expect(existsSync(path.join(PUBLIC, e.paciente.foto))).toBe(true);
    expect(avatarDeEscena(ruta)).toBe(e.paciente.foto);
    expect(CONSULTORIOS.some(c => c.ruta === ruta)).toBe(true);
    // El aviso genérico es el de los casos propios del docente.
    expect(avisoDeContenido(e.codigo).texto).not.toMatch(/^Tu docente creó este caso/);
  });
});

describe('recursos de apoyo', () => {
  it('los casos de riesgo, trauma y violencia muestran los recursos de apoyo', () => {
    for (const codigo of ['E-03', 'E-08', 'E-09', 'E-11']) {
      expect(avisoDeContenido(codigo).conApoyo).toBe(true);
    }
  });

  it('la Línea 155 del caso de violencia queda marcada «por confirmar»', () => {
    const linea = recursosDeApoyo('E-11').find(r => r.texto.includes('Línea 155'));
    expect(linea?.porConfirmar).toBe(true);
    expect(recursosDeApoyo('E-09').some(r => r.texto.includes('155'))).toBe(false);
  });
});
