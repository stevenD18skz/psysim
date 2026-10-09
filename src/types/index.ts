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
  /** Sesiones que el estudiante está haciendo ahora mismo. */
  enCurso: number;
  /** Sesiones terminadas cuya retroalimentación aún no se ha publicado. */
  pendientesRetroalimentacion: number;
  /** Promedio de las notas publicadas (0.0–5.0), o `null` si aún no tiene. */
  notaPromedio: number | null;
  /** Códigos de acceso vigentes que aún no ha usado. */
  codigosPendientes: number;
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
  /** Correo con el que inicia sesión con Google (`null` en registros anteriores a las cuentas). */
  correo: string | null;
  /** `true` si tiene cuenta: puede recibir códigos de acceso. */
  cuentaVinculada: boolean;
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

/** Datos del usuario autenticado (docente o estudiante) que la aplicación expone (DTO). */
export interface PerfilUsuario {
  id: string;
  nombre: string;
  correo: string;
  codigoInstitucional: string;
  rol: RolUsuario;
  /** Usa la contraseña temporal que generó el Administrador: se le pide cambiarla. */
  contrasenaTemporal: boolean;
}

/** Cuenta del equipo docente (docente o Administrador) tal como la ve el Administrador. */
export interface DocenteAdmin {
  id: string;
  nombre: string;
  correo: string;
  codigoInstitucional: string;
  rol: RolUsuario;
  activo: boolean;
  /** Aún usa la contraseña temporal que le generó el Administrador. */
  contrasenaTemporal: boolean;
  /** Ya entró alguna vez con su cuenta de Google. */
  conGoogle: boolean;
  creadoEn: string;
  ultimoAcceso: string | null;
  metricas: {
    estudiantes: number;
    sesiones: number;
    enCurso: number;
    pendientesRetroalimentacion: number;
    casosPropios: number;
    ultimaSesion: string | null;
  };
}

/** Estado de un código de acceso, derivado de sus fechas y de si ya se canjeó. */
export type EstadoAsignacion = 'pendiente' | 'usada' | 'anulada' | 'vencida';

/** Código de acceso que el docente generó para un estudiante. */
export interface Asignacion {
  id: string;
  codigo: string;
  estado: EstadoAsignacion;
  expiraEn: string;
  creadoEn: string;
  sesionId: string | null;
  escenario: { codigo: string; titulo: string };
}

/** Sesión en un listado (historial del estudiante o del docente). */
export interface SesionHistorial {
  id: string;
  estado: EstadoSesion;
  comenzada: boolean;
  inicio: string;
  fin: string | null;
  escenario: { codigo: string; titulo: string };
  /** Nombre del docente que la asignó (en el panel del estudiante). */
  docente: string | null;
  /** `null` si el docente aún no ha empezado a revisarla. */
  retroalimentacion: { publicada: boolean; nota: number | null } | null;
}

/** Frase subrayada por el docente en una intervención del estudiante. */
export interface Anotacion {
  id: string;
  mensajeId: string;
  /** Posiciones en puntos de código dentro del mensaje: [inicio, fin). */
  inicio: number;
  fin: number;
  fragmento: string;
  comentario: string;
}

/** Retroalimentación de una sesión (borrador o publicada). */
export interface Retroalimentacion {
  comentarioGeneral: string;
  /** 0.0–5.0 con un decimal. */
  nota: number | null;
  publicadaEn: string | null;
  actualizadoEn: string;
  anotaciones: Anotacion[];
}

/** Sesión completa para revisarla (docente) o releerla con su retroalimentación (estudiante). */
export interface DetalleSesion {
  id: string;
  estado: EstadoSesion;
  comenzada: boolean;
  inicio: string;
  fin: string | null;
  estudiante: { id: string; codigo: string; nombre: string };
  docente: string | null;
  escenario: Pick<
    EscenarioCatalogo,
    'codigo' | 'titulo' | 'competenciaCentral' | 'configuracion3d'
  >;
  npc: Pick<NpcEscenario, 'nombre' | 'edad'>;
  mensajes: MensajeConversacion[];
  retroalimentacion: Retroalimentacion | null;
}
