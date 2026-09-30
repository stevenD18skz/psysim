import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { parseEnv } from './parse';

const schema = z.object({ URL: z.url(), CLAVE: z.string().min(1) });

describe('parseEnv', () => {
  it('devuelve los valores validados', () => {
    expect(parseEnv(schema, { URL: 'https://x.co', CLAVE: 'abc' }, 'test')).toEqual({
      URL: 'https://x.co',
      CLAVE: 'abc',
    });
  });

  it('lista las variables inválidas sin revelar sus valores', () => {
    const invocar = () => parseEnv(schema, { URL: 'no-es-url-secreta', CLAVE: undefined }, 'test');

    expect(invocar).toThrow(/URL/);
    expect(invocar).toThrow(/CLAVE/);
    expect(invocar).not.toThrow(/no-es-url-secreta/);
  });
});
