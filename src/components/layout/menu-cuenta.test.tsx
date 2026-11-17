import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type PerfilUsuario } from '@/types';

import { MenuCuenta } from './menu-cuenta';

function perfilBase(sobre: Partial<PerfilUsuario> = {}): PerfilUsuario {
  return {
    id: 'u-1',
    nombre: 'Camila Andrea Torres',
    correo: 'camila.torres@correounivalle.edu.co',
    codigoInstitucional: '209990012',
    rol: 'docente',
    contrasenaTemporal: false,
    ...sobre,
  };
}

function renderizarMenu(
  props: Partial<React.ComponentProps<typeof MenuCuenta>> & { perfil?: PerfilUsuario } = {}
) {
  const perfil = props.perfil ?? perfilBase();
  const onSalir = props.onSalir ?? vi.fn();
  render(
    <DropdownMenu>
      <DropdownMenuTrigger type="button">Cuenta de {perfil.nombre}</DropdownMenuTrigger>
      <MenuCuenta
        perfil={perfil}
        cerrando={props.cerrando ?? false}
        onSalir={onSalir}
        onCambiarContrasena={props.onCambiarContrasena}
        onNavegar={props.onNavegar}
      />
    </DropdownMenu>
  );
  return { perfil, onSalir };
}

describe('MenuCuenta', () => {
  it('muestra la identidad completa, el rol y los accesos del docente', async () => {
    const user = userEvent.setup();
    const onCambiarContrasena = vi.fn();
    const onNavegar = vi.fn();
    const { perfil, onSalir } = renderizarMenu({ onCambiarContrasena, onNavegar });

    await user.click(screen.getByRole('button', { name: `Cuenta de ${perfil.nombre}` }));

    expect(screen.getByText('Docente')).toBeInTheDocument();
    expect(screen.getByText('CT')).toBeInTheDocument();
    expect(screen.getByText(perfil.nombre)).toBeInTheDocument();
    expect(screen.getByText(perfil.correo)).toBeInTheDocument();
    expect(screen.getByText('Código institucional')).toBeInTheDocument();
    expect(screen.getByText(perfil.codigoInstitucional)).toBeInTheDocument();

    expect(screen.queryByRole('menuitem', { name: /Mis prácticas/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /Herramientas de desarrollo/ })
    ).not.toBeInTheDocument();

    const publica = screen.getByRole('menuitem', { name: 'Ir a la página pública' });
    expect(publica).toHaveAttribute('href', '/');

    const privacidad = screen.getByRole('menuitem', { name: 'Aviso de privacidad' });
    expect(privacidad).toHaveAttribute('href', '/privacidad');

    await user.click(screen.getByRole('menuitem', { name: 'Cambiar contraseña' }));
    expect(onCambiarContrasena).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: `Cuenta de ${perfil.nombre}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));
    expect(onSalir).toHaveBeenCalledTimes(1);
  });

  it('destaca la clave temporal y muestra herramientas internas al Administrador', async () => {
    const user = userEvent.setup();
    const perfil = perfilBase({
      nombre: 'Brayan Narváez',
      rol: 'superadmin',
      contrasenaTemporal: true,
    });
    renderizarMenu({ perfil, onCambiarContrasena: vi.fn() });

    await user.click(screen.getByRole('button', { name: `Cuenta de ${perfil.nombre}` }));

    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('Clave temporal')).toBeInTheDocument();
    const laboratorio = screen.getByRole('menuitem', { name: /Herramientas de desarrollo/ });
    expect(laboratorio).toHaveAttribute('href', '/laboratorio');
  });

  it('muestra Mis prácticas y oculta cambio de contraseña para estudiante', async () => {
    const user = userEvent.setup();
    const perfil = perfilBase({
      nombre: 'Sofía Medina',
      rol: 'estudiante',
    });
    renderizarMenu({ perfil, onCambiarContrasena: vi.fn() });

    await user.click(screen.getByRole('button', { name: `Cuenta de ${perfil.nombre}` }));

    expect(screen.getByText('Estudiante')).toBeInTheDocument();
    const practicas = screen.getByRole('menuitem', { name: 'Mis prácticas' });
    expect(practicas).toHaveAttribute('href', '/practicas');
    expect(screen.queryByRole('menuitem', { name: 'Cambiar contraseña' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /Herramientas de desarrollo/ })
    ).not.toBeInTheDocument();
  });

  it('deshabilita Cerrar sesión mientras cierra la cuenta', async () => {
    const user = userEvent.setup();
    const { perfil } = renderizarMenu({ cerrando: true });

    await user.click(screen.getByRole('button', { name: `Cuenta de ${perfil.nombre}` }));

    const salir = screen.getByRole('menuitem', { name: 'Cerrar sesión' });
    expect(salir).toHaveAttribute('aria-disabled', 'true');
  });
});
