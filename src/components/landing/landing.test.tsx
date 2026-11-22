import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ManualPage from '@/app/manual/page';
import { CicloPractica } from '@/components/landing/ciclo-practica';
import { EscenariosGaleria } from '@/components/landing/escenarios-galeria';
import { HeroConsultorio } from '@/components/landing/hero-consultorio';
import { RevisionIlustrativa } from '@/components/landing/revision-ilustrativa';
import { ESCENARIOS_PUBLICOS } from '@/lib/landing/escenarios';

describe('componentes de la portada y manual', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('HeroConsultorio alterna casos al azar sin controles manuales', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.spyOn(Math, 'random').mockReturnValue(0.2);

    render(<HeroConsultorio escenarios={ESCENARIOS_PUBLICOS} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/Marta Lucía, 58 años/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6500);
    });
    expect(screen.queryByText(/Marta Lucía, 58 años/)).not.toBeInTheDocument();
  });

  it('CicloPractica recorre la línea de 5 pasos y enlaza al manual', async () => {
    const usuario = userEvent.setup();
    render(<CicloPractica />);

    expect(screen.getByText('Paso 1 de 5')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Conversas en el consultorio 3D/ }));
    expect(screen.getByText('Paso 4 de 5')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Consultar el manual de uso/ })).toHaveAttribute(
      'href',
      '/manual'
    );
  });

  it('EscenariosGaleria filtra por tipo y abre el detalle de cada caso', async () => {
    const usuario = userEvent.setup();
    render(<EscenariosGaleria />);

    expect(screen.getByText('12 casos disponibles para asignar')).toBeInTheDocument();

    const grupoFiltro = screen.getByRole('group', { name: 'Filtrar casos por tipo' });
    await usuario.click(within(grupoFiltro).getByRole('button', { name: /Cotidiano/ }));
    expect(screen.getByText('Mostrando 3 casos de tipo cotidiano')).toBeInTheDocument();

    await usuario.click(within(grupoFiltro).getByRole('button', { name: /Todos/ }));
    await usuario.click(screen.getByRole('button', { name: /Duelo y pérdida/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('1 / 12')).toBeInTheDocument();
  });

  it('RevisionIlustrativa sincroniza las frases subrayadas con las anotaciones', async () => {
    const usuario = userEvent.setup();
    render(<RevisionIlustrativa />);

    const botonFrase2 = screen.getByRole('button', {
      name: /¿En algún momento has sentido que no vale la pena seguir intentando\?/,
    });
    expect(botonFrase2).toHaveAttribute('aria-pressed', 'false');

    await usuario.click(botonFrase2);
    expect(botonFrase2).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /Exploración del riesgo con tacto/ })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('ManualPage muestra la guía completa y enlaza al aviso de privacidad', () => {
    render(<ManualPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Manual de uso de PsySim' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /aviso de privacidad y tratamiento de datos/i })
    ).toHaveAttribute('href', '/privacidad');
  });
});
