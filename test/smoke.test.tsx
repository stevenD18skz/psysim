import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// La landing incluye el formulario del código (usa el router) y el botón de Google (acción del
// servidor): en el entorno de pruebas se sustituyen.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/auth/actions', () => ({ iniciarSesionConGoogle: vi.fn() }));

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
        name: 'Practica la entrevista clínica con un paciente que responde.',
      })
    ).toBeInTheDocument();
    // La puerta del estudiante (código) y la del docente (login con contraseña desplegada).
    expect(screen.getByRole('form', { name: 'Tengo un código' })).toBeInTheDocument();
    const enlaces = screen.getAllByRole('link', { name: /Ingresar como docente|Soy docente/ });
    expect(enlaces.length).toBeGreaterThanOrEqual(1);
    for (const enlace of enlaces) expect(enlace).toHaveAttribute('href', '/login?docente=1');
  });
});
