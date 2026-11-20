import { BotonRecorrido } from '@/components/ayuda/recorrido-guiado';
import { ID_RECORRIDO_CREAR_CASO } from '@/components/casos/recorrido-crear-caso';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';

interface EncabezadoCasoProps {
  /** El nombre de un caso va en el color del texto; el verbo que lo acompaña, apagado. */
  titulo: React.ReactNode;
  descripcion: string;
  acciones?: React.ReactNode;
  subbarra?: React.ReactNode;
}

/** Encabezado común de las páginas del constructor de casos: vuelve a la biblioteca de casos. */
export function EncabezadoCaso({ titulo, descripcion, acciones, subbarra }: EncabezadoCasoProps) {
  return (
    <EncabezadoPagina
      volver={{ href: '/configuracion/casos', etiqueta: 'Casos' }}
      titulo={titulo}
      descripcion={descripcion}
      acciones={
        <>
          <BotonRecorrido id={ID_RECORRIDO_CREAR_CASO} />
          {acciones}
        </>
      }
      subbarra={subbarra}
    />
  );
}
