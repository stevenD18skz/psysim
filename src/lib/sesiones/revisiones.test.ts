import { describe, expect, it } from 'vitest';

import { type SesionDocente } from '@/types';

import {
  agruparPorCaso,
  agruparPorEstudiante,
  claveCelda,
  filtrarRevisiones,
  matrizRevisiones,
  ordenarRevisiones,
  revisionesCsv,
  senalesRevision,
} from './revisiones';

const AHORA = new Date('2026-10-18T12:00:00.000Z');

function sesion(datos: Partial<SesionDocente> & { id: string }): SesionDocente {
  return {
    estado: 'finalizada',
    comenzada: true,
    inicio: '2026-10-10T15:00:00.000Z',
    fin: '2026-10-10T15:20:00.000Z',
    ultimaActividad: '2026-10-10T15:20:00.000Z',
    escenario: { codigo: 'E-01', titulo: 'Duelo y pérdida' },
    docente: null,
    retroalimentacion: null,
    estudiante: { id: 'a', nombre: 'Ana Gómez', codigo: '2021001' },
    intervenciones: 8,
    ...datos,
  };
}

const ana1 = sesion({ id: 'ana1' });
const ana2 = sesion({
  id: 'ana2',
  inicio: '2026-10-16T15:00:00.000Z',
  fin: '2026-10-16T15:25:00.000Z',
  escenario: { codigo: 'E-03', titulo: 'Episodio depresivo leve' },
  retroalimentacion: { publicada: true, nota: 4.5 },
});
const bruno = sesion({
  id: 'bruno',
  inicio: '2026-10-17T09:00:00.000Z',
  fin: '2026-10-17T09:02:00.000Z',
  estudiante: { id: 'b', nombre: 'Bruno Díaz', codigo: '2021002' },
  intervenciones: 1,
});
const enCurso = sesion({
  id: 'curso',
  estado: 'en_curso',
  fin: null,
  inicio: '2026-10-18T11:50:00.000Z',
  estudiante: { id: 'c', nombre: 'Carla Ruiz', codigo: '2021003' },
});
const todas = [ana1, ana2, bruno, enCurso];

describe('filtrarRevisiones', () => {
  it('filtra por estado, caso, fecha y búsqueda a la vez', () => {
    const base = { consulta: '', caso: '', periodo: 'todo' } as const;
    expect(filtrarRevisiones(todas, { ...base, vista: 'pendientes' }).map(s => s.id)).toEqual([
      'ana1',
      'bruno',
    ]);
    expect(filtrarRevisiones(todas, { ...base, vista: 'todas', caso: 'E-03' })).toEqual([ana2]);
    expect(filtrarRevisiones(todas, { ...base, vista: 'todas', consulta: 'diaz' })).toEqual([
      bruno,
    ]);
    expect(
      filtrarRevisiones(todas, { ...base, vista: 'todas', periodo: 'semana' }, AHORA).map(s => s.id)
    ).toEqual(['ana2', 'bruno', 'curso']);
  });
});

describe('ordenarRevisiones', () => {
  it('«espera más larga» pone primero lo que terminó antes', () => {
    expect(ordenarRevisiones([bruno, ana1], 'espera').map(s => s.id)).toEqual(['ana1', 'bruno']);
  });

  it('por nota deja al final las que no tienen nota publicada', () => {
    expect(ordenarRevisiones([ana1, ana2, bruno], 'nota')[0]!.id).toBe('ana2');
  });

  it('por estudiante ordena alfabéticamente', () => {
    expect(ordenarRevisiones([enCurso, bruno, ana1], 'estudiante').map(s => s.id)).toEqual([
      'ana1',
      'bruno',
      'curso',
    ]);
  });
});

describe('senalesRevision', () => {
  it('cuenta los días de espera y marca las prácticas muy cortas', () => {
    expect(senalesRevision(ana1, AHORA)).toEqual({ esperaDias: 7, corta: false });
    expect(senalesRevision(bruno, AHORA)).toEqual({ esperaDias: 1, corta: true });
    expect(senalesRevision(ana2, AHORA).esperaDias).toBeNull();
    expect(senalesRevision(enCurso, AHORA)).toEqual({ esperaDias: null, corta: false });
  });
});

describe('agrupaciones', () => {
  it('por estudiante: lo pendiente primero, con su promedio', () => {
    const grupos = agruparPorEstudiante(todas);
    expect(grupos.map(g => g.titulo)).toEqual(['Ana Gómez', 'Bruno Díaz', 'Carla Ruiz']);
    expect(grupos[0]).toMatchObject({ porRevisar: 1, publicadas: 1, promedio: 4.5 });
    expect(grupos[0]!.enlace).toBe('/estudiantes/a');
  });

  it('por caso, en el orden de los códigos', () => {
    expect(agruparPorCaso(todas).map(g => g.clave)).toEqual(['E-01', 'E-03']);
  });

  it('la matriz cruza estudiantes y casos con la práctica más reciente primero', () => {
    const otra = sesion({ id: 'ana0', inicio: '2026-10-01T15:00:00.000Z' });
    const { estudiantes, casos, celdas } = matrizRevisiones([...todas, otra]);
    expect(estudiantes.map(e => e.nombre)).toEqual(['Ana Gómez', 'Bruno Díaz', 'Carla Ruiz']);
    expect(casos.map(c => c.codigo)).toEqual(['E-01', 'E-03']);
    expect(celdas.get(claveCelda('a', 'E-01'))!.map(s => s.id)).toEqual(['ana1', 'ana0']);
    expect(celdas.get(claveCelda('b', 'E-03'))).toBeUndefined();
  });
});

describe('revisionesCsv', () => {
  it('lleva BOM, encabezado y la nota publicada con un decimal', () => {
    const csv = revisionesCsv([ana2, bruno]);
    expect(csv.startsWith('﻿Estudiante,')).toBe(true);
    const lineas = csv.trim().split('\r\n');
    expect(lineas).toHaveLength(3);
    expect(lineas[1]).toContain('Ana Gómez,2021001,E-03');
    expect(lineas[1]).toMatch(/Publicada,4\.5$/);
    expect(lineas[2]).toMatch(/Pendiente,$/);
  });

  it('neutraliza las celdas que una hoja de cálculo leería como fórmula', () => {
    const peligrosa = sesion({
      id: 'x',
      estudiante: { id: 'x', nombre: '=HYPERLINK("http://x")', codigo: '1' },
    });
    expect(revisionesCsv([peligrosa])).toContain(`"'=HYPERLINK(""http://x"")"`);
  });
});
