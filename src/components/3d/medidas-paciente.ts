import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

interface MedidasPaciente {
  /**
   * Altura (m, en el mundo) de los ojos del paciente cargado. La publica el personaje GLB al
   * montarse; `null` mientras no hay uno (se usa la altura aproximada según la postura).
   */
  alturaOjos: number | null;
}

/** Medidas reales del paciente 3D, compartidas con la cámara de conversación. */
export const medidasPacienteStore = createStore<MedidasPaciente>(() => ({ alturaOjos: null }));

export function useMedidasPaciente<T>(selector: (medidas: MedidasPaciente) => T): T {
  return useStore(medidasPacienteStore, selector);
}
