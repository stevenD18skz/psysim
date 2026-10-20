/** Primer elemento enfocable de los paneles: salta la navegación y lleva al contenido (WCAG 2.4.1). */
export function SaltarContenido() {
  return (
    <a
      href="#contenido"
      className="sr-only z-50 rounded-lg bg-laton px-4 py-2.5 text-sm font-semibold text-[#1f1b17] focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-2 focus:outline-offset-2 focus:outline-nogal focus:outline-solid"
    >
      Saltar al contenido
    </a>
  );
}
