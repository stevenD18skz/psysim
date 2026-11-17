import 'server-only';

import { z } from 'zod';

import { parseEnv } from './parse';

/** Quién responde como paciente: el orquestador de NPC (con Gemini de respaldo) o solo Gemini. */
export const PROVEEDORES_IA = ['orquestador', 'gemini'] as const;
export type ProveedorIA = (typeof PROVEEDORES_IA)[number];

/** Máximo de cuentas del grupo: cada una es un inicio de sesión más al arrancar el servidor. */
export const MAXIMO_CUENTAS_GRUPO = 40;

const credencialSchema = z.object({
  correo: z.email().transform(correo => correo.trim().toLowerCase()),
  // El orquestador exige al menos 6 caracteres (`LoginInput` de su OpenAPI).
  contrasena: z.string().min(6),
});

export type CredencialOrquestador = z.infer<typeof credencialSchema>;

/**
 * Lista JSON de las cuentas `student` del grupo. Va en JSON y no separada por comas porque una
 * contraseña puede llevar cualquier signo.
 */
const cuentasGrupoSchema = z
  .string()
  .trim()
  .default('')
  .transform((valor, contexto): CredencialOrquestador[] => {
    if (!valor) return [];
    let lista: unknown;
    try {
      lista = JSON.parse(valor);
    } catch {
      contexto.addIssue({ code: 'custom', message: 'debe ser una lista JSON' });
      return z.NEVER;
    }
    const cuentas = z.array(credencialSchema).max(MAXIMO_CUENTAS_GRUPO).safeParse(lista);
    if (!cuentas.success) {
      // Sin el detalle de Zod: citaría el valor recibido, que incluye contraseñas.
      contexto.addIssue({
        code: 'custom',
        message: `debe ser una lista de hasta ${MAXIMO_CUENTAS_GRUPO} objetos {"correo","contrasena"}`,
      });
      return z.NEVER;
    }
    const correos = new Set(cuentas.data.map(cuenta => cuenta.correo));
    if (correos.size !== cuentas.data.length) {
      contexto.addIssue({ code: 'custom', message: 'repite una cuenta' });
      return z.NEVER;
    }
    return cuentas.data;
  });

const proveedorSchema = z.object({
  // Por defecto Gemini: un despliegue sin las variables del orquestador sigue funcionando.
  IA_PROVEEDOR: z.enum(PROVEEDORES_IA).default('gemini'),
});

/** Equipos donde `http` no sale a la red: el orquestador en la misma máquina, al desarrollar. */
const EQUIPOS_LOCALES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Por esta URL viajan la contraseña de las cuentas del orquestador y lo que escriben los
 * estudiantes: fuera del propio equipo solo se acepta `https`, para que una URL mal copiada con
 * `http://` falle al arrancar en lugar de enviar todo en claro.
 */
function usaCanalSeguro(url: string): boolean {
  const { protocol, hostname } = new URL(url);
  return protocol === 'https:' || EQUIPOS_LOCALES.has(hostname);
}

const orquestadorEnvSchema = z.object({
  ORQUESTADOR_URL: z
    .url({ protocol: /^https?$/ })
    .refine(usaCanalSeguro, 'debe usar https (http solo se admite con localhost)')
    .transform(url => url.replace(/\/+$/, '')),
  ORQUESTADOR_CORREO: credencialSchema.shape.correo,
  ORQUESTADOR_CONTRASENA: credencialSchema.shape.contrasena,
  ORQUESTADOR_CUENTAS: cuentasGrupoSchema,
});

export interface OrquestadorEnv {
  url: string;
  /** Cuenta `teacher`: crea perfiles, escenarios y sesiones. */
  docente: CredencialOrquestador;
  /** Cuentas `student` dueñas de las sesiones. Vacío: la cuenta `teacher` conversa en todas. */
  grupo: CredencialOrquestador[];
}

let proveedor: ProveedorIA | undefined;
let orquestador: OrquestadorEnv | undefined;

/** Proveedor de las prácticas nuevas. Cambiarlo a `gemini` es el interruptor de emergencia. */
export function getProveedorIa(): ProveedorIA {
  proveedor ??= parseEnv(
    proveedorSchema,
    { IA_PROVEEDOR: process.env.IA_PROVEEDOR || undefined },
    'IA'
  ).IA_PROVEEDOR;
  return proveedor;
}

/**
 * ¿Este despliegue tiene orquestador? Aunque el interruptor esté en `gemini`, las prácticas que
 * empezaron allá todavía tienen una sesión que cerrar.
 */
export function hayOrquestador(): boolean {
  return Boolean(process.env.ORQUESTADOR_URL?.trim());
}

/**
 * Acceso al orquestador, solo en el servidor. Se valida de forma diferida: con
 * `IA_PROVEEDOR=gemini` estas variables no hacen falta y nadie las lee.
 */
export function getOrquestadorEnv(): OrquestadorEnv {
  if (!orquestador) {
    const env = parseEnv(
      orquestadorEnvSchema,
      {
        ORQUESTADOR_URL: process.env.ORQUESTADOR_URL,
        ORQUESTADOR_CORREO: process.env.ORQUESTADOR_CORREO,
        ORQUESTADOR_CONTRASENA: process.env.ORQUESTADOR_CONTRASENA,
        ORQUESTADOR_CUENTAS: process.env.ORQUESTADOR_CUENTAS || undefined,
      },
      'orquestador'
    );
    const docente = { correo: env.ORQUESTADOR_CORREO, contrasena: env.ORQUESTADOR_CONTRASENA };
    orquestador = {
      url: env.ORQUESTADOR_URL,
      docente,
      // La cuenta `teacher` no se cuenta dos veces si alguien la repite en el grupo.
      grupo: env.ORQUESTADOR_CUENTAS.filter(cuenta => cuenta.correo !== docente.correo),
    };
  }
  return orquestador;
}

/** Solo para pruebas: olvida lo leído para volver a leer `process.env`. */
export function reiniciarOrquestadorEnv(): void {
  proveedor = undefined;
  orquestador = undefined;
}
