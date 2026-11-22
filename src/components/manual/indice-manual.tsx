'use client';

const CLASE_SECCION =
  'inline-flex min-h-8 items-center rounded-md px-1.5 text-left transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden';

export function IndiceManual({
  secciones,
  enDialogo,
}: {
  secciones: readonly (readonly [string, string])[];
  enDialogo: boolean;
}) {
  return (
    <>
      <p className="mb-2.5 text-sm font-semibold">En este manual</p>
      <ol className="flex flex-col gap-1 text-sm text-muted-foreground">
        {secciones.map(([id, titulo], indice) => (
          <li key={id}>
            {enDialogo ? (
              <button
                type="button"
                className={CLASE_SECCION}
                onClick={() => {
                  const encabezado = document.getElementById(`manual-dialogo-${id}`);
                  encabezado?.scrollIntoView({ block: 'start' });
                  encabezado?.focus({ preventScroll: true });
                }}
              >
                {indice + 1}. {titulo}
              </button>
            ) : (
              <a
                href={`#${id}`}
                className={CLASE_SECCION}
                onClick={evento => {
                  if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
                  const encabezado = document.getElementById(id);
                  if (!encabezado) return;
                  evento.preventDefault();
                  window.history.replaceState(window.history.state, '', `#${id}`);
                  encabezado.scrollIntoView({ block: 'start' });
                  encabezado.focus({ preventScroll: true });
                }}
              >
                {indice + 1}. {titulo}
              </a>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
