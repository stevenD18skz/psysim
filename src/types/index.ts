import { type Database } from './database.types';

export type { Database, Json } from './database.types';

export type RolUsuario = Database['public']['Enums']['rol_usuario'];

/** Datos del docente autenticado que la aplicación expone a la interfaz (DTO). */
export interface PerfilDocente {
  id: string;
  nombre: string;
  correo: string;
  codigoInstitucional: string;
  rol: RolUsuario;
}
