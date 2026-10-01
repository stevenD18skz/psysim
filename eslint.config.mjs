import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Scripts de línea de comandos: la salida por consola es su propósito.
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
  // Debe ir al final: desactiva reglas de estilo que entran en conflicto con Prettier.
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    'src/types/database.types.ts',
    // Decodificadores Draco de terceros (copiados de three/examples).
    'public/draco/**',
    // Material de referencia (prototipos exportados de Claude Design), no es código de la app.
    'claude_desing/**',
  ]),
]);

export default eslintConfig;
