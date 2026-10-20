import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';

interface EncabezadoCasoProps {
  /** Se conserva por compatibilidad; el título habla solo (sin etiqueta encima). */
  sobretitulo?: string;
  titulo: string;
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
