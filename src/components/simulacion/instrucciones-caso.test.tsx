import { renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { comenzarSesion } from '@/lib/escenarios/actions';
import { AppStoreProvider, useAppStoreApi } from '@/store/app-store-provider';

import { SESION_ACTIVA } from '../../../test/fixtures';

import { InstruccionesCaso } from './instrucciones-caso';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  unstable_rethrow: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/lib/escenarios/actions', () => ({ comenzarSesion: vi.fn() }));

const SESION = { ...SESION_ACTIVA, comenzada: false };
const INICIO = '2026-10-20T15:00:00.000Z';

function montar(segundosParaCierre: number | null = null) {
  const envoltorio = ({ children }: { children: React.ReactNode }) => (
    <AppStoreProvider estadoInicial={{ sesion: { activa: SESION } }}>
      <InstruccionesCaso sesion={SESION} segundosParaCierre={segundosParaCierre} />
      {children}
    </AppStoreProvider>
  );
  return renderHook(() => useAppStoreApi(), { wrapper: envoltorio }).result;
}

describe('InstruccionesCaso (HU-23)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(comenzarSesion).mockResolvedValue({ ok: true, datos: { inicio: INICIO } });
  });

  describe('T01/T02: contenido del caso y del estudiante', () => {
    it('es un diálogo con el título del caso como nombre', () => {
      montar();
      expect(screen.getByRole('dialog', { name: /Duelo y pérdida/ })).toBeInTheDocument();
    });

    it('muestra la competencia, los objetivos, la descripción y el paciente', () => {
      montar();
      expect(screen.getByText('Competencia que practicarás')).toBeInTheDocument();
      expect(screen.getByText('Empatía y validación emocional')).toBeInTheDocument();
      expect(screen.getByText('Objetivos de esta práctica')).toBeInTheDocument();
      expect(screen.getByText('Caso de prueba.')).toBeInTheDocument();
      expect(screen.getByText('Marta Lucía')).toBeInTheDocument();
      expect(screen.getByText('58 años')).toBeInTheDocument();
      expect(screen.getByText('Viuda reciente.')).toBeInTheDocument();
    });

    it('muestra con qué nombre y código practica el estudiante', () => {
      montar();
      expect(screen.getByText('Ana María Pérez')).toBeInTheDocument();
      expect(screen.getByText('202012345')).toBeInTheDocument();
    });

    it('explica las reglas de la práctica, incluido que no se puede reanudar', () => {
      montar();
      const reglas = screen.getByRole('region', { name: 'Contenido de las instrucciones' });
      expect(within(reglas).getByText(/Conversas con una IA/)).toBeInTheDocument();
      expect(within(reglas).getByText(/no se puede reanudar/)).toBeInTheDocument();
      expect(within(reglas).getByText(/10 minutos sin actividad/)).toBeInTheDocument();
    });

    it('muestra el aviso de contenido del caso con la salida «Ahora no»', () => {
      montar();
      expect(screen.getByText('De qué trata este caso')).toBeInTheDocument();
      expect(screen.getByText(/elegir «Ahora no»/)).toBeInTheDocument();
    });

    it('los controles salen desplegados la primera vez', () => {
      montar();
      expect(screen.getByRole('button', { name: /Controles y herramientas/ })).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });

    it('y plegados después de haber empezado una práctica', () => {
      localStorage.setItem('psysim:guia-sesion-vista', '1');
      montar();
      expect(screen.getByRole('button', { name: /Controles y herramientas/ })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });

    it('avisa de la inactividad dentro del diálogo, sin abrir otro modal', () => {
      montar(42);
      expect(screen.getByText(/42 s/)).toBeInTheDocument();
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
    });
  });

  describe('T03: acciones y transición al inicio', () => {
    it('no se puede empezar sin aceptar el aviso de privacidad', async () => {
      montar();
      const empezar = screen.getByRole('button', { name: 'Empezar la práctica' });
      expect(empezar).toBeDisabled();
      expect(screen.getByText('Marca la casilla de privacidad para empezar.')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('checkbox', { name: /Leí el aviso de privacidad/ }));
      expect(empezar).toBeEnabled();
      expect(screen.queryByText('Marca la casilla de privacidad para empezar.')).toBeNull();
    });

    it('enlaza el aviso de privacidad en otra pestaña', () => {
      montar();
      const enlace = screen.getByRole('link', { name: /Leer el aviso de privacidad/ });
      expect(enlace).toHaveAttribute('href', '/privacidad');
      expect(enlace).toHaveAttribute('target', '_blank');
      expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('«Empezar la práctica» comienza la sesión y fija la hora de inicio de la base de datos', async () => {
      const store = montar();
      await userEvent.click(screen.getByRole('checkbox', { name: /Leí el aviso de privacidad/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Empezar la práctica' }));

      expect(comenzarSesion).toHaveBeenCalledWith({ sesionId: SESION.id });
      expect(store.current.getState().sesion.activa).toMatchObject({
        comenzada: true,
        inicio: INICIO,
      });
    });

    it('recuerda la aceptación: la próxima vez ya no pide marcar la casilla', async () => {
      montar();
      await userEvent.click(screen.getByRole('checkbox', { name: /Leí el aviso de privacidad/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Empezar la práctica' }));
      expect(localStorage.getItem('psysim:privacidad-aceptada')).not.toBeNull();
    });

    it('con la privacidad ya aceptada se puede empezar directamente', () => {
      localStorage.setItem('psysim:privacidad-aceptada', '2026-10-01T10:00:00.000Z');
      montar();
      expect(screen.queryByRole('checkbox', { name: /Leí el aviso/ })).toBeNull();
      expect(screen.getByText(/Aceptaste el aviso de privacidad/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Empezar la práctica' })).toBeEnabled();
    });

    it('si no se puede comenzar avisa y la práctica no empieza', async () => {
      vi.mocked(comenzarSesion).mockResolvedValue({ ok: false, error: 'x' });
      const store = montar();
      await userEvent.click(screen.getByRole('checkbox', { name: /Leí el aviso de privacidad/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Empezar la práctica' }));

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('No pudimos empezar'));
      expect(store.current.getState().sesion.activa?.comenzada).toBe(false);
    });

    it('«Ahora no» confirma el plazo para volver y lleva a Mis prácticas', async () => {
      montar();
      await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));

      const confirmacion = screen.getByRole('alertdialog', { name: '¿Dejarla para después?' });
      expect(confirmacion).toHaveTextContent(/Tienes hasta las .+ para volver/);

      await userEvent.click(
        within(confirmacion).getByRole('button', { name: 'Ir a Mis prácticas' })
      );
      expect(push).toHaveBeenCalledWith('/practicas');
      expect(comenzarSesion).not.toHaveBeenCalled();
    });

    it('«Seguir leyendo» cierra la confirmación sin salir', async () => {
      montar();
      await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
      await userEvent.click(screen.getByRole('button', { name: 'Seguir leyendo' }));

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(push).not.toHaveBeenCalled();
    });

    it('Escape no cierra las instrucciones: ofrece la salida con confirmación', async () => {
      montar();
      await userEvent.keyboard('{Escape}');
      expect(screen.getByRole('alertdialog', { name: '¿Dejarla para después?' })).toBeVisible();
      expect(comenzarSesion).not.toHaveBeenCalled();
    });
  });
});
