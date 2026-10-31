import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JsonLd } from './json-ld';

describe('JsonLd', () => {
  it('un texto con «</script>» no puede cerrar el script y el JSON sigue siendo el mismo', () => {
    const datos = { nombre: '</script><script>alert(1)</script>' };
    const html = renderToStaticMarkup(<JsonLd datos={datos} />);

    expect(html.match(/<\/script>/g)).toHaveLength(1);
    const contenido = html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    expect(JSON.parse(contenido)).toEqual(datos);
  });
});
