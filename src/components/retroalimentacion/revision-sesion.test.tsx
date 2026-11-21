import { fireEvent, render, screen, within } from '@testing-library/react';
import { type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';

import { crearAnotacion } from '@/lib/retroalimentacion/actions';
import { type DetalleSesion } from '@/types';

import { RevisionSesion } from './revision-sesion';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  unstable_rethrow: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/retroalimentacion/recorrido-revision', () => ({
  RecorridoRevisionPractica: () => null,
}));
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? children : null),
  PopoverAnchor: () => null,
  PopoverContent: ({
    children,
    'aria-label': etiqueta,
  }: {
    children: ReactNode;
    'aria-label': string;
  }) => (
    <div role="dialog" aria-label={etiqueta}>
      {children}
    </div>
  ),
}));
vi.mock('@/lib/retroalimentacion/actions', () => ({ crearAnotacion: vi.fn() }));

const CUENTA = '11111111-1111-4111-8111-111111111111';
const SESION = '22222222-2222-4222-8222-222222222222';
const MENSAJE = '33333333-3333-4333-8333-333333333333';
const HORA = '2026-11-20T15:00:00Z';
const detalle: DetalleSesion = {
  id: SESION,
  estado: 'finalizada',
  comenzada: true,
  inicio: HORA,
  fin: HORA,
  estudiante: { id: 'estudiante-de-prueba', codigo: '123', nombre: 'Ana de prueba' },
  docente: 'Docente de prueba',
  escenario: {
    codigo: 'E-01',
    titulo: 'Caso de prueba',
    competenciaCentral: 'Escucha',
    configuracion3d: 'scenes/e-01.json',
  },
  npc: { nombre: 'Paciente de prueba', edad: 30 },
  mensajes: [
    {
      id: MENSAJE,
      remitente: 'estudiante',
      contenido: 'Hola 🌱, cuéntame cómo te sientes.',
      timestamp: HORA,
    },
  ],
  intentos: [],
  retroalimentacion: null,
};

it('recupera el texto, la frase y el mismo identificador de una anotación tras recargar', async () => {
  const crear = vi.mocked(crearAnotacion);
  crear.mockRejectedValueOnce(new Error('se perdió la confirmación'));
  const primerMontaje = render(<RevisionSesion sesion={detalle} cuentaId={CUENTA} />);
  const mensaje = primerMontaje.container.querySelector(`[data-texto-mensaje="${MENSAJE}"]`)!;
  const rango = document.createRange();
  rango.setStart(mensaje.firstChild!, 9);
  rango.setEnd(mensaje.firstChild!, 17);
  window.getSelection()!.addRange(rango);
  fireEvent(document, new Event('selectionchange'));
  fireEvent.click(screen.getByRole('button', { name: 'Comentar selección' }));
  fireEvent.change(screen.getByLabelText('Comentario sobre la frase seleccionada'), {
    target: { value: 'Texto por confirmar' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comentario' }));
  const primera = crear.mock.calls[0]![0] as { id: string };
  expect(primera).toMatchObject({ id: expect.any(String), mensajeId: MENSAJE, inicio: 8, fin: 16 });
  primerMontaje.unmount();

  crear.mockResolvedValueOnce({
    ok: true,
    datos: {
      id: primera.id,
      mensajeId: MENSAJE,
      inicio: 8,
      fin: 16,
      fragmento: 'cuéntame',
      comentario: 'Texto por confirmar',
    },
  });
  const segundoMontaje = render(<RevisionSesion sesion={detalle} cuentaId={CUENTA} />);
  const mensajeRecargado = segundoMontaje.container.querySelector<HTMLElement>(
    `[data-texto-mensaje="${MENSAJE}"]`
  )!;
  mensajeRecargado.scrollIntoView = vi.fn();
  const pendientes = await screen.findByRole('list', { name: 'Comentarios sin guardar' });
  expect(within(pendientes).getByText('cuéntame')).toBeVisible();
  fireEvent.click(within(pendientes).getByRole('button', { name: 'Recuperar comentario' }));
  expect(screen.getByLabelText('Comentario sobre la frase seleccionada')).toHaveValue(
    'Texto por confirmar'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comentario' }));

  expect(await screen.findByText('Texto por confirmar', { selector: 'span' })).toBeVisible();
  expect(crear.mock.calls[1]?.[0]).toEqual(primera);
  expect(
    sessionStorage.getItem(`psysim:borrador-retro:${CUENTA}:${SESION}:anotaciones`)
  ).toBeNull();
});
