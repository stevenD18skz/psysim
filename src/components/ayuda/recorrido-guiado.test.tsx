import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PistaFaro } from './pista-contextual';
import { BotonRecorrido, InvitacionRecorrido, RecorridoGuiado } from './recorrido-guiado';

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = () =>
    ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
});

afterEach(() => {
  cleanup();
});

const PASOS = [
  {
    id: 'p1',
    selector: '[data-tour="paso-uno"]',
    titulo: 'Primero elige el caso',
    descripcion: 'Selecciona un caso del catálogo para empezar.',
  },
  {
    id: 'ausente',
    selector: '[data-tour="no-existe"]',
    titulo: 'Paso ausente',
    descripcion: 'Debe omitirse cuando el elemento no está montado.',
  },
  {
    id: 'p2',
    selector: '[data-tour="paso-dos"]',
    titulo: 'Luego genera el código',
    descripcion: 'Comparte el código único con tu estudiante.',
  },
];

describe('RecorridoGuiado', () => {
  it('muestra la invitación inicial, recorre los pasos presentes, guarda estado y permite repetir', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <BotonRecorrido id="prueba" />
        <InvitacionRecorrido
          id="prueba"
          titulo="¿Primera vez aquí?"
          descripcion="Recorre los pasos clave."
        />
        <div data-tour="paso-uno">Bloque uno</div>
        <div data-tour="paso-dos">Bloque dos</div>
        <RecorridoGuiado id="prueba" nombre="Recorrido de prueba" pasos={PASOS} />
      </div>
    );

    // Invitación visible la primera vez.
    expect(screen.getByText('¿Primera vez aquí?')).toBeInTheDocument();

    // Inicia el recorrido: el paso ausente se omite automáticamente (queda 1 de 2).
    await user.click(screen.getByRole('button', { name: 'Iniciar recorrido' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Paso 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Primero elige el caso')).toBeInTheDocument();

    // Avanza al paso 2 y termina.
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Paso 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('Luego genera el código')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('¿Primera vez aquí?')).not.toBeInTheDocument();

    // Repite el recorrido en cualquier momento desde el botón del encabezado y cierra con Escape.
    await user.click(screen.getByRole('button', { name: 'Recorrido guiado' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('PistaFaro', () => {
  it('abre el globo al pulsar la píldora y se oculta para siempre al pulsar Entendido', async () => {
    const user = userEvent.setup();
    render(
      <PistaFaro
        id="pista-prueba"
        etiqueta="Vista matriz"
        titulo="Analiza todo tu grupo"
        descripcion="Cambia a la vista matriz para ver notas en una sola tabla."
      />
    );

    await user.click(screen.getByRole('button', { name: 'Vista matriz' }));
    expect(screen.getByText('Analiza todo tu grupo')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByRole('button', { name: 'Vista matriz' })).not.toBeInTheDocument();
  });
});
