import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BotonAjustes } from './controles-hud';

const { disponible } = vi.hoisted(() => ({ disponible: { valor: true } }));
vi.mock('@/lib/audio/voz-sistema', () => ({
  callarVozSistema: vi.fn(),
  guardarModoVoz: vi.fn(),
  hablarConVozSistema: vi.fn(),
  leerModoVoz: () => 'inventada',
  suscribirModoVoz: () => () => {},
  vozSistemaDisponible: () => disponible.valor,
}));

async function abrir() {
  const usuario = userEvent.setup();
  render(<BotonAjustes />);
  await usuario.click(screen.getByRole('button', { name: 'Ajustes del consultorio' }));
  return usuario;
}

describe('BotonAjustes (HU-17: menos botones en la barra de la simulación)', () => {
  beforeEach(() => {
    localStorage.clear();
    disponible.valor = true;
    document.exitPointerLock = vi.fn();
  });

  it('es un solo botón con nombre accesible', () => {
    render(<BotonAjustes />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Ajustes del consultorio' })).toBeInTheDocument();
  });

  it('libera el ratón al abrirse (con el ratón capturado no se puede usar un menú)', async () => {
    await abrir();
    expect(document.exitPointerLock).toHaveBeenCalled();
  });

  it('reúne el ambiente emocional y la voz del paciente', async () => {
    await abrir();
    expect(screen.getByRole('switch', { name: 'Ambiente emocional' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Voz del paciente' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Voz inventada/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Voz del sistema/ })).not.toBeChecked();
  });

  it('el ambiente emocional se activa y se desactiva, y lo anuncia', async () => {
    const usuario = await abrir();
    const interruptor = screen.getByRole('switch', { name: 'Ambiente emocional' });
    expect(interruptor).toBeChecked();
    expect(screen.getByText('Ambiente emocional activado')).toBeInTheDocument();

    await usuario.click(interruptor);
    expect(interruptor).not.toBeChecked();
    expect(screen.getByText('Ambiente emocional desactivado')).toBeInTheDocument();
  });

  it('aclara que el ambiente no mide el desempeño', async () => {
    await abrir();
    expect(screen.getByText(/No mide tu desempeño/)).toBeInTheDocument();
  });

  it('si el navegador no trae voz en español, solo ofrece el ambiente', async () => {
    disponible.valor = false;
    await abrir();
    expect(screen.getByRole('switch', { name: 'Ambiente emocional' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });
});
