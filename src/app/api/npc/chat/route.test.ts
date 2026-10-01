import { beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenerSesionDocente } from '@/lib/auth/dal';
import type * as ModuloPaciente from '@/lib/ia/paciente';
import { ErrorIA, generarRespuestaPaciente } from '@/lib/ia/paciente';
import { createClient } from '@/lib/supabase/server';

import { POST } from './route';

vi.mock('@/lib/auth/dal', () => ({ obtenerSesionDocente: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/ia/paciente', async importOriginal => ({
  ...(await importOriginal<typeof ModuloPaciente>()),
  generarRespuestaPaciente: vi.fn(),
}));

const SESION_ID = '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60';
const NPC_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const cuerpoValido = {
  sesion_id: SESION_ID,
  npc_id: NPC_ID,
  mensaje_usuario: 'Hola, ¿cómo se ha sentido?',
  historial: [],
};

const sesionEnCurso = {
  estado: 'en_curso',
  comenzada: true,
  prompt_sistema: 'Eres Marta Lucía, 58 años.',
  escenario: { npc: { id: NPC_ID, nombre: 'Marta Lucía' } },
};

/** Cliente de Supabase falso: devuelve la sesión indicada y registra las inserciones. */
function clienteFalso(sesion: unknown, opciones: { errorInsercion?: boolean } = {}) {
  const insert = vi.fn().mockResolvedValue({
    error: opciones.errorInsercion ? { code: '42501' } : null,
  });
  const consulta = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: sesion, error: null }),
  };
  const cliente = {
    from: vi.fn((tabla: string) => (tabla === 'mensaje' ? { insert } : consulta)),
  };
  vi.mocked(createClient).mockResolvedValue(cliente as never);
  return { insert, consulta };
}

function peticion(cuerpo: unknown) {
  return new Request('http://localhost/api/npc/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  });
}

describe('POST /api/npc/chat', () => {
  beforeEach(() => {
    vi.mocked(obtenerSesionDocente).mockResolvedValue({
      estado: 'autorizado',
      perfil: {
        id: 'd0c3e7e4-0000-4000-8000-000000000001',
        nombre: 'Docente',
        correo: 'docente@psysim.test',
        codigoInstitucional: 'DOC-1',
        rol: 'docente',
      },
    });
    vi.mocked(generarRespuestaPaciente).mockResolvedValue({
      texto: 'Buenas... no sé muy bien por dónde empezar.',
      tokensEntrada: 512,
      tokensSalida: 21,
      modelo: 'gemini-3.5-flash',
    });
  });

  it('HU-12 · T05: con un cuerpo válido responde 200 con la respuesta del NPC', async () => {
    const { insert } = clienteFalso(sesionEnCurso);
    const respuesta = await POST(peticion(cuerpoValido));

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
    const json = await respuesta.json();
    expect(json).toEqual({
      respuesta_npc: 'Buenas... no sé muy bien por dónde empezar.',
      timestamp_respuesta: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      tokens_entrada: 512,
      tokens_salida: 21,
    });

    // Usa el prompt de la sesión y el mensaje del estudiante.
    expect(generarRespuestaPaciente).toHaveBeenCalledWith({
      promptSistema: sesionEnCurso.prompt_sistema,
      historial: [],
      mensaje: cuerpoValido.mensaje_usuario,
      nombrePaciente: 'Marta Lucía',
    });

    // Guarda el intercambio completo en una sola inserción.
    expect(insert).toHaveBeenCalledWith([
      { sesion_id: SESION_ID, remitente: 'estudiante', contenido: cuerpoValido.mensaje_usuario },
      expect.objectContaining({
        sesion_id: SESION_ID,
        remitente: 'npc',
        contenido: 'Buenas... no sé muy bien por dónde empezar.',
        tokens_entrada: 512,
        tokens_salida: 21,
        latencia_ms: expect.any(Number),
      }),
    ]);
  });

  it('HU-12 · T05: con un cuerpo que no pasa Zod responde 400 con el detalle por campo', async () => {
    clienteFalso(sesionEnCurso);
    const respuesta = await POST(
      peticion({ ...cuerpoValido, sesion_id: 'x', mensaje_usuario: '' })
    );

    expect(respuesta.status).toBe(400);
    const json = await respuesta.json();
    expect(Object.keys(json.campos).sort()).toEqual(['mensaje_usuario', 'sesion_id']);
    expect(generarRespuestaPaciente).not.toHaveBeenCalled();
  });

  it('responde 400 si el cuerpo no es JSON', async () => {
    const respuesta = await POST(peticion('{no-json'));
    expect(respuesta.status).toBe(400);
  });

  it('responde 401 sin sesión y 403 sin rol docente', async () => {
    vi.mocked(obtenerSesionDocente).mockResolvedValueOnce({ estado: 'sin-sesion' });
    expect((await POST(peticion(cuerpoValido))).status).toBe(401);

    vi.mocked(obtenerSesionDocente).mockResolvedValueOnce({ estado: 'sin-permiso' });
    expect((await POST(peticion(cuerpoValido))).status).toBe(403);
    expect(generarRespuestaPaciente).not.toHaveBeenCalled();
  });

  it('HU-12 · T03: responde 404 si la sesión no existe o no es del docente', async () => {
    clienteFalso(null);
    expect((await POST(peticion(cuerpoValido))).status).toBe(404);
  });

  it('HU-12 · T03: responde 404 si el NPC no pertenece a la sesión', async () => {
    clienteFalso({ ...sesionEnCurso, escenario: { npc: { id: 'otro', nombre: 'X' } } });
    const respuesta = await POST(peticion(cuerpoValido));
    expect(respuesta.status).toBe(404);
    expect(generarRespuestaPaciente).not.toHaveBeenCalled();
  });

  it('responde 409 si la sesión ya finalizó', async () => {
    clienteFalso({ ...sesionEnCurso, estado: 'finalizada' });
    expect((await POST(peticion(cuerpoValido))).status).toBe(409);
  });

  it('HU-23: responde 409 si el estudiante aún no comenzó la simulación', async () => {
    clienteFalso({ ...sesionEnCurso, comenzada: false });
    expect((await POST(peticion(cuerpoValido))).status).toBe(409);
  });

  it.each([
    ['tiempo_agotado', 504],
    ['autenticacion', 502],
    ['respuesta_invalida', 502],
    ['proveedor', 502],
    ['limite', 503],
  ] as const)(
    'HU-16 · T01: un error %s de la IA responde %i sin detalles internos',
    async (tipo, status) => {
      const { insert } = clienteFalso(sesionEnCurso);
      vi.mocked(generarRespuestaPaciente).mockRejectedValueOnce(new ErrorIA(tipo));

      const respuesta = await POST(peticion(cuerpoValido));
      expect(respuesta.status).toBe(status);
      const json = await respuesta.json();
      expect(json.error).not.toMatch(/key|token|401|gemini/i);
      // No se guarda un intercambio incompleto.
      expect(insert).not.toHaveBeenCalled();
    }
  );

  it('devuelve la respuesta aunque falle el guardado de los mensajes', async () => {
    clienteFalso(sesionEnCurso, { errorInsercion: true });
    const respuesta = await POST(peticion(cuerpoValido));
    expect(respuesta.status).toBe(200);
  });
});
