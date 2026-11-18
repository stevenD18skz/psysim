import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';

interface EncabezadoCasoProps {
  /** El nombre de un caso va en el color del texto; el verbo que lo acompaña, apagado. */
  titulo: React.ReactNode;
  descripcion: string;
}

/** Encabezado común de las páginas del constructor de casos: vuelve a la biblioteca de casos. */
export function EncabezadoCaso({ titulo, descripcion }: EncabezadoCasoProps) {
  return (
    <EncabezadoPagina
      volver={{ href: '/configuracion/casos', etiqueta: 'Casos' }}
      titulo={titulo}
      descripcion={descripcion}
    />
  );
}
