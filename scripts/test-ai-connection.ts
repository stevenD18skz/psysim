/**
 * Sprint 0 · T10 — Verifica la conectividad con la API de IA (Google Gemini).
 *
 * Uso:  pnpm ai:test
 * Lee AI_API_KEY (obligatoria) y AI_MODEL (opcional) de .env.local o del entorno.
 */
import { createGoogleGenerativeAI, type GoogleLanguageModelOptions } from '@ai-sdk/google';
import { generateText } from 'ai';

const MODELO_POR_DEFECTO = 'gemini-3.5-flash';
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const apiKey = process.env.AI_API_KEY;
const modelo = process.env.AI_MODEL || MODELO_POR_DEFECTO;

if (!apiKey) {
  console.error('✖ Falta la variable AI_API_KEY (revisa .env.local).');
  process.exit(1);
}

const google = createGoogleGenerativeAI({ apiKey, baseURL: URL_BASE });

console.log(`→ Proveedor: Google Gemini (${URL_BASE})`);
console.log(`→ Modelo:    ${modelo}`);

const inicio = performance.now();

try {
  const { text, usage } = await generateText({
    model: google(modelo),
    prompt: 'Responde únicamente con la frase: "Conexión con PsySim verificada".',
    maxOutputTokens: 200,
    providerOptions: {
      // Razonamiento mínimo: menor latencia, adecuado para respuestas conversacionales.
      google: { thinkingConfig: { thinkingLevel: 'minimal' } } satisfies GoogleLanguageModelOptions,
    },
  });

  const ms = Math.round(performance.now() - inicio);
  console.log(`✔ Respuesta recibida en ${ms} ms:`);
  console.log(`  "${text.trim()}"`);
  console.log(`  Tokens: entrada ${usage.inputTokens ?? '?'}, salida ${usage.outputTokens ?? '?'}`);
} catch (error) {
  console.error('✖ No fue posible conectar con la API de IA:');
  console.error(error instanceof Error ? error.message : error);
  // exitCode (y no process.exit) deja cerrar los sockets pendientes antes de salir.
  process.exitCode = 1;
}
