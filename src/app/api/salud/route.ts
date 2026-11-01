import { createAdminClient } from '@/lib/supabase/admin';

/** Para que ningún caché responda por la aplicación: una comprobación de salud debe ser fresca. */
const SIN_CACHE = { 'Cache-Control': 'no-store' } as const;

/**
 * Comprobación de salud para monitores externos (UptimeRobot, Vercel Cron, el balanceador).
 *
 * - `GET /api/salud`: la aplicación responde. Sin base de datos, para que un monitor frecuente no
 *   gaste conexiones.
 * - `GET /api/salud?profunda=1`: además consulta la base de datos (503 si no responde).
 *
 * No devuelve secretos, versiones de paquetes ni mensajes internos: solo el estado y la
 * revisión desplegada.
 */
export async function GET(request: Request): Promise<Response> {
  const revision = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local';
  const base = { revision, hora: new Date().toISOString() };

  if (new URL(request.url).searchParams.get('profunda') !== '1') {
    return Response.json({ estado: 'ok', ...base }, { headers: SIN_CACHE });
  }

  const inicio = performance.now();
  try {
    // Los monitores llaman sin sesión y el rol anónimo no tiene permisos sobre ninguna tabla: con
    // el cliente de la petición, la consulta fallaría siempre y la alerta quedaría encendida.
    const supabase = createAdminClient();
    const { error } = await supabase.from('escenario').select('id', { head: true, count: 'exact' });
    if (error) throw error;
    return Response.json(
      { estado: 'ok', ...base, base_de_datos_ms: Math.round(performance.now() - inicio) },
      { headers: SIN_CACHE }
    );
  } catch {
    return Response.json(
      { estado: 'degradado', ...base, base_de_datos: 'sin respuesta' },
      { status: 503, headers: SIN_CACHE }
    );
  }
}
