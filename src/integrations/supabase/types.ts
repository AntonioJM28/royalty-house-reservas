export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      configuracion: {
        Row: {
          horas_min_cancelacion: number
          id: number
          max_bloques_billar: number
          max_reservas_activas: number
          minutos_tolerancia: number
        }
        Insert: {
          horas_min_cancelacion?: number
          id?: number
          max_bloques_billar?: number
          max_reservas_activas?: number
          minutos_tolerancia?: number
        }
        Update: {
          horas_min_cancelacion?: number
          id?: number
          max_bloques_billar?: number
          max_reservas_activas?: number
          minutos_tolerancia?: number
        }
        Relationships: []
      }
      consumos: {
        Row: {
          cantidad: number
          fecha: string
          id: string
          precio_unitario: number
          producto_id: string
          registrado_por: string | null
          reserva_id: string
        }
        Insert: {
          cantidad: number
          fecha?: string
          id?: string
          precio_unitario: number
          producto_id: string
          registrado_por?: string | null
          reserva_id: string
        }
        Update: {
          cantidad?: number
          fecha?: string
          id?: string
          precio_unitario?: number
          producto_id?: string
          registrado_por?: string | null
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      horario_atencion: {
        Row: {
          hora_apertura: string
          hora_cierre: string
          id: number
        }
        Insert: {
          hora_apertura: string
          hora_cierre: string
          id?: number
        }
        Update: {
          hora_apertura?: string
          hora_cierre?: string
          id?: number
        }
        Relationships: []
      }
      lista_blanca: {
        Row: {
          correo: string
          created_at: string
          rol: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          correo: string
          created_at?: string
          rol: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          correo?: string
          created_at?: string
          rol?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      pedido_candy: {
        Row: {
          cantidad: number
          id: string
          producto_id: string
          reserva_id: string
        }
        Insert: {
          cantidad: number
          id?: string
          producto_id: string
          reserva_id: string
        }
        Update: {
          cantidad?: number
          id?: string
          producto_id?: string
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_candy_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_candy_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      peliculas: {
        Row: {
          duracion_min: number
          en_cartelera: boolean
          id: string
          titulo: string
        }
        Insert: {
          duracion_min: number
          en_cartelera?: boolean
          id?: string
          titulo: string
        }
        Update: {
          duracion_min?: number
          en_cartelera?: boolean
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          activo: boolean
          existencias: number
          id: string
          nombre: string
          precio: number
        }
        Insert: {
          activo?: boolean
          existencias?: number
          id?: string
          nombre: string
          precio: number
        }
        Update: {
          activo?: boolean
          existencias?: number
          id?: string
          nombre?: string
          precio?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          acepto_datos: boolean
          correo: string
          created_at: string
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          acepto_datos?: boolean
          correo: string
          created_at?: string
          id: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          acepto_datos?: boolean
          correo?: string
          created_at?: string
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      recursos: {
        Row: {
          activo: boolean
          capacidad: number
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_recurso"]
        }
        Insert: {
          activo?: boolean
          capacidad: number
          id?: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_recurso"]
        }
        Update: {
          activo?: boolean
          capacidad?: number
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_recurso"]
        }
        Relationships: []
      }
      reserva_bloques: {
        Row: {
          bloque: number
          fecha: string
          id: string
          recurso_id: string
          reserva_id: string
        }
        Insert: {
          bloque: number
          fecha: string
          id?: string
          recurso_id: string
          reserva_id: string
        }
        Update: {
          bloque?: number
          fecha?: string
          id?: string
          recurso_id?: string
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bloque_reserva"
            columns: ["reserva_id", "recurso_id", "fecha"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id", "recurso_id", "fecha"]
          },
          {
            foreignKeyName: "reserva_bloques_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recursos"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          bloques: number
          codigo: string
          creada_en: string
          creada_por: string | null
          estado: Database["public"]["Enums"]["estado_reserva"]
          fecha: string
          hora_entrada: string | null
          hora_inicio: string
          hora_salida: string | null
          id: string
          nombre_cliente: string
          pelicula_id: string | null
          personas: number | null
          recurso_id: string
          telefono_cliente: string
          usuario_id: string | null
        }
        Insert: {
          bloques: number
          codigo: string
          creada_en?: string
          creada_por?: string | null
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha: string
          hora_entrada?: string | null
          hora_inicio: string
          hora_salida?: string | null
          id?: string
          nombre_cliente: string
          pelicula_id?: string | null
          personas?: number | null
          recurso_id: string
          telefono_cliente: string
          usuario_id?: string | null
        }
        Update: {
          bloques?: number
          codigo?: string
          creada_en?: string
          creada_por?: string | null
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha?: string
          hora_entrada?: string | null
          hora_inicio?: string
          hora_salida?: string | null
          id?: string
          nombre_cliente?: string
          pelicula_id?: string | null
          personas?: number | null
          recurso_id?: string
          telefono_cliente?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservas_pelicula_id_fkey"
            columns: ["pelicula_id"]
            isOneToOne: false
            referencedRelation: "peliculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recursos"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas: {
        Row: {
          precio_hora: number
          tipo: Database["public"]["Enums"]["tipo_recurso"]
        }
        Insert: {
          precio_hora: number
          tipo: Database["public"]["Enums"]["tipo_recurso"]
        }
        Update: {
          precio_hora?: number
          tipo?: Database["public"]["Enums"]["tipo_recurso"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ahora_local: { Args: never; Returns: string }
      completar_perfil: {
        Args: { p_telefono: string }
        Returns: Json
      }
      cambiar_estado_reserva: {
        Args: {
          p_estado: Database["public"]["Enums"]["estado_reserva"]
          p_id: string
        }
        Returns: undefined
      }
      cancelar_reserva: { Args: { p_id: string }; Returns: undefined }
      crear_reserva: {
        Args: {
          p_bloques: number
          p_fecha: string
          p_hora_inicio: string
          p_nombre_cliente?: string
          p_pelicula_id?: string
          p_personas?: number
          p_productos?: Json
          p_recurso_id: string
          p_telefono_cliente?: string
        }
        Returns: {
          bloques: number
          codigo: string
          creada_en: string
          creada_por: string | null
          estado: Database["public"]["Enums"]["estado_reserva"]
          fecha: string
          hora_entrada: string | null
          hora_inicio: string
          hora_salida: string | null
          id: string
          nombre_cliente: string
          pelicula_id: string | null
          personas: number | null
          recurso_id: string
          telefono_cliente: string
          usuario_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      es_personal: { Args: { _user_id: string }; Returns: boolean }
      generar_codigo: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      obtener_ocupacion: {
        Args: {
          p_fecha: string
          p_tipo: Database["public"]["Enums"]["tipo_recurso"][]
        }
        Returns: {
          bloque: number
          recurso_id: string
        }[]
      }
      registrar_consumo: {
        Args: {
          p_cantidad: number
          p_producto_id: string
          p_reserva_id: string
        }
        Returns: undefined
      }
      reporte_resumen: {
        Args: { p_desde: string; p_hasta: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "CLIENTE" | "RECEPCIONISTA" | "ADMINISTRADOR"
      estado_reserva:
        | "CONFIRMADA"
        | "EN_USO"
        | "FINALIZADA"
        | "CANCELADA"
        | "NO_PRESENTADA"
      tipo_recurso: "MESA_NORMAL" | "MESA_VIP" | "SALA_MINICINE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["CLIENTE", "RECEPCIONISTA", "ADMINISTRADOR"],
      estado_reserva: [
        "CONFIRMADA",
        "EN_USO",
        "FINALIZADA",
        "CANCELADA",
        "NO_PRESENTADA",
      ],
      tipo_recurso: ["MESA_NORMAL", "MESA_VIP", "SALA_MINICINE"],
    },
  },
} as const
