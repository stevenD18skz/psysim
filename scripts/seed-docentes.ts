/**
 * HU-02 · T01 — Crea las cuentas semilla de prueba (idempotente).
 *
 * - Crea cada cuenta en Supabase Auth (correo confirmado, sin enviar correos).
 * - Inserta/actualiza su perfil en `public.usuario` con el MISMO id de Auth.
 * - Crea además una cuenta SIN perfil, para probar la página de acceso denegado.
 *
 * Uso:  pnpm db:seed               → crea las cuentas que falten
 *       pnpm db:seed --reset       → además regenera las contraseñas de las existentes
 *
 * Las contraseñas nuevas se muestran UNA sola vez por consola. Requiere
 * NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY (.env.local).
 */
import { randomBytes } from 'node:crypto';

import { createClient, type User } from '@supabase/supabase-js';

import { type Database } from '../src/types/database.types.ts';

interface CuentaSemilla {
  correo: string;
  nombre: string;
  /** Sin código = cuenta sin perfil en `usuario` (no es docente). */
  codigoInstitucional?: string;
}

const CUENTAS: CuentaSemilla[] = [
  {
    correo: 'docente1@psysim.test',
    nombre: 'Docente de Prueba Uno',
    codigoInstitucional: 'DOC-0001',
  },
  {
    correo: 'docente2@psysim.test',
    nombre: 'Docente de Prueba Dos',
    codigoInstitucional: 'DOC-0002',
  },
  {
    correo: 'docente3@psysim.test',
    nombre: 'Docente de Prueba Tres',
    codigoInstitucional: 'DOC-0003',
  },
  { correo: 'sin-rol@psysim.test', nombre: 'Usuario sin Rol' },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveSecreta = process.env.SUPABASE_SECRET_KEY;
const regenerar = process.argv.includes('--reset');

if (!url || !claveSecreta) {
  console.error('✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY (revisa .env.local).');
  process.exit(1);
}

const supabase = createClient<Database>(url, claveSecreta, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Contraseña aleatoria de 24 caracteres (base64url, ~144 bits de entropía). */
function generarContrasena(): string {
  return randomBytes(18).toString('base64url');
}

async function buscarUsuarioPorCorreo(correo: string): Promise<User | undefined> {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const encontrado = data.users.find(u => u.email?.toLowerCase() === correo);
    if (encontrado || data.users.length < 1000) return encontrado;
  }
}

async function asegurarCuenta(cuenta: CuentaSemilla): Promise<string | null> {
  const correo = cuenta.correo.toLowerCase();
  let usuario = await buscarUsuarioPorCorreo(correo);
  let contrasena: string | null = null;

  if (!usuario) {
    contrasena = generarContrasena();
    const { data, error } = await supabase.auth.admin.createUser({
      email: correo,
      password: contrasena,
      email_confirm: true,
      user_metadata: { nombre: cuenta.nombre },
    });
    if (error) throw error;
    usuario = data.user;
  } else if (regenerar) {
    contrasena = generarContrasena();
    const { error } = await supabase.auth.admin.updateUserById(usuario.id, {
      password: contrasena,
    });
    if (error) throw error;
  }

  if (cuenta.codigoInstitucional) {
    const { error } = await supabase.from('usuario').upsert({
      id: usuario.id,
      nombre: cuenta.nombre,
      correo,
      codigo_institucional: cuenta.codigoInstitucional,
      rol: 'docente',
    });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('usuario').delete().eq('id', usuario.id);
    if (error) throw error;
  }

  return contrasena;
}

let fallos = 0;

for (const cuenta of CUENTAS) {
  const tipo = cuenta.codigoInstitucional ? 'docente ' : 'sin rol ';
  try {
    const contrasena = await asegurarCuenta(cuenta);
    const detalle = contrasena
      ? `contraseña: ${contrasena}`
      : 'ya existía (contraseña sin cambios)';
    console.log(`✔ [${tipo}] ${cuenta.correo.padEnd(24)} ${detalle}`);
  } catch (error) {
    fallos++;
    console.error(`✖ [${tipo}] ${cuenta.correo}:`, error instanceof Error ? error.message : error);
  }
}

// Verificación: los id de `usuario` deben coincidir con los de Supabase Auth.
const { data: perfiles, error } = await supabase.from('usuario').select('id, correo');
if (error) {
  console.error('✖ No se pudo verificar la tabla usuario:', error.message);
  fallos++;
} else {
  for (const perfil of perfiles) {
    const { data } = await supabase.auth.admin.getUserById(perfil.id);
    const coincide = data.user?.email?.toLowerCase() === perfil.correo;
    if (!coincide) fallos++;
    console.log(`${coincide ? '✔' : '✖'} id ${perfil.id} ↔ auth (${perfil.correo})`);
  }
}

if (fallos > 0) process.exitCode = 1;
