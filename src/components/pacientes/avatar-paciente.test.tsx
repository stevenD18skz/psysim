import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { avatarDeEscena } from '@/lib/pacientes/avatar';

import { AvatarPaciente } from './avatar-paciente';

describe('avatarDeEscena', () => {
  it('asigna un rostro a cada escena y ninguno a las desconocidas', () => {
    expect(avatarDeEscena('scenes/e-01.json')).toBe('/pacientes/marta-lucia.webp');
    expect(avatarDeEscena('scenes/e-06.json')).toBe('/pacientes/santiago.webp');
    expect(avatarDeEscena('scenes/otra.json')).toBeNull();
  });
});

describe('AvatarPaciente', () => {
  it('muestra las iniciales si no hay imagen', () => {
    render(<AvatarPaciente src={null} nombre="Marta Lucía" />);
    expect(screen.getByText('ML')).toBeInTheDocument();
  });

  it('muestra el rostro y vuelve a las iniciales si la imagen no carga', () => {
    const { container } = render(
      <AvatarPaciente src="/pacientes/marta-lucia.webp" nombre="Marta Lucía" />
    );
    const imagen = container.querySelector('img');
    expect(imagen).not.toBeNull();
    expect(screen.queryByText('ML')).not.toBeInTheDocument();

    fireEvent.error(imagen!);
    expect(screen.getByText('ML')).toBeInTheDocument();
  });
});
