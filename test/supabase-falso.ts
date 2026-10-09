import { vi } from 'vitest';

/** Lo que devuelve una consulta de Supabase: `{ data, error }` (y `count` si se pidió). */
export interface Respuesta {
  data?: unknown;
  count?: number | null;
  error?: { code?: string; message?: string; status?: number } | null;
}

export type Operacion = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

/** Una consulta ejecutada contra el cliente falso, para las aserciones. */
export interface Consulta {
  tabla: string;
  operacion: Operacion;
  /** Valores enviados en `insert`, `update` o `upsert`. */
  valores?: unknown;
  /** Columnas pedidas en `select`. */
  columnas?: string;
  /** Filtros y modificadores en orden: `['eq', 'id', '…']`, `['order', 'codigo']`… */
  filtros: unknown[][];
}

const MODIFICADORES = [
  'eq',
  'neq',
  'not',
  'is',
  'in',
  'like',
  'ilike',
  'gt',
  'gte',
  'lt',
  'lte',
  'order',
  'limit',
  'range',
  'match',
] as const;

/**
 * Cliente de Supabase falso para tests de Server Actions, consultas y Route Handlers.
 *
 * Cada `from(tabla)` devuelve un constructor encadenable que registra la operación y sus filtros
 * en `consultas`. Al resolverse (`await`, `.single()` o `.maybeSingle()`) toma la siguiente
 * respuesta de la cola de esa tabla (`responder`); sin respuesta en cola, devuelve
 * `{ data: null, error: null }`. Así cada test declara solo lo que la base de datos "contesta".
 *
 *   const db = crearSupabaseFalso();
 *   db.responder('sesion', { data: { id: '…' } });
 *   vi.mocked(createClient).mockResolvedValue(db.cliente as never);
 */
export function crearSupabaseFalso() {
  const colas = new Map<string, Respuesta[]>();
  const consultas: Consulta[] = [];

  const siguiente = (clave: string): Respuesta => {
    const cola = colas.get(clave);
    return cola?.shift() ?? { data: null, error: null };
  };

  function constructor(tabla: string) {
    const consulta: Consulta = { tabla, operacion: 'select', filtros: [] };
    let registrada = false;
    const resolver = () => {
      if (!registrada) {
        consultas.push(consulta);
        registrada = true;
      }
      const { data = null, error = null, count = null } = siguiente(tabla);
      return Promise.resolve({ data, error, count });
    };

    const encadenable: Record<string, unknown> = {
      select(columnas?: string) {
        // Tras un insert/update, `select` solo pide las columnas de vuelta.
        consulta.columnas = columnas;
        return encadenable;
      },
      insert(valores: unknown) {
        Object.assign(consulta, { operacion: 'insert', valores });
        return encadenable;
      },
      update(valores: unknown) {
        Object.assign(consulta, { operacion: 'update', valores });
        return encadenable;
      },
      upsert(valores: unknown) {
        Object.assign(consulta, { operacion: 'upsert', valores });
        return encadenable;
      },
      delete() {
        consulta.operacion = 'delete';
        return encadenable;
      },
      single: resolver,
      maybeSingle: resolver,
      then(alResolver: (valor: unknown) => unknown, alRechazar?: (motivo: unknown) => unknown) {
        return resolver().then(alResolver, alRechazar);
      },
    };
    for (const nombre of MODIFICADORES) {
      encadenable[nombre] = (...argumentos: unknown[]) => {
        consulta.filtros.push([nombre, ...argumentos]);
        return encadenable;
      };
    }
    return encadenable;
  }

  const auth = {
    getUser: vi.fn(async () => ({ data: { user: null }, error: null }) as unknown),
    signInWithPassword: vi.fn(async () => ({ data: {}, error: null }) as unknown),
    signInWithOAuth: vi.fn(
      async () =>
        ({ data: { url: 'https://accounts.google.com/o/oauth2' }, error: null }) as unknown
    ),
    exchangeCodeForSession: vi.fn(async () => ({ data: { user: null }, error: null }) as unknown),
    signOut: vi.fn(async () => ({ error: null }) as unknown),
    updateUser: vi.fn(async () => ({ data: {}, error: null }) as unknown),
    /** API de administración (solo con la clave secreta). */
    admin: {
      createUser: vi.fn(async () => ({ data: { user: { id: 'nuevo' } }, error: null }) as unknown),
      updateUserById: vi.fn(async () => ({ data: {}, error: null }) as unknown),
      deleteUser: vi.fn(async () => ({ data: {}, error: null }) as unknown),
    },
  };

  const rpc = vi.fn(async (funcion: string) => {
    const { data = null, error = null } = siguiente(`rpc:${funcion}`);
    return { data, error };
  });

  return {
    cliente: { from: constructor, auth, rpc },
    auth,
    rpc,
    consultas,
    /** Encola la próxima respuesta de una tabla (o de una función: `rpc:nombre`). */
    responder(tabla: string, ...respuestas: Respuesta[]) {
      colas.set(tabla, [...(colas.get(tabla) ?? []), ...respuestas]);
    },
    /** Consultas registradas sobre una tabla. */
    de(tabla: string) {
      return consultas.filter(c => c.tabla === tabla);
    },
  };
}

export type SupabaseFalso = ReturnType<typeof crearSupabaseFalso>;
