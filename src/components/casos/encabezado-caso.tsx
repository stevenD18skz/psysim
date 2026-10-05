interface EncabezadoCasoProps {
  sobretitulo: string;
  titulo: string;
  descripcion: string;
}

/** Encabezado común de las páginas del constructor de casos. */
export function EncabezadoCaso({ sobretitulo, titulo, descripcion }: EncabezadoCasoProps) {
  return (
    <header className="flex flex-col gap-2">
      <p className="text-sm font-medium tracking-wide text-primary uppercase">{sobretitulo}</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{titulo}</h1>
      <p className="max-w-2xl text-muted-foreground">{descripcion}</p>
    </header>
  );
}
