/** Inserta datos estructurados (schema.org). Escapa `<` para que el JSON no pueda cerrar el script. */
export function JsonLd({ datos }: { datos: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, '\u003c') }}
    />
  );
}
