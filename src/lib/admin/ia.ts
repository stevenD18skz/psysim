import 'server-only';

import { z } from 'zod';

import { getOrquestadorEnv, getProveedorIa, type ProveedorIA } from '@/lib/env/orquestador';
import {
  cuentaDocente,
  cuentasDeConversacion,
  PRACTICAS_POR_CUENTA,
} from '@/lib/orquestador/cuentas';
import { createClient } from '@/lib/supabase/server';

/*
 * Uso del paciente con IA, para el Administrador. Los números los calcula la base de datos
 * (`admin_metricas_ia`, que solo le responde a él) con lo que guardó el servidor en cada turno.
 */

const entero = z.number().nullable();

const metricasSchema = z.object({
  desde: z.string(),
  tope_practicas_por_cuenta: entero,
  proveedores: z.array(
    z.object({
      proveedor: z.string(),
      turnos: z.number(),
      latencia_media_ms: entero,
      latencia_p95_ms: entero,
      tokens_entrada: z.number(),
      tokens_salida: z.number(),
      severidad_media: entero,
      emociones_deducidas: z.number(),
    })
  ),
  practicas: z.object({
    total: z.number(),
    en_orquestador: z.number(),
    pasaron_a_gemini: z.number(),
    cierres_por_crisis: z.number(),
    cierres_por_conducta: z.number(),
  }),
  turnos_de_respaldo: z.number(),
  cambios: z.array(z.object({ motivo: z.string().nullable(), practicas: z.number() })),
  eventos: z.array(
    z.object({
      tipo: z.string(),
      detalle: z.string(),
      veces: z.number(),
      espera_media_ms: entero,
      espera_maxima_ms: entero,
    })
  ),
  cuentas: z.array(
    z.object({
      cuenta: z.string(),
      practicas: z.number(),
      activas: z.number(),
      turnos_ultimo_minuto: z.number(),
    })
  ),
});

export type MetricasIa = z.infer<typeof metricasSchema>;

export const PERIODOS_METRICAS = [1, 7, 30, 90] as const;
export type PeriodoMetricas = (typeof PERIODOS_METRICAS)[number];

/** Métricas de la IA de los últimos `dias`. Lanza si quien consulta no es el Administrador. */
export async function obtenerMetricasIa(dias: PeriodoMetricas): Promise<MetricasIa> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_metricas_ia', { p_dias: dias });
  if (error) {
    throw new Error('No pudimos cargar las métricas de la IA.', { cause: error });
  }
  const metricas = metricasSchema.safeParse(data);
  if (!metricas.success) {
    throw new Error('Las métricas de la IA llegaron con un formato inesperado.');
  }
  return metricas.data;
}

export interface ConfiguracionIa {
  /** Proveedor de las prácticas nuevas (`IA_PROVEEDOR`). */
  proveedor: ProveedorIA;
  /** `false` si el proveedor es el orquestador pero sus variables faltan o no son válidas. */
  orquestadorListo: boolean;
  /** Cuentas del grupo configuradas (0 = modo de una sola cuenta). */
  cuentasDelGrupo: number;
  /** Prácticas simultáneas que atienden sin esperas las cuentas configuradas. */
  capacidad: number;
  /** Nombre legible de cada cuenta por su clave (nunca el correo). */
  etiquetas: Record<string, string>;
}

/** Cómo está configurado el proveedor del paciente en este despliegue (sin secretos). */
export function leerConfiguracionIa(): ConfiguracionIa {
  const proveedor = getProveedorIa();
  try {
    const env = getOrquestadorEnv();
    const docente = cuentaDocente(env);
    const etiquetas: Record<string, string> = { [docente.clave]: 'Cuenta principal (teacher)' };
    if (env.grupo.length > 0) {
      cuentasDeConversacion(env).forEach((cuenta, indice) => {
        etiquetas[cuenta.clave] = `Cuenta ${indice + 1} del grupo`;
      });
    }
    return {
      proveedor,
      orquestadorListo: true,
      cuentasDelGrupo: env.grupo.length,
      capacidad: Math.max(1, env.grupo.length) * PRACTICAS_POR_CUENTA,
      etiquetas,
    };
  } catch {
    // Sin las variables del orquestador (despliegue solo con Gemini) no hay cuentas que nombrar.
    return { proveedor, orquestadorListo: false, cuentasDelGrupo: 0, capacidad: 0, etiquetas: {} };
  }
}

/** Por qué una práctica pasó a Gemini (`sesion_ia.cambio_motivo`), en palabras. */
export const ETIQUETA_CAMBIO: Record<string, string> = {
  red: 'El orquestador no respondió',
  tiempo_agotado: 'El orquestador tardó demasiado',
  servidor: 'Error del servidor del orquestador',
  descarte_incierto: 'Turno de resultado incierto',
  autenticacion: 'Credenciales rechazadas',
  respuesta_invalida: 'Respuesta ilegible del orquestador',
  reformulacion: 'El estudiante ensayó otra respuesta',
  fuga: 'La respuesta copiaba las instrucciones',
  vacia: 'Respuesta vacía',
  interruptor: 'Interruptor de emergencia (IA_PROVEEDOR=gemini)',
  sesion_borrada: 'La sesión ya no existía en el orquestador',
  historial_previo: 'La práctica ya había empezado con Gemini',
  sesion_incompleta: 'La sesión no llegó a abrirse',
  cuenta_retirada: 'La cuenta se quitó de la configuración',
};

/** Tipos de fallo del orquestador (`orquestador_evento` con tipo `error`), en palabras. */
export const ETIQUETA_ERROR: Record<string, string> = {
  red: 'Sin respuesta (red)',
  tiempo_agotado: 'Tiempo agotado',
  servidor: 'Error del servidor (5xx)',
  descarte_incierto: 'Turno de resultado incierto',
  autenticacion: 'Credenciales rechazadas (401)',
  permiso: 'Sin permiso (403)',
  no_encontrado: 'No encontrado (404)',
  datos: 'Datos rechazados (400 o 422)',
  respuesta_invalida: 'Respuesta ilegible',
};
