import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 0 · T09 — Smoke test: los módulos principales del proyecto importan y renderizan.
 */
describe('smoke', () => {
  it('valida las variables de entorno públicas', async () => {
    const { publicEnv } = await import('@/lib/env/public');
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('http://localhost:54321');
  });

  it('renderiza la página de inicio', async () => {
    const { default: Home } = await import('@/app/page');
    render(<Home />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Un consultorio virtual para practicar la entrevista clínica',
      })
    ).toBeInTheDocument();
    // Hay un CTA en la presentación y otro fijo para móvil: ambos llevan al login.
    const enlaces = screen.getAllByRole('link', { name: /Ingresar como docente/ });
    expect(enlaces.length).toBeGreaterThanOrEqual(1);
    for (const enlace of enlaces) expect(enlace).toHaveAttribute('href', '/login');
  });
});
