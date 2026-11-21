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
});
