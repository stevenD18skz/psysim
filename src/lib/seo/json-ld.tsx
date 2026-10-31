/**
 * Inserta datos estructurados (schema.org). Escapa `<` como el texto `<` (seis caracteres, no
 * el carácter) para que el JSON no pueda cerrar el script; al leerlo, `JSON.parse` lo vuelve `<`.
 */
export function JsonLd({ datos }: { datos: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, '\\u003c') }}
    />
  );
}
