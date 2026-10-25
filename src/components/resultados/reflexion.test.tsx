import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { guardarReflexion } from '@/lib/reflexion/actions';

import { ReflexionEstudiante, ReflexionLeida } from './reflexion';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/reflexion/actions', () => ({ guardarReflexion: vi.fn() }));

const SESION_ID = '44444444-4444-4444-8444-444444444444';
const GUARDADA = { contenido: 'Me sirvió validar.', actualizadoEn: '2026-10-25T15:00:00.000Z' };

describe('ReflexionEstudiante', () => {
  beforeEach(() => {
    vi.mocked(guardarReflexion).mockResolvedValue({ ok: true, datos: { retirada: false } });
  });

  it('dice con claridad que es opcional y que la lee el docente', () => {
    render(<ReflexionEstudiante sesionId={SESION_ID} inicial={null} />);
    expect(screen.getByRole('heading', { name: /Tu reflexión \(opcional\)/ })).toBeInTheDocument();
    expect(screen.getByText(/Tu docente la leerá junto con la conversación/)).toBeInTheDocument();
    expect(screen.getByText('¿Qué harías distinto la próxima vez?')).toBeInTheDocument();
  });

  it('sin cambios no se puede guardar', () => {
    render(<ReflexionEstudiante sesionId={SESION_ID} inicial={null} />);
    expect(screen.getByRole('button', { name: 'Guardar reflexión' })).toBeDisabled();
  });

  it('guarda lo escrito y lo confirma', async () => {
    const usuario = userEvent.setup();
    render(<ReflexionEstudiante sesionId={SESION_ID} inicial={null} />);

    await usuario.type(screen.getByLabelText('Tu reflexión'), '  Hablé poco.  ');
    await usuario.click(screen.getByRole('button', { name: 'Guardar reflexión' }));

    expect(guardarReflexion).toHaveBeenCalledWith({
      sesionId: SESION_ID,
      contenido: 'Hablé poco.',
    });
    expect(toast.success).toHaveBeenCalledWith('Reflexión guardada.');
    expect(screen.getByRole('status')).toHaveTextContent(/Guardada el/);
    expect(screen.getByRole('button', { name: 'Guardar reflexión' })).toBeDisabled();
  });

  it('carga la reflexión ya guardada', () => {
    render(<ReflexionEstudiante sesionId={SESION_ID} inicial={GUARDADA} />);
    expect(screen.getByLabelText('Tu reflexión')).toHaveValue('Me sirvió validar.');
    expect(screen.getByRole('status')).toHaveTextContent(/Guardada el/);
  });

  it('avisa si hay cambios sin guardar', async () => {
    const usuario = userEvent.setup();
    render(<ReflexionEstudiante sesionId={SESION_ID} inicial={GUARDADA} />);
    await usuario.type(screen.getByLabelText('Tu reflexión'), ' Más.');

    expect(screen.getByRole('status')).toHaveTextContent('con cambios sin guardar');
    expect(screen.getByRole('button', { name: 'Guardar reflexión' })).toBeEnabled();
  });

  it('vaciar el texto la retira', async () => {
    vi.mocked(guardarReflexion).mockResolvedValue({ ok: true, datos: { retirada: true } });
    const usuario = userEvent.setup();
    render(<ReflexionEstudiante sesionId={SESION_ID} inicial={GUARDADA} />);

    await usuario.clear(screen.getByLabelText('Tu reflexión'));
    await usuario.click(screen.getByRole('button', { name: 'Retirar reflexión' }));

    expect(guardarReflexion).toHaveBeenCalledWith({ sesionId: SESION_ID, contenido: '' });
    expect(toast.success).toHaveBeenCalledWith('Reflexión retirada.');
    expect(screen.queryByText(/Guardada el/)).not.toBeInTheDocument();
  });

  it('si no se puede guardar muestra el error y conserva lo escrito', async () => {
    vi.mocked(guardarReflexion).mockResolvedValue({ ok: false, error: 'No fue posible.' });
    const usuario = userEvent.setup();
    render(<ReflexionEstudiante sesionId={SESION_ID} inicial={null} />);

    await usuario.type(screen.getByLabelText('Tu reflexión'), 'Texto');
    await usuario.click(screen.getByRole('button', { name: 'Guardar reflexión' }));

    expect(toast.error).toHaveBeenCalledWith('No fue posible.');
    expect(screen.getByLabelText('Tu reflexión')).toHaveValue('Texto');
    expect(screen.getByRole('button', { name: 'Guardar reflexión' })).toBeEnabled();
  });

  it('sin conexión avisa y conserva lo escrito', async () => {
    vi.mocked(guardarReflexion).mockRejectedValue(new Error('network'));
    const usuario = userEvent.setup();
    render(<ReflexionEstudiante sesionId={SESION_ID} inicial={null} />);

    await usuario.type(screen.getByLabelText('Tu reflexión'), 'Texto');
    await usuario.click(screen.getByRole('button', { name: 'Guardar reflexión' }));

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('revisa tu conexión'));
    expect(screen.getByLabelText('Tu reflexión')).toHaveValue('Texto');
  });
});

describe('ReflexionLeida', () => {
  it('muestra la reflexión al docente con el nombre del estudiante', () => {
    render(
      <ReflexionLeida
        contenido={'Primera línea.\nSegunda línea.'}
        actualizadoEn="2026-10-25T15:00:00.000Z"
        estudiante="Ana Pérez"
      />
    );
    expect(screen.getByRole('heading', { name: 'Reflexión de Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByText(/Primera línea\./)).toBeInTheDocument();
    expect(screen.getByText(/punto de partida de la conversación posterior/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
