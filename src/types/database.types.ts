export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      configuracion_guardada: {
        Row: {
          creado_en: string;
          docente_id: string;
          escenario_id: string;
          id: string;
          nombre_configuracion: string;
          prompt_personalizado: string;
        };
        Insert: {
          creado_en?: string;
          docente_id?: string;
          escenario_id: string;
          id?: string;
          nombre_configuracion: string;
          prompt_personalizado: string;
        };
        Update: {
          creado_en?: string;
          docente_id?: string;
          escenario_id?: string;
          id?: string;
          nombre_configuracion?: string;
          prompt_personalizado?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'configuracion_guardada_docente_id_fkey';
            columns: ['docente_id'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'configuracion_guardada_escenario_id_fkey';
            columns: ['escenario_id'];
            isOneToOne: false;
            referencedRelation: 'escenario';
            referencedColumns: ['id'];
          },
        ];
      };
      escenario: {
        Row: {
          activo: boolean;
          categoria: Database['public']['Enums']['categoria_escenario'];
          codigo: string;
          competencia_central: string;
          configuracion_3d: string;
          creado_en: string;
          descripcion: string;
          dificultad: Database['public']['Enums']['dificultad_escenario'];
          id: string;
          titulo: string;
        };
        Insert: {
          activo?: boolean;
          categoria: Database['public']['Enums']['categoria_escenario'];
          codigo: string;
          competencia_central: string;
          configuracion_3d: string;
          creado_en?: string;
          descripcion: string;
          dificultad: Database['public']['Enums']['dificultad_escenario'];
          id?: string;
          titulo: string;
        };
        Update: {
          activo?: boolean;
          categoria?: Database['public']['Enums']['categoria_escenario'];
          codigo?: string;
          competencia_central?: string;
          configuracion_3d?: string;
          creado_en?: string;
          descripcion?: string;
          dificultad?: Database['public']['Enums']['dificultad_escenario'];
          id?: string;
          titulo?: string;
        };
        Relationships: [];
      };
      mensaje: {
        Row: {
          contenido: string;
          creado_en: string;
          id: string;
          latencia_ms: number | null;
          remitente: Database['public']['Enums']['remitente_mensaje'];
          sesion_id: string;
          tokens_entrada: number | null;
          tokens_salida: number | null;
        };
        Insert: {
          contenido: string;
          creado_en?: string;
          id?: string;
          latencia_ms?: number | null;
          remitente: Database['public']['Enums']['remitente_mensaje'];
          sesion_id: string;
          tokens_entrada?: number | null;
          tokens_salida?: number | null;
        };
        Update: {
          contenido?: string;
          creado_en?: string;
          id?: string;
          latencia_ms?: number | null;
          remitente?: Database['public']['Enums']['remitente_mensaje'];
          sesion_id?: string;
          tokens_entrada?: number | null;
          tokens_salida?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'mensaje_sesion_id_fkey';
            columns: ['sesion_id'];
            isOneToOne: false;
            referencedRelation: 'sesion';
            referencedColumns: ['id'];
          },
        ];
      };
      npc: {
        Row: {
          creado_en: string;
          edad: number;
          escenario_id: string;
          id: string;
          nombre: string;
          perfil_clinico: string;
          prompt_sistema: string;
        };
        Insert: {
          creado_en?: string;
          edad: number;
          escenario_id: string;
          id?: string;
          nombre: string;
          perfil_clinico: string;
          prompt_sistema: string;
        };
        Update: {
          creado_en?: string;
          edad?: number;
          escenario_id?: string;
          id?: string;
          nombre?: string;
          perfil_clinico?: string;
          prompt_sistema?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'npc_escenario_id_fkey';
            columns: ['escenario_id'];
            isOneToOne: true;
            referencedRelation: 'escenario';
            referencedColumns: ['id'];
          },
        ];
      };
      sesion: {
        Row: {
          codigo_estudiante: string;
          escenario_id: string;
          estado: Database['public']['Enums']['estado_sesion'];
          fin: string | null;
          id: string;
          inicio: string;
          nombre_estudiante: string;
          prompt_sistema: string;
          usuario_id: string;
        };
        Insert: {
          codigo_estudiante: string;
          escenario_id: string;
          estado?: Database['public']['Enums']['estado_sesion'];
          fin?: string | null;
          id?: string;
          inicio?: string;
          nombre_estudiante: string;
          prompt_sistema: string;
          usuario_id?: string;
        };
        Update: {
          codigo_estudiante?: string;
          escenario_id?: string;
          estado?: Database['public']['Enums']['estado_sesion'];
          fin?: string | null;
          id?: string;
          inicio?: string;
          nombre_estudiante?: string;
          prompt_sistema?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sesion_escenario_id_fkey';
            columns: ['escenario_id'];
            isOneToOne: false;
            referencedRelation: 'escenario';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sesion_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id'];
          },
        ];
      };
      usuario: {
        Row: {
          codigo_institucional: string;
          correo: string;
          creado_en: string;
          id: string;
          nombre: string;
          rol: Database['public']['Enums']['rol_usuario'];
        };
        Insert: {
          codigo_institucional: string;
          correo: string;
          creado_en?: string;
          id: string;
          nombre: string;
          rol: Database['public']['Enums']['rol_usuario'];
        };
        Update: {
          codigo_institucional?: string;
          correo?: string;
          creado_en?: string;
          id?: string;
          nombre?: string;
          rol?: Database['public']['Enums']['rol_usuario'];
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      es_docente: { Args: never; Returns: boolean };
    };
    Enums: {
      categoria_escenario: 'clinico' | 'cotidiano';
      dificultad_escenario: 'basico' | 'intermedio' | 'avanzado';
      estado_sesion: 'en_curso' | 'finalizada' | 'interrumpida';
      remitente_mensaje: 'estudiante' | 'npc';
      rol_usuario: 'docente';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      categoria_escenario: ['clinico', 'cotidiano'],
      dificultad_escenario: ['basico', 'intermedio', 'avanzado'],
      estado_sesion: ['en_curso', 'finalizada', 'interrumpida'],
      remitente_mensaje: ['estudiante', 'npc'],
      rol_usuario: ['docente'],
    },
  },
} as const;
