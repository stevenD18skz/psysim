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

import { type Database, type TablesInsert } from '../src/types/database.types.ts';

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

    await verificarSprint2(cliente, sesion.user!.id);
    await cliente.auth.signOut({ scope: 'local' });
  }
}

// 4. Cuenta sin rol docente: no ve el catálogo.
const correoSinRol = process.env.E2E_SIN_ROL_CORREO;
const contrasenaSinRol = process.env.E2E_SIN_ROL_CONTRASENA;
if (correoSinRol && contrasenaSinRol) {
  const cliente = createClient<Database>(url, clavePublicable, opciones);
  const { error } = await cliente.auth.signInWithPassword({
    email: correoSinRol,
    password: contrasenaSinRol,
  });
  if (!error) {
    const { data } = await cliente.from('escenario').select('id');
    comprobar((data ?? []).length === 0, 'RLS: una cuenta sin rol docente no ve los escenarios');
    await cliente.auth.signOut({ scope: 'local' });
  }
}

if (fallos > 0) process.exitCode = 1;

/**
 * Sprint 2 — RLS y privilegios por columna de escenario (con casos propios), npc y sesion.
 * Crea datos de otro docente con la clave secreta para comprobar el aislamiento y los elimina
 * al terminar.
 */
async function verificarSprint2(cliente: ReturnType<typeof createClient<Database>>, miId: string) {
  const PREFIJO = 'RLS-TEST';

  for (const tabla of ['escenario', 'npc', 'sesion', 'mensaje'] as const) {
    const { data } = await anonimo.from(tabla).select('id');
    comprobar((data ?? []).length === 0, `Navegador sin sesión: RLS no expone ${tabla}`);
  }

  const { data: escenarios } = await cliente
    .from('escenario')
    .select('id, codigo')
    .is('docente_id', null);
  const { data: npcs } = await cliente.from('npc').select('id');
  comprobar(
    escenarios?.length === 6,
    `El docente lee los ${escenarios?.length ?? 0} escenarios activos`
  );
  comprobar((npcs?.length ?? 0) >= 6, `El docente lee los ${npcs?.length ?? 0} NPC`);
  const escenarioId = escenarios?.[0]?.id;
  if (!escenarioId) return;

  // Datos de otro docente (creados con la clave secreta).
  const { data: otro } = await admin
    .from('usuario')
    .select('id')
    .eq('rol', 'docente')
    .neq('id', miId)
    .limit(1)
    .single();
  // `estudiante_id` lo asigna el trigger `sesion_registrar_estudiante` (los tipos generados no lo
  // saben y lo marcan obligatorio).
  const datosSesion = {
    escenario_id: escenarioId,
    codigo_estudiante: '209900099',
    nombre_estudiante: `${PREFIJO} Estudiante`,
    prompt_sistema: 'Prompt de prueba de las políticas RLS del Sprint 2.',
  } as TablesInsert<'sesion'>;

  try {
    if (otro) {
      const { data: ajena } = await admin
        .from('sesion')
        .insert({ ...datosSesion, usuario_id: otro.id })
        .select('id')
        .single();
      // Caso propio de otro docente (con su NPC).
      const { data: casoAjeno } = await admin
        .from('escenario')
        .insert({
          codigo: 'C-99999999',
          titulo: `${PREFIJO} caso ajeno`,
          descripcion: 'Caso de prueba de las políticas RLS.',
          categoria: 'cotidiano',
          dificultad: 'basico',
          competencia_central: 'Prueba',
          configuracion_3d: 'scenes/e-01.json',
          docente_id: otro.id,
        })
        .select('id')
        .single();

      const { data: vistas } = await cliente.from('sesion').select('id').eq('id', ajena!.id);
      comprobar(vistas?.length === 0, 'RLS: el docente no ve las sesiones de otro docente');
      const { data: casos } = await cliente.from('escenario').select('id').eq('id', casoAjeno!.id);
      comprobar(casos?.length === 0, 'RLS: el docente no ve los casos propios de otro docente');
      const { data: modificados } = await cliente
        .from('escenario')
        .update({ titulo: `${PREFIJO} modificado` })
        .eq('id', casoAjeno!.id)
        .select('id');
      comprobar(
        (modificados ?? []).length === 0,
        'RLS: el docente no puede modificar los casos de otro docente'
      );
      const { data: oficiales } = await cliente
        .from('escenario')
        .update({ titulo: `${PREFIJO} oficial` })
        .eq('codigo', 'E-01')
        .select('id');
      comprobar(
        (oficiales ?? []).length === 0,
        'RLS: el docente no puede modificar los escenarios oficiales'
      );

      // Sprint 3 — mensajes de la sesión de otro docente.
      await admin
        .from('mensaje')
        .insert({ sesion_id: ajena!.id, remitente: 'estudiante', contenido: 'Mensaje ajeno' });
      const { data: mensajesAjenos } = await cliente
        .from('mensaje')
        .select('id')
        .eq('sesion_id', ajena!.id);
      comprobar(mensajesAjenos?.length === 0, 'RLS: el docente no lee mensajes de otro docente');
      const { error: errorMensajeAjeno } = await cliente
        .from('mensaje')
        .insert({ sesion_id: ajena!.id, remitente: 'estudiante', contenido: 'Intrusión' });
      comprobar(
        Boolean(errorMensajeAjeno),
        'RLS: el docente no puede escribir en la conversación de otro docente'
      );
    }

    // Suplantación: `usuario_id` no tiene privilegio de INSERT para el cliente.
    const { error: errorSuplantar } = await cliente
      .from('sesion')
      .insert({ ...datosSesion, usuario_id: otro?.id ?? miId });
    comprobar(Boolean(errorSuplantar), 'No se puede crear una sesión indicando otro usuario_id');

    const { data: propia, error: errorPropia } = await cliente
      .from('sesion')
      .insert(datosSesion)
      .select('id, usuario_id, estado, fin')
      .single();
    comprobar(
      !errorPropia && propia?.usuario_id === miId && propia.estado === 'en_curso' && !propia.fin,
      'El docente crea su sesión (usuario_id = auth.uid(), estado en_curso)'
    );
    if (!propia) return;

    // Sprint 3 — el docente escribe y lee la conversación de su sesión en curso.
    const { error: errorMensaje } = await cliente.from('mensaje').insert([
      { sesion_id: propia.id, remitente: 'estudiante', contenido: 'Hola' },
      { sesion_id: propia.id, remitente: 'npc', contenido: 'Buenas', latencia_ms: 900 },
    ]);
    const { data: propios } = await cliente
      .from('mensaje')
      .select('remitente')
      .eq('sesion_id', propia.id)
      .order('creado_en')
      .order('remitente');
    comprobar(
      !errorMensaje && propios?.map(m => m.remitente).join(',') === 'estudiante,npc',
      'El docente guarda y lee (en orden) la conversación de su sesión'
    );
    const { error: errorMetricaEstudiante } = await cliente
      .from('mensaje')
      .insert({ sesion_id: propia.id, remitente: 'estudiante', contenido: 'x', latencia_ms: 5 });
    comprobar(
      Boolean(errorMetricaEstudiante),
      'Solo los mensajes del paciente pueden llevar latencia y tokens'
    );
    const { data: editados } = await cliente
      .from('mensaje')
      .update({ contenido: 'editado' })
      .eq('sesion_id', propia.id)
      .select('id');
    comprobar((editados ?? []).length === 0, 'Los mensajes no se pueden editar');

    const { error: errorInmutable } = await cliente
      .from('sesion')
      .update({ nombre_estudiante: `${PREFIJO} Cambiado` })
      .eq('id', propia.id);
    comprobar(Boolean(errorInmutable), 'Los datos del estudiante de una sesión son inmutables');

    const { error: errorFin } = await cliente
      .from('sesion')
      .update({ fin: new Date().toISOString() })
      .eq('id', propia.id);
    comprobar(Boolean(errorFin), 'El cliente no puede escribir la hora de fin');

    const { data: cerrada } = await cliente
      .from('sesion')
      .update({ estado: 'finalizada' })
      .eq('id', propia.id)
      .select('id, inicio, fin')
      .single();
    comprobar(
      Boolean(cerrada?.fin) && cerrada!.fin! >= cerrada!.inicio,
      'Al cerrar la sesión, la base de datos asigna la hora de fin (reloj del servidor)'
    );

    const { data: reabierta } = await cliente
      .from('sesion')
      .update({ estado: 'en_curso' })
      .eq('id', propia.id)
      .select('id');
    comprobar((reabierta ?? []).length === 0, 'Una sesión finalizada ya no se puede modificar');

    const { error: errorTrasCierre } = await cliente
      .from('mensaje')
      .insert({ sesion_id: propia.id, remitente: 'estudiante', contenido: 'Después del cierre' });
    comprobar(Boolean(errorTrasCierre), 'No se pueden añadir mensajes a una sesión finalizada');
  } finally {
    await admin.from('sesion').delete().like('nombre_estudiante', `${PREFIJO}%`);
    await admin.from('estudiante').delete().like('nombre', `${PREFIJO}%`);
    await admin.from('escenario').delete().like('titulo', `${PREFIJO}%`);
  }
}
