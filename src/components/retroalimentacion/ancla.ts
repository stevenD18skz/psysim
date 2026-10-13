/**
 * Punto de anclaje de un globo flotante (popover) que no es un elemento: una selección de texto o
 * un subrayado que puede volver a renderizarse. Se mide cada vez que el globo se reposiciona, así
 * que lo sigue al desplazar la página.
 */
export interface Ancla {
  getBoundingClientRect: () => DOMRect;
  /** Elemento de referencia para escuchar el desplazamiento de sus contenedores. */
  contextElement?: Element;
}

/**
 * Ancla sobre un rango de texto. Debe ser una copia (`cloneRange`) y no el rango vivo de la
 * selección, para que siga valiendo cuando el docente la quite.
 */
export function anclaDeRango(rango: Range, contexto: Element): Ancla {
  return { getBoundingClientRect: () => rango.getBoundingClientRect(), contextElement: contexto };
}

/** Ancla sobre el subrayado de una anotación, buscado por su id en cada medición. */
export function anclaDeMarca(anotacionId: string, contexto?: Element | null): Ancla {
  return {
    getBoundingClientRect: () =>
      document.getElementById(`marca-${anotacionId}`)?.getBoundingClientRect() ?? new DOMRect(),
    contextElement: contexto ?? undefined,
  };
}

/** Lleva un subrayado al centro de la pantalla. */
export function irAMarca(anotacionId: string) {
  document
    .getElementById(`marca-${anotacionId}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** Marca los elementos que abren el globo de una anotación (subrayados y lista de comentarios). */
export const ABRE_ANOTACION = { 'data-abre-anotacion': '' } as const;

/**
 * `true` si un clic fuera del globo cae en otro subrayado o en la lista: ese clic cambia el globo
 * de anotación, así que no debe cerrarlo (lo cerraría justo después de abrir el nuevo).
 */
export function abreOtraAnotacion(destino: EventTarget | null) {
  return destino instanceof Element && destino.closest('[data-abre-anotacion]') !== null;
}
