/**
 * Deja que un script de Node importe los módulos del servidor de `src/` igual que Next: resuelve
 * el alias `@/` y las importaciones sin extensión (`./cliente` → `./cliente.ts`).
 *
 * Uso: node --conditions=react-server --import ./scripts/alias-src.mjs scripts/<script>.ts
 * (`--conditions=react-server` hace que `server-only` no lance fuera de Next).
 */
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const TERMINACIONES = ['.ts', '.tsx', path.join('index.ts')];

function conExtension(ruta) {
  if (path.extname(ruta) && existsSync(ruta)) return ruta;
  for (const terminacion of TERMINACIONES) {
    const candidata = terminacion.startsWith('.')
      ? ruta + terminacion
      : path.join(ruta, terminacion);
    if (existsSync(candidata)) return candidata;
  }
  return null;
}

registerHooks({
  resolve(especificador, contexto, siguiente) {
    let base = null;
    if (especificador.startsWith('@/')) {
      base = path.join(SRC, especificador.slice(2));
    } else if (especificador.startsWith('.') && contexto.parentURL?.startsWith('file:')) {
      base = path.resolve(path.dirname(fileURLToPath(contexto.parentURL)), especificador);
    }
    const ruta = base && conExtension(base);
    return ruta
      ? { url: pathToFileURL(ruta).href, shortCircuit: true }
      : siguiente(especificador, contexto);
  },
});
