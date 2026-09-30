import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { iniciarSesion } from '@/lib/auth/actions';

import { LoginForm } from './login-form';

vi.mock('@/lib/auth/actions', () => ({ iniciarSesion: vi.fn() }));

const mockIniciarSesion = vi.mocked(iniciarSesion);

function llenarFormulario(correo: string, contrasena: string) {
  const usuario = userEvent.setup();
  return (async () => {
    if (correo) await usuario.type(screen.getByLabelText('Correo institucional'), correo);
    if (contrasena) await usuario.type(screen.getByLabelText('Contraseña'), contrasena);
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  })();
}

describe('LoginForm', () => {
  beforeEach(() => {
    mockIniciarSesion.mockReset();
  });

  it('muestra errores de validación bajo cada campo sin enviar', async () => {
    render(<LoginForm siguiente={null} />);
    await llenarFormulario('correo-invalido', 'corta');

    expect(await screen.findByText('Ingresa un correo electrónico válido.')).toBeVisible();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeVisible();
    expect(screen.getByLabelText('Correo institucional')).toHaveAttribute('aria-invalid', 'true');
    expect(mockIniciarSesion).not.toHaveBeenCalled();
  });

  it('envía los datos normalizados y la ruta siguiente', async () => {
    mockIniciarSesion.mockResolvedValue({ error: 'x' });
    render(<LoginForm siguiente="/simulacion" />);
    await llenarFormulario('Docente@PsySim.test', 'secreta123');

    expect(mockIniciarSesion).toHaveBeenCalledWith(
      { correo: 'docente@psysim.test', contrasena: 'secreta123' },
      '/simulacion'
    );
  });

  it('muestra el error general del servidor', async () => {
    mockIniciarSesion.mockResolvedValue({ error: 'Correo o contraseña incorrectos.' });
    render(<LoginForm siguiente={null} />);
    await llenarFormulario('docente@psysim.test', 'secreta123');

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
  });

  it('deshabilita el botón mientras la petición está en curso', async () => {
    let resolver: (valor: { error: string }) => void = () => {};
    mockIniciarSesion.mockReturnValue(new Promise(r => (resolver = r)));
    render(<LoginForm siguiente={null} />);
    await llenarFormulario('docente@psysim.test', 'secreta123');

    const boton = await screen.findByRole('button', { name: 'Ingresando…' });
    expect(boton).toBeDisabled();

    resolver({ error: 'fin' });
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
  });
});
