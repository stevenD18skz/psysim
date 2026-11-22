import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { guardarRetroalimentacion } from '@/lib/retroalimentacion/actions';

import { FormularioRetroalimentacion } from './formulario-retroalimentacion';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  unstable_rethrow: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('@/lib/retroalimentacion/actions', () => ({ guardarRetroalimentacion: vi.fn() }));

const guardar = vi.mocked(guardarRetroalimentacion);
const CUENTA = '11111111-1111-4111-8111-111111111111';
const OTRA_CUENTA = '22222222-2222-4222-8222-222222222222';
const SESION = '33333333-3333-4333-8333-333333333333';
const VERSION = '2026-11-20T15:00:00.123456+00:00';

function abrir(cuentaId = CUENTA) {
  return render(
    <FormularioRetroalimentacion
      cuentaId={cuentaId}
      sesionId={SESION}
      inicial={null}
      nombreEstudiante="Ana de prueba"
      comentarios={0}
      siguiente={null}
    />
  );
}

function editar(comentario: string, nota: string) {
  fireEvent.change(screen.getByLabelText('Comentario general'), { target: { value: comentario } });
  fireEvent.change(screen.getByLabelText(/Nota \(0,0/), { target: { value: nota } });
}

describe('FormularioRetroalimentacion', () => {
  beforeEach(() => {
    sessionStorage.clear();
    guardar.mockReset();
  });

  it('retira el error al corregir la nota y devuelve el foco al cancelar la publicación', () => {
    abrir();
    const campo = screen.getByLabelText(/Nota \(0,0/);
    editar('Comentario pendiente', '6');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(campo).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('La nota máxima es 5,0');

    fireEvent.change(campo, { target: { value: '4,5' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    const volver = screen.getByRole('button', { name: 'Volver' });
    expect(volver).toHaveFocus();
    expect(volver).toHaveAccessibleDescription(/verá la nota/);
    fireEvent.click(volver);
    expect(screen.getByRole('button', { name: 'Publicar' })).toHaveFocus();
    expect(campo).toHaveValue('4,5');
    expect(guardar).not.toHaveBeenCalled();
  });

  it('recupera comentario y nota con coma después de un corte, solo para la misma cuenta', async () => {
    guardar.mockRejectedValue(new Error('sin red'));
    const primera = abrir();
    editar('Comentario pendiente', '4,5');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('revisa tu conexión');
    primera.unmount();

    const otra = abrir(OTRA_CUENTA);
    expect(screen.queryByRole('button', { name: 'Recuperarlo' })).not.toBeInTheDocument();
    otra.unmount();

    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Recuperarlo' }));
    expect(screen.getByLabelText('Comentario general')).toHaveValue('Comentario pendiente');
    expect(screen.getByLabelText(/Nota \(0,0/)).toHaveValue('4,5');
    expect(guardar).toHaveBeenCalledTimes(1);
  });

  it('muestra la versión pública y conserva la edición hasta que el docente confirme un cambio público', async () => {
    const publicada = {
      comentarioGeneral: 'Comentario publicado',
      nota: 4.5,
      publicadaEn: VERSION,
      actualizadoEn: VERSION,
    };
    guardar.mockResolvedValueOnce({ ok: true, datos: { conflicto: true, revision: publicada } });
    guardar.mockResolvedValueOnce({
      ok: true,
      datos: {
        conflicto: false,
        revision: { ...publicada, comentarioGeneral: 'Edición local', nota: 2 },
      },
    });
    abrir();
    editar('Edición local', '2,0');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    expect(await screen.findByText('Comentario publicado')).toBeVisible();
    expect(screen.getByText('4,5')).toBeVisible();
    expect(screen.getByLabelText('Comentario general')).toHaveValue('Edición local');
    expect(
      screen.queryByRole('button', { name: 'Guardar cambios publicados' })
    ).not.toBeInTheDocument();
    expect(guardar).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ modo: 'borrador', version: null })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continuar con mi edición' }));
    expect(guardar).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios publicados' }));
    await waitFor(() =>
      expect(guardar).toHaveBeenNthCalledWith(2, {
        sesionId: SESION,
        modo: 'editar',
        version: VERSION,
        nota: 2,
        comentarioGeneral: 'Edición local',
      })
    );
  });

  it('guarda después de anotar antes de que llegue la versión de la revisión', async () => {
    const inicializada = {
      comentarioGeneral: '',
      nota: null,
      publicadaEn: null,
      actualizadoEn: VERSION,
    };
    const edicion = { comentarioGeneral: 'Texto del docente', nota: 4.5 };
    guardar.mockResolvedValueOnce({ ok: true, datos: { conflicto: true, revision: inicializada } });
    guardar.mockResolvedValueOnce({
      ok: true,
      datos: { conflicto: false, revision: { ...inicializada, ...edicion } },
    });
    abrir();
    editar(edicion.comentarioGeneral, '4,5');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    await waitFor(() => expect(guardar).toHaveBeenCalledTimes(2));
    expect(guardar).toHaveBeenNthCalledWith(1, {
      ...edicion,
      sesionId: SESION,
      modo: 'borrador',
      version: null,
    });
    expect(guardar).toHaveBeenNthCalledWith(2, {
      ...edicion,
      sesionId: SESION,
      modo: 'borrador',
      version: VERSION,
    });
    await waitFor(() =>
      expect(sessionStorage.getItem(`psysim:borrador-retro:${CUENTA}:${SESION}:general`)).toBeNull()
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mantiene el conflicto si otra pestaña publica durante el reintento', async () => {
    const inicializada = {
      comentarioGeneral: '',
      nota: null,
      publicadaEn: null,
      actualizadoEn: VERSION,
    };
    guardar.mockResolvedValueOnce({ ok: true, datos: { conflicto: true, revision: inicializada } });
    guardar.mockResolvedValueOnce({
      ok: true,
      datos: {
        conflicto: true,
        revision: { ...inicializada, nota: 3, publicadaEn: '2026-11-20T15:00:01+00:00' },
      },
    });
    abrir();
    editar('Edición local', '4,5');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La retroalimentación publicada cambió'
    );
    expect(screen.getByLabelText('Comentario general')).toHaveValue('Edición local');
    expect(guardar).toHaveBeenCalledTimes(2);
  });
});
