export const ESPERA_CONTADOR_IA_S = 5;
export const MENSAJE_CONTADOR_IA = `No pudimos comprobar el cupo del paciente. Inténtalo en ${ESPERA_CONTADOR_IA_S} s.`;

export function esperaDeCuota(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0 ? valor : null;
}
