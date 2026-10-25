/**
 * LLM07 (fuga del prompt del sistema) — Detecta si la respuesta del paciente repite, palabra por
 * palabra, un tramo largo de sus instrucciones. Un paciente habla en primera persona y con otras
 * palabras: diez palabras seguidas iguales a las del prompt o de las reglas son una fuga, no una
 * coincidencia. Es una red de seguridad: la defensa principal es que el prompt no contenga nada
 * que no pueda verse y que la IA no tenga acceso a más datos que los del personaje.
 */
export const PALABRAS_DE_FUGA = 10;

function palabras(texto: string): string[] {
  return (
    texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

/** La frase de apertura es lo primero que el paciente debe decir: repetirla no es una fuga. */
function sinFraseDeApertura(fuente: string): string {
  return fuente.replace(/Frase de apertura[^"\n]*"[^"\n]*"/gi, ' ');
}

function ventanas(lista: readonly string[]): Set<string> {
  const conjunto = new Set<string>();
  for (let i = 0; i + PALABRAS_DE_FUGA <= lista.length; i++) {
    conjunto.add(lista.slice(i, i + PALABRAS_DE_FUGA).join(' '));
  }
  return conjunto;
}

/** ¿La respuesta copia un tramo de alguna de las `fuentes` (prompt del caso, reglas comunes)? */
export function revelaInstrucciones(respuesta: string, fuentes: readonly string[]): boolean {
  const enLaRespuesta = palabras(respuesta);
  if (enLaRespuesta.length < PALABRAS_DE_FUGA) return false;

  const conocidas = new Set<string>();
  for (const fuente of fuentes) {
    for (const ventana of ventanas(palabras(sinFraseDeApertura(fuente)))) conocidas.add(ventana);
  }
  for (const ventana of ventanas(enLaRespuesta)) {
    if (conocidas.has(ventana)) return true;
  }
  return false;
}
