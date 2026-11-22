/**
 * HU-02 · T01 — Crea las cuentas semilla de prueba (idempotente).
 *
 * - Crea cada cuenta en Supabase Auth (correo confirmado, sin enviar correos).
 * - Inserta/actualiza su perfil en `public.usuario` con el MISMO id de Auth.
 * - Crea un Administrador de prueba (admin@psysim.test): con él se crean desde /admin las cuentas
 *   reales de los docentes y de los demás administradores.
 * - Crea cinco estudiantes de prueba con contraseña (los reales entran con Google) y los asigna en
 *   `public.estudiante` entre los tres docentes de prueba (1 o 2 por docente). Usan el dominio
 *   reservado `psysim.test`, que ninguna cuenta de Google puede tener.
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
  /** Sin código = cuenta sin perfil en `usuario` (sin acceso a la plataforma). */
  codigoInstitucional?: string;
  rol?: 'superadmin' | 'docente' | 'estudiante';
}

const CUENTAS: CuentaSemilla[] = [
  {
    correo: 'admin@psysim.test',
    nombre: 'Administrador de Prueba',
    codigoInstitucional: 'ADM-0001',
    rol: 'superadmin',
  },
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
  {
    correo: 'estudiante1@psysim.test',
    nombre: 'Estudiante de Prueba Uno',
    codigoInstitucional: '209990001',
    rol: 'estudiante',
  },
  {
    correo: 'estudiante2@psysim.test',
    nombre: 'Estudiante de Prueba Dos',
    codigoInstitucional: '209990002',
    rol: 'estudiante',
  },
  {
    correo: 'estudiante3@psysim.test',
    nombre: 'Estudiante de Prueba Tres',
    codigoInstitucional: '209990003',
    rol: 'estudiante',
  },
  {
    correo: 'estudiante4@psysim.test',
    nombre: 'Estudiante de Prueba Cuatro',
    codigoInstitucional: '209990004',
    rol: 'estudiante',
  },
  {
    correo: 'estudiante5@psysim.test',
    nombre: 'Estudiante de Prueba Cinco',
    codigoInstitucional: '209990005',
    rol: 'estudiante',
  },
  {
    correo: 'estudiante7@psysim.test',
    nombre: 'Estudiante de Prueba Siete',
    codigoInstitucional: '209990007',
    rol: 'estudiante',
  },
  { correo: 'sin-rol@psysim.test', nombre: 'Usuario sin Rol' },
];

/**
 * Asignación inicial de los estudiantes de prueba entre los docentes de prueba y el
 * Administrador (que también actúa como docente). El trigger `estudiante_vincular_cuenta` enlaza
 * `usuario_id` por el correo.
 */
const ASIGNACIONES_ESTUDIANTES: { docente: string; estudiantes: string[] }[] = [
  {
    docente: 'admin@psysim.test',
    estudiantes: ['estudiante7@psysim.test'],
  },
  {
    docente: 'docente1@psysim.test',
    estudiantes: ['estudiante1@psysim.test', 'estudiante2@psysim.test'],
  },
  {
    docente: 'docente2@psysim.test',
    estudiantes: ['estudiante3@psysim.test', 'estudiante4@psysim.test'],
  },
  {
    docente: 'docente3@psysim.test',
    estudiantes: ['estudiante5@psysim.test'],
  },
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
      rol: cuenta.rol ?? 'docente',
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
  const tipo = cuenta.codigoInstitucional ? (cuenta.rol ?? 'docente').padEnd(10) : 'sin rol   ';
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

// Verificación: los id de `usuario` deben coincidir con los de Supabase Auth. Solo las cuentas de
// prueba: las de docentes y estudiantes reales no se imprimen en la consola.
const { data: perfiles, error } = await supabase
  .from('usuario')
  .select('id, correo, nombre, codigo_institucional')
  .like('correo', '%@psysim.test');
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

  const porCorreo = new Map(perfiles.map(p => [p.correo.toLowerCase(), p]));
  for (const { docente: correoDocente, estudiantes } of ASIGNACIONES_ESTUDIANTES) {
    const docente = porCorreo.get(correoDocente.toLowerCase());
    if (!docente) {
      console.error(`✖ No se encontró el docente ${correoDocente} en public.usuario.`);
      fallos++;
      continue;
    }
    for (const correoEstudiante of estudiantes) {
      const alumno = porCorreo.get(correoEstudiante.toLowerCase());
      if (!alumno) {
        console.error(`✖ No se encontró el estudiante ${correoEstudiante} en public.usuario.`);
        fallos++;
        continue;
      }
      const { error: errorRegistro } = await supabase.from('estudiante').upsert(
        {
          docente_id: docente.id,
          codigo: alumno.codigo_institucional,
          nombre: alumno.nombre,
          correo: alumno.correo.toLowerCase(),
        },
        { onConflict: 'docente_id,codigo' }
      );
      if (errorRegistro) {
        console.error(
          `✖ No se pudo asignar ${correoEstudiante} a ${correoDocente}:`,
          errorRegistro.message
        );
        fallos++;
      } else {
        console.log(
          `✔ [asignado  ] ${correoEstudiante.padEnd(24)} → ${correoDocente} (${alumno.codigo_institucional})`
        );
      }
    }
  }
}

if (fallos > 0) process.exitCode = 1;
