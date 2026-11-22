import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { guardarAvatar } from '@/lib/avatares/actions';
import { AppStoreProvider, useAppStore } from '@/store/app-store-provider';
import { type PerfilUsuario } from '@/types';

import { MenuCuenta } from './menu-cuenta';

vi.mock('@/lib/avatares/actions', () => ({ guardarAvatar: vi.fn() }));

beforeEach(() => vi.mocked(guardarAvatar).mockReset());

function perfilBase(sobre: Partial<PerfilUsuario> = {}): PerfilUsuario {
  return {
    id: 'u-1',
    nombre: 'Camila Andrea Torres',
    correo: 'camila.torres@correounivalle.edu.co',
    codigoInstitucional: '209990012',
    rol: 'docente',
    avatarId: null,
    contrasenaTemporal: false,
    ...sobre,
  };
}

function renderizarMenu(
  props: Partial<React.ComponentProps<typeof MenuCuenta>> & { perfil?: PerfilUsuario } = {}
) {
  const perfil = props.perfil ?? perfilBase();
  const onSalir = props.onSalir ?? vi.fn();
  const botonCuenta = createRef<HTMLButtonElement>();

  function Cuenta() {
    const perfilActual = useAppStore(state => state.auth.perfil)!;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger ref={botonCuenta} type="button">
          Cuenta de {perfilActual.nombre}
        </DropdownMenuTrigger>
        <MenuCuenta
          perfil={perfilActual}
          botonCuenta={botonCuenta}
          cerrando={props.cerrando ?? false}
          onSalir={onSalir}
          onCambiarContrasena={props.onCambiarContrasena}
          onNavegar={props.onNavegar}
        />
      </DropdownMenu>
    );
  }

  render(
    <AppStoreProvider estadoInicial={{ auth: { perfil } }}>
      <Cuenta />
    </AppStoreProvider>
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

  it('permite explorar al azar y descartar la selección devolviendo el foco a Cuenta', async () => {
    const user = userEvent.setup();
    const { perfil } = renderizarMenu({ perfil: perfilBase({ rol: 'estudiante' }) });
    const cuenta = screen.getByRole('button', { name: `Cuenta de ${perfil.nombre}` });

    await user.click(cuenta);
    await user.click(screen.getByRole('menuitem', { name: 'Cambiar avatar' }));
    const dialogo = within(await screen.findByRole('dialog', { name: 'Cambiar avatar' }));
    const iniciales = dialogo.getByRole('radio', { name: 'Usar mis iniciales' });
    expect(iniciales).toHaveFocus();
    expect(dialogo.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await user.click(dialogo.getByRole('button', { name: 'Al azar' }));
    expect(iniciales).not.toBeChecked();
    expect(dialogo.getByRole('radio', { checked: true })).toBeChecked();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(cuenta).toHaveFocus());
    expect(guardarAvatar).not.toHaveBeenCalled();

    await user.click(cuenta);
    await user.click(screen.getByRole('menuitem', { name: 'Cambiar avatar' }));
    expect(await screen.findByRole('radio', { name: 'Usar mis iniciales' })).toBeChecked();
  });

  it('mantiene la selección al fallar y muestra el nuevo avatar al guardar de nuevo', async () => {
    const user = userEvent.setup();
    const { perfil } = renderizarMenu();
    const cuenta = screen.getByRole('button', { name: `Cuenta de ${perfil.nombre}` });
    vi.mocked(guardarAvatar)
      .mockResolvedValueOnce({ ok: false, error: 'Inténtalo de nuevo.' })
      .mockResolvedValueOnce({ ok: true, datos: 'brote' })
      .mockResolvedValueOnce({ ok: true, datos: null });

    await user.click(cuenta);
    await user.click(screen.getByRole('menuitem', { name: 'Cambiar avatar' }));
    const brote = await screen.findByRole('radio', { name: 'Brote' });
    await user.click(brote);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Inténtalo de nuevo.');
    expect(brote).toBeChecked();
    expect(guardarAvatar).toHaveBeenLastCalledWith('brote', perfil.id);

    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(cuenta).toHaveFocus());
    await user.click(cuenta);
    await user.click(screen.getByRole('menuitem', { name: 'Cambiar avatar' }));
    expect(await screen.findByRole('radio', { name: 'Brote' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Usar mis iniciales' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(cuenta).toHaveFocus());
    expect(guardarAvatar).toHaveBeenLastCalledWith(null, perfil.id);
  });
});
