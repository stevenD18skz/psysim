import { type DetalleSesion, type SesionActiva } from '@/types';

/** Sesión activa de ejemplo (E-01, Marta Lucía) para los tests de componentes. */
export const SESION_ACTIVA: SesionActiva = {
  id: '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60',
  inicio: '2026-09-30T15:00:00.000Z',
  comenzada: true,
  estudiante: { codigo: '202012345', nombre: 'Ana María Pérez' },
  escenario: {
    id: '0f8fad5b-d9cb-469f-a165-70867728950e',
    codigo: 'E-01',
    titulo: 'Duelo y pérdida',
    descripcion: 'Caso de prueba.',
    categoria: 'clinico',
    dificultad: 'basico',
    competenciaCentral: 'Empatía y validación emocional',
    configuracion3d: 'scenes/e-01.json',
  },
  npc: {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    nombre: 'Marta Lucía',
    edad: 58,
    perfilClinico: 'Viuda reciente.',
  },
};

/** Sesión terminada de ejemplo con una intervención y su respuesta. */
export const DETALLE_SESION: DetalleSesion = {
  id: SESION_ACTIVA.id,
  estado: 'finalizada',
  comenzada: true,
  inicio: '2026-10-20T15:00:00.000Z',
  fin: '2026-10-20T15:05:30.000Z',
  estudiante: { id: 'e1', codigo: '202012345', nombre: 'Ana María Pérez' },
  docente: 'Docente de Prueba',
  escenario: {
    codigo: 'E-01',
    titulo: 'Duelo y pérdida',
    competenciaCentral: 'Empatía y validación emocional',
    configuracion3d: 'scenes/e-01.json',
  },
  npc: { nombre: 'Marta Lucía', edad: 58 },
  mensajes: [
    {
      id: 'm1',
      remitente: 'estudiante',
      contenido: 'Hola, Marta. ¿Cómo ha estado?',
      timestamp: '2026-10-20T15:01:00.000Z',
    },
    {
      id: 'm2',
      remitente: 'npc',
      contenido: 'Pues... ahí, sobreviviendo.',
      timestamp: '2026-10-20T15:01:03.000Z',
      latencia_ms: 1820,
    },
  ],
  intentos: [],
  retroalimentacion: null,
};
