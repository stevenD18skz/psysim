/**
 * Sprint 0 · T06 — Verifica la conexión con Supabase desde los dos contextos:
 *
 * 1. Servidor (clave secreta): consulta `usuario` omitiendo RLS.
 * 2. Navegador (clave publicable): sin sesión, RLS no debe devolver filas; con la sesión
 *    de un docente, solo su propio perfil y el claim `rol_usuario` en el JWT.
 *
 * Uso:  pnpm supabase:test
 * Lee .env.local y, si existe, .env.test.local (credenciales E2E_DOCENTE_*).
 */
import { existsSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

import { type Database } from '../src/types/database.types.ts';

if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clavePublicable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const claveSecreta = process.env.SUPABASE_SECRET_KEY;

if (!url || !clavePublicable || !claveSecreta) {
  console.error('✖ Faltan variables de Supabase (revisa .env.local).');
  process.exit(1);
}

const opciones = { auth: { persistSession: false, autoRefreshToken: false } };
let fallos = 0;

function comprobar(ok: boolean, mensaje: string) {
  console.log(`${ok ? '✔' : '✖'} ${mensaje}`);
  if (!ok) fallos++;
}

// 1. Contexto servidor
const admin = createClient<Database>(url, claveSecreta, opciones);
const { count, error: errorAdmin } = await admin
  .from('usuario')
  .select('*', { count: 'exact', head: true });
comprobar(!errorAdmin, `Servidor (clave secreta): ${count ?? 0} perfiles en usuario`);

// 2. Contexto navegador, sin sesión
const anonimo = createClient<Database>(url, clavePublicable, opciones);
const { data: filasAnonimas, error: errorAnonimo } = await anonimo.from('usuario').select('id');
comprobar(
  Boolean(errorAnonimo) || (filasAnonimas ?? []).length === 0,
  'Navegador sin sesión: RLS no expone ningún perfil'
);

// 3. Contexto navegador, con sesión de docente
const correo = process.env.E2E_DOCENTE_CORREO;
const contrasena = process.env.E2E_DOCENTE_CONTRASENA;

if (!correo || !contrasena) {
  console.log('• Sin E2E_DOCENTE_CORREO/CONTRASENA: se omite la prueba con sesión.');
} else {
  const cliente = createClient<Database>(url, clavePublicable, opciones);
  const { data: sesion, error: errorLogin } = await cliente.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });
  comprobar(!errorLogin, `Inicio de sesión como ${correo}`);

  if (sesion.session) {
    const { data: claims } = await cliente.auth.getClaims();
    comprobar(
      claims?.claims.rol_usuario === 'docente',
      `JWT verificado con claim rol_usuario = ${String(claims?.claims.rol_usuario)}`
    );

    const { data: perfiles } = await cliente.from('usuario').select('id, correo');
    comprobar(
      perfiles?.length === 1 && perfiles[0]?.id === sesion.user?.id,
      'RLS: el docente solo ve su propio perfil'
    );

    await cliente.auth.signOut({ scope: 'local' });
  }
}

if (fallos > 0) process.exitCode = 1;
