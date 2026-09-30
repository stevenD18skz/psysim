import { type Database } from './database.types';

export type { Database, Json } from './database.types';

export type RolUsuario = Database['public']['Enums']['rol_usuario'];

export type CategoriaEscenario = Database['public']['Enums']['categoria_escenario'];
export type DificultadEscenario = Database['public']['Enums']['dificultad_escenario'];
export type EstadoSesion = Database['public']['Enums']['estado_sesion'];

/** Paciente virtual asociado a un escenario. */
export interface NpcEscenario {
  id: string;
  nombre: string;
  edad: number;
  perfilClinico: string;
  promptSistema: string;
}

/** Escenario del catálogo, con su paciente virtual (HU-06). */
export interface EscenarioCatalogo {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaEscenario;
  dificultad: DificultadEscenario;
  competenciaCentral: string;
  /** Ruta relativa a /public del JSON de la escena 3D. */
  configuracion3d: string;
  npc: NpcEscenario;
}

/** Configuración guardada por el docente (HU-07). */
export interface ConfiguracionGuardada {
  id: string;
  nombre: string;
  escenarioId: string;
  promptPersonalizado: string;
  creadoEn: string;
}

/** Sesión de simulación en curso, tal como la consumen la escena 3D y el chat. */
export interface SesionActiva {
  id: string;
  inicio: string;
  estudiante: { codigo: string; nombre: string };
  escenario: Pick<
    EscenarioCatalogo,
    | 'id'
    | 'codigo'
    | 'titulo'
    | 'categoria'
    | 'dificultad'
    | 'competenciaCentral'
    | 'configuracion3d'
  >;
  npc: Pick<NpcEscenario, 'id' | 'nombre' | 'edad'>;
}

/** Datos del docente autenticado que la aplicación expone a la interfaz (DTO). */
export interface PerfilDocente {
  id: string;
  nombre: string;
  correo: string;
  codigoInstitucional: string;
  rol: RolUsuario;
}
