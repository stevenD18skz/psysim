import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IndicadorEnVivo } from '@/components/comun/indicador-en-vivo';
import { BandejaDocente } from '@/components/inicio/bandeja-docente';
import { PanelPlataforma } from '@/components/inicio/panel-plataforma';
import { ResumenOrquestador } from '@/components/inicio/resumen-orquestador';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { type ConfiguracionIa, type MetricasIa } from '@/lib/admin/ia';
import {
  type CodigoPendiente,
  type DocenteAdmin,
  type EstudianteRegistrado,
  type SesionDocente,
} from '@/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/inicio',
}));

const AHORA = new Date('2026-11-17T15:00:00-05:00');

function docenteBase(
  parcial: Partial<DocenteAdmin> & { id: string; nombre: string }
): DocenteAdmin {
  return {
    correo: `${parcial.id}@psysim.test`,
    codigoInstitucional: 'DOC-1',
    rol: 'docente',
    activo: true,
    contrasenaTemporal: false,
    conGoogle: true,
    creadoEn: '2026-09-01T12:00:00Z',
    ultimoAcceso: '2026-11-17T14:00:00Z',
    metricas: {
      estudiantes: 4,
      sesiones: 10,
      enCurso: 1,
      pendientesRetroalimentacion: 3,
      casosPropios: 1,
      ultimaSesion: '2026-11-17T13:00:00Z',
    },
    ...parcial,
  };
}

function estudianteBase(
  parcial: Partial<EstudianteRegistrado> & { id: string; nombre: string; codigo: string }
): EstudianteRegistrado {
  return {
    correo: `${parcial.codigo}@correounivalle.edu.co`,
    cuentaVinculada: true,
    avatarId: null,
    creadoEn: '2026-09-01T12:00:00Z',
    metricas: {
      sesiones: 3,
      finalizadas: 3,
      enCurso: 0,
      pendientesRetroalimentacion: 1,
      notaPromedio: 4.1,
      codigosPendientes: 0,
      segundosPractica: 900,
      casos: 2,
      intervenciones: 18,
      ultimaSesion: '2026-11-17T13:00:00Z',
    },
    ...parcial,
  };
}

function sesionBase(indice: number, estado: 'en_curso' | 'finalizada'): SesionDocente {
  return {
    id: `ses-${indice}`,
    estado,
    comenzada: true,
    inicio: '2026-11-17T14:30:00-05:00',
    fin: estado === 'finalizada' ? '2026-11-17T14:50:00-05:00' : null,
    ultimaActividad: '2026-11-17T14:58:00-05:00',
    escenario: { codigo: `E-0${(indice % 9) + 1}`, titulo: `Caso clínico ${indice}` },
    docente: 'Admin',
    retroalimentacion: null,
    estudiante: {
      id: `est-${indice}`,
      nombre: `Estudiante ${indice}`,
      codigo: `202600${String(indice).padStart(2, '0')}`,
    },
    intervenciones: 6,
  };
}

function codigoBase(indice: number, expiraEn: string): CodigoPendiente {
  return {
    id: `cod-${indice}`,
    codigo: `ABC${String(indice).padStart(3, '0')}`,
    expiraEn,
    creadoEn: '2026-11-16T10:00:00-05:00',
    escenario: { codigo: `E-0${(indice % 9) + 1}`, titulo: `Caso pendiente ${indice}` },
    estudiante: {
      id: `est-${indice}`,
      nombre: `Laura Morales ${indice}`,
      codigo: `2099900${String(indice).padStart(2, '0')}`,
    },
  };
}

describe('PanelPlataforma (KPIs globales arriba y propios abajo)', () => {
  it('ubica Practicando ahora en el tercer puesto superior y dedica la fila inferior al docente', () => {
    const docentes = [
      docenteBase({
        id: 'admin-1',
        nombre: 'Brayan Admin',
        rol: 'superadmin',
        metricas: {
          estudiantes: 2,
          sesiones: 4,
          enCurso: 0,
          pendientesRetroalimentacion: 2,
          casosPropios: 1,
          ultimaSesion: '2026-11-17T12:00:00Z',
        },
      }),
      docenteBase({
        id: 'doc-2',
        nombre: 'Ana Docente',
        metricas: {
          estudiantes: 8,
          sesiones: 20,
          enCurso: 3,
          pendientesRetroalimentacion: 9,
          casosPropios: 2,
          ultimaSesion: '2026-11-17T14:00:00Z',
        },
      }),
    ];
    const estudiantes = [
      estudianteBase({ id: 'e1', nombre: 'Est 1', codigo: '209901', avatarId: 'brujula' }),
      estudianteBase({ id: 'e2', nombre: 'Est 2', codigo: '209902' }),
      estudianteBase({ id: 'e3', nombre: 'Est 3', codigo: '209903' }),
    ];

    render(
      <PanelPlataforma
        docentes={docentes}
        estudiantes={estudiantes}
        adminId="admin-1"
        tuGrupo={{
          estudiantesCount: 1,
          conCuenta: 1,
          porRevisar: 2,
          conBorrador: 1,
          practicandoAhora: 0,
          totalPracticas: 4,
          finalizadas: 3,
          codigosSinUsar: 1,
          notaMedia: 4.5,
        }}
        ahora={AHORA}
      />
    );

    const terminos = screen.getAllByRole('term').map(el => el.textContent?.trim() ?? '');
    expect(terminos[0]).toContain('Docentes activos');
    expect(terminos[1]).toContain('Estudiantes');
    expect(terminos[2]).toContain('Practicando ahora');
    expect(terminos[3]).toContain('Tus estudiantes');
    expect(terminos[4]).toContain('Por revisar');
    expect(terminos[5]).toContain('Tus prácticas');

    // En la fila inferior se ven los datos propios del Administrador (2 por revisar, nota 4,5), no los 11 globales.
    expect(screen.getByText('Nota media 4,5')).toBeInTheDocument();
    expect(screen.getByText('3 terminadas · 1 código')).toBeInTheDocument();
    expect(screen.getByText('Tú')).toBeInTheDocument();
    const filaConAvatar = screen.getByRole('link', { name: 'Est 1' }).closest('li');
    const filaConIniciales = screen.getByRole('link', { name: 'Est 2' }).closest('li');
    expect(filaConAvatar?.querySelector('svg.lucide-compass')).toBeInTheDocument();
    expect(within(filaConIniciales!).getByText('E2')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('BandejaDocente (reorganización, vencimientos y paginación ante 20 ítems)', () => {
  it('muestra el código del estudiante debajo del nombre y «Vence mañana» / «Vence en X días»', () => {
    const codigos = [
      codigoBase(1, '2026-11-18T12:00:00-05:00'),
      codigoBase(2, '2026-11-22T12:00:00-05:00'),
    ];

    render(
      <BandejaDocente
        porRevisar={[sesionBase(1, 'finalizada')]}
        practicando={[sesionBase(2, 'en_curso')]}
        codigos={codigos}
        ahora={AHORA}
        disposicion="riel"
      />
    );

    expect(screen.getByText('209990001')).toBeInTheDocument();
    expect(screen.getByText('Vence mañana')).toBeInTheDocument();
    expect(screen.getByText('Vence en 5 días')).toBeInTheDocument();
  });

  it('pagina localmente cada bloque cuando hay 20 elementos sin alargar la columna', () => {
    const veintePorRevisar = Array.from({ length: 20 }, (_, i) => sesionBase(i + 1, 'finalizada'));
    const veintePracticando = Array.from({ length: 20 }, (_, i) => sesionBase(i + 21, 'en_curso'));
    const veinteCodigos = Array.from({ length: 20 }, (_, i) =>
      codigoBase(i + 1, '2026-11-22T12:00:00-05:00')
    );

    render(
      <BandejaDocente
        porRevisar={veintePorRevisar}
        practicando={veintePracticando}
        codigos={veinteCodigos}
        ahora={AHORA}
        disposicion="riel"
      />
    );

    // En modo riel: Por revisar pagina de 4 en 4, y permite avanzar en el sitio.
    const seccionRevisar = screen.getByRole('region', { name: 'Por revisar' });
    expect(within(seccionRevisar).getByText('1–4 de 20 prácticas')).toBeInTheDocument();
    expect(within(seccionRevisar).getByText('Estudiante 1')).toBeInTheDocument();
    expect(within(seccionRevisar).queryByText('Estudiante 5')).not.toBeInTheDocument();

    fireEvent.click(
      within(seccionRevisar).getByRole('button', { name: 'Siguiente en Por revisar' })
    );
    expect(within(seccionRevisar).getByText('5–8 de 20 prácticas')).toBeInTheDocument();
    expect(within(seccionRevisar).getByText('Estudiante 5')).toBeInTheDocument();

    const seccionCodigos = screen.getByRole('region', { name: 'Códigos sin usar' });
    expect(within(seccionCodigos).getByText('1–3 de 20 códigos')).toBeInTheDocument();
  });
});

describe('ResumenOrquestador', () => {
  const config: ConfiguracionIa = {
    proveedor: 'orquestador',
    orquestadorListo: true,
    cuentasDelGrupo: 2,
    capacidad: 6,
    etiquetas: { docente: 'Principal', c1: 'Cuenta 1', c2: 'Cuenta 2' },
  };

  const metricas: MetricasIa = {
    desde: '2026-11-10T00:00:00Z',
    tope_practicas_por_cuenta: 6,
    proveedores: [
      {
        proveedor: 'orquestador',
        turnos: 90,
        latencia_media_ms: 4200,
        latencia_p95_ms: 8100,
        tokens_entrada: 50000,
        tokens_salida: 3000,
        severidad_media: 2,
        emociones_deducidas: 1,
      },
      {
        proveedor: 'gemini',
        turnos: 10,
        latencia_media_ms: 1500,
        latencia_p95_ms: 2100,
        tokens_entrada: 4000,
        tokens_salida: 400,
        severidad_media: null,
        emociones_deducidas: 0,
      },
    ],
    practicas: {
      total: 10,
      en_orquestador: 9,
      pasaron_a_gemini: 1,
      cierres_por_crisis: 0,
      cierres_por_conducta: 0,
    },
    turnos_de_respaldo: 10,
    cambios: [{ motivo: 'tiempo_agotado', practicas: 1 }],
    eventos: [
      {
        tipo: 'error',
        detalle: 'tiempo_agotado',
        veces: 2,
        espera_media_ms: null,
        espera_maxima_ms: null,
      },
    ],
    cuentas: [{ cuenta: 'c1', practicas: 6, activas: 2, turnos_ultimo_minuto: 3 }],
  };

  it('resume caídas a Gemini, latencia, fallos y motivo principal', () => {
    render(<ResumenOrquestador configuracion={config} metricas={metricas} />);

    expect(screen.getByRole('heading', { name: 'Orquestador de NPC' })).toBeInTheDocument();
    expect(screen.getByText('90 % orquestador')).toBeInTheDocument();
    expect(screen.getByText('1 de 10')).toBeInTheDocument();
    expect(screen.getByText('4,2 s')).toBeInTheDocument();
    expect(screen.getByText('2 errores')).toBeInTheDocument();
    expect(screen.getByText('2 / 6')).toBeInTheDocument();
    expect(screen.getByText('El orquestador tardó demasiado')).toBeInTheDocument();
  });

  it('muestra recuperación accionable cuando las métricas fallan', () => {
    render(<ResumenOrquestador configuracion={config} metricas={null} />);
    expect(screen.getByText(/No pudimos leer las métricas/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Paciente con IA' })).toHaveAttribute(
      'href',
      '/admin/ia'
    );
  });
});

describe('IndicadorEnVivo e InsigniaEstado', () => {
  it('dibuja ondas concéntricas tipo ((o)) sin textos rotos', () => {
    const { container } = render(<IndicadorEnVivo className="size-4" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.querySelectorAll('path')).toHaveLength(4);
    expect(svg?.querySelectorAll('circle')).toHaveLength(1);
  });

  it('usa el ícono ((o)) dentro de InsigniaEstado cuando está en curso', () => {
    const { container } = render(
      <InsigniaEstado estado={{ texto: 'Practicando ahora', tono: 'en-curso' }} />
    );
    expect(screen.getByText('Practicando ahora')).toBeInTheDocument();
    expect(container.querySelectorAll('svg path')).toHaveLength(4);
  });
});
