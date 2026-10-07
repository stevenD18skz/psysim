import { type EmocionNpc } from '@/lib/conversacion/emociones';
import { type BorradorCaso } from '@/schemas/caso.schema';

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
  /** `true` si es un caso creado por el docente ("Mis casos"); `false` si es del catálogo oficial. */
  propio: boolean;
  /** Campos del constructor guiado, para volver a editar un caso propio. */
  borrador: BorradorCaso | null;
  creadoEn: string;
}

/** Métricas básicas de un estudiante (vista `estudiante_resumen`). */
export interface MetricasEstudiante {
  sesiones: number;
  finalizadas: number;
  /** Tiempo de práctica de las sesiones finalizadas (s). */
  segundosPractica: number;
  /** Casos distintos que ha practicado. */
  casos: number;
  /** Mensajes que ha enviado al paciente en todas sus sesiones. */
  intervenciones: number;
  /** Inicio de su sesión más reciente (ISO 8601), o `null` si aún no tiene. */
  ultimaSesion: string | null;
}

/** Estudiante registrado por el docente, con sus métricas básicas. */
export interface EstudianteRegistrado {
  id: string;
  codigo: string;
  nombre: string;
  creadoEn: string;
  metricas: MetricasEstudiante;
}

/** Sesión de simulación en curso, tal como la consumen la escena 3D y el chat. */
export interface SesionActiva {
  id: string;
  /** Momento en que comenzó la simulación (o en que se creó, si aún no ha comenzado). */
  inicio: string;
  /** HU-23: `true` cuando el estudiante confirmó las instrucciones; desde ahí corre el tiempo. */
  comenzada: boolean;
  estudiante: { codigo: string; nombre: string };
  escenario: Pick<
    EscenarioCatalogo,
    | 'id'
    | 'codigo'
    | 'titulo'
    | 'descripcion'
    | 'categoria'
    | 'dificultad'
    | 'competenciaCentral'
    | 'configuracion3d'
  >;
  npc: Pick<NpcEscenario, 'id' | 'nombre' | 'edad' | 'perfilClinico'>;
}

export type RemitenteMensaje = Database['public']['Enums']['remitente_mensaje'];

/** Mensaje de la conversación con el paciente virtual (HU-14 · T01). */
export interface MensajeConversacion {
  id: string;
  remitente: RemitenteMensaje;
  contenido: string;
  /** Momento del mensaje (ISO 8601). */
  timestamp: string;
  /** Solo en mensajes del NPC: tiempo de respuesta en milisegundos. */
  latencia_ms?: number;
  /**
   * Solo en mensajes del NPC: emoción que expresa con el cuerpo en la escena 3D. No se guarda en
   * la base de datos: al retomar una sesión, las respuestas anteriores no la tienen.
   */
  emocion?: EmocionNpc;
}

/** Datos del docente autenticado que la aplicación expone a la interfaz (DTO). */
export interface PerfilDocente {
  id: string;
  nombre: string;
  correo: string;
  codigoInstitucional: string;
  rol: RolUsuario;
}
