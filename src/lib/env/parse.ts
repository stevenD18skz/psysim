import { type z } from 'zod';

/**
 * Valida un conjunto de variables de entorno contra un esquema Zod.
 * Si falla, lanza un error que enumera las variables inválidas sin exponer sus valores.
 */
export function parseEnv<T extends z.ZodType>(
  schema: T,
  values: Record<string, string | undefined>,
  scope: string
): z.infer<T> {
  const result = schema.safeParse(values);

  if (!result.success) {
    const issues = result.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Variables de entorno (${scope}) inválidas o ausentes:\n${issues}\n` +
        'Revisa .env.example y la configuración del proyecto en Vercel.'
    );
  }

  return result.data;
}
