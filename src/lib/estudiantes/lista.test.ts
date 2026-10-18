import { describe, expect, it } from 'vitest';

import { type EstudianteRegistrado } from '@/types';

import { listarEstudiantes } from './lista';

function estudiante(
  nombre: string,
  metricas: Partial<EstudianteRegistrado['metricas']> = {},
  cuentaVinculada = true
): EstudianteRegistrado {
  return {
    id: nombre,
    codigo: nombre.slice(0, 3).toUpperCase(),
    nombre,
    correo: cuentaVinculada ? `${nombre}@correounivalle.edu.co` : null,
    cuentaVinculada,
    creadoEn: 'T',
    metricas: {
      sesiones: 0,
      finalizadas: 0,
      enCurso: 0,
      pendientesRetroalimentacion: 0,
      notaPromedio: null,
      codigosPendientes: 0,
      segundosPractica: 0,
      casos: 0,
      intervenciones: 0,
      ultimaSesion: null,
      ...metricas,
    },
  };
}

const lista = [
  estudiante('Zoe', { sesiones: 4, pendientesRetroalimentacion: 2, notaPromedio: 3.5 }),
  estudiante('Ángela', { sesiones: 1, enCurso: 1, ultimaSesion: '2026-10-18T10:00:00Z' }),
  estudiante('Mario', {}, false),
];

describe('listarEstudiantes', () => {
  const nombres = (r: EstudianteRegistrado[]) => r.map(e => e.nombre);

  it('ordena por nombre sin importar las tildes', () => {
    expect(
      nombres(listarEstudiantes(lista, { consulta: '', filtro: 'todos', orden: 'nombre' }))
    ).toEqual(['Ángela', 'Mario', 'Zoe']);
  });

  it('filtra por lo que necesita atención', () => {
    const base = { consulta: '', orden: 'nombre' } as const;
    expect(nombres(listarEstudiantes(lista, { ...base, filtro: 'por-revisar' }))).toEqual(['Zoe']);
    expect(nombres(listarEstudiantes(lista, { ...base, filtro: 'practicando' }))).toEqual([
      'Ángela',
    ]);
    expect(nombres(listarEstudiantes(lista, { ...base, filtro: 'sin-cuenta' }))).toEqual(['Mario']);
    expect(nombres(listarEstudiantes(lista, { ...base, filtro: 'sin-practicas' }))).toEqual([
      'Mario',
    ]);
  });

  it('busca por nombre o correo y ordena por lo pendiente', () => {
    expect(
      nombres(listarEstudiantes(lista, { consulta: 'angela', filtro: 'todos', orden: 'nombre' }))
    ).toEqual(['Ángela']);
    expect(
      nombres(listarEstudiantes(lista, { consulta: '', filtro: 'todos', orden: 'pendientes' }))[0]
    ).toBe('Zoe');
  });
});
