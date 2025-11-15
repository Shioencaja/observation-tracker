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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      lista_agencias: {
        Row: {
          CODSUCAGE: number
          DESSUCAGE: string | null
        }
        Insert: {
          CODSUCAGE: number
          DESSUCAGE?: string | null
        }
        Update: {
          CODSUCAGE?: number
          DESSUCAGE?: string | null
        }
        Relationships: []
      }
      observations: {
        Row: {
          agency: string | null
          alias: string | null
          created_at: string | null
          id: string
          project_id: string
          project_observation_option_id: string
          response: string | null
          session_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency?: string | null
          alias?: string | null
          created_at?: string | null
          id?: string
          project_id: string
          project_observation_option_id: string
          response?: string | null
          session_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency?: string | null
          alias?: string | null
          created_at?: string | null
          id?: string
          project_id?: string
          project_observation_option_id?: string
          response?: string | null
          session_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_project_observation_option_id_fkey"
            columns: ["project_observation_option_id"]
            isOneToOne: false
            referencedRelation: "project_observation_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_observation_options: {
        Row: {
          created_at: string | null
          depends_on_answer: string | null
          depends_on_question_id: string | null
          description: string | null
          id: string
          is_mandatory: boolean | null
          is_visible: boolean | null
          name: string
          next_question_map: Json | null
          options: string[] | null
          order: number
          project_id: string
          question_type: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          depends_on_answer?: string | null
          depends_on_question_id?: string | null
          description?: string | null
          id?: string
          is_mandatory?: boolean | null
          is_visible?: boolean | null
          name: string
          next_question_map?: Json | null
          options?: string[] | null
          order?: number
          project_id: string
          question_type: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          depends_on_answer?: string | null
          depends_on_question_id?: string | null
          description?: string | null
          id?: string
          is_mandatory?: boolean | null
          is_visible?: boolean | null
          name?: string
          next_question_map?: Json | null
          options?: string[] | null
          order?: number
          project_id?: string
          question_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_observation_options_depends_on_question_id_fkey"
            columns: ["depends_on_question_id"]
            isOneToOne: false
            referencedRelation: "project_observation_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_observation_options_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_users: {
        Row: {
          added_by: string
          created_at: string | null
          id: string
          project_id: string
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string
        }
        Insert: {
          added_by: string
          created_at?: string | null
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id: string
        }
        Update: {
          added_by?: string
          created_at?: string | null
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          agencies: string[] | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_finished: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          agencies?: string[] | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_finished?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          agencies?: string[] | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_finished?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          agency: string | null
          created_at: string | null
          end_time: string | null
          id: string
          project_id: string
          start_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          project_id: string
          start_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          project_id?: string
          start_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tdt_agencias: {
        Row: {
          agencia: number | null
          created_at: string
          id: number
        }
        Insert: {
          agencia?: number | null
          created_at?: string
          id?: number
        }
        Update: {
          agencia?: number | null
          created_at?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tdt_agencias_agencia_fkey"
            columns: ["agencia"]
            isOneToOne: false
            referencedRelation: "lista_agencias"
            referencedColumns: ["CODSUCAGE"]
          },
        ]
      }
      tdt_observations: {
        Row: {
          canal: string | null
          created_at: string
          descripcion: string | null
          fin: string | null
          id: number
          inicio: string | null
          lugar: string | null
          tdt_session: number
        }
        Insert: {
          canal?: string | null
          created_at?: string
          descripcion?: string | null
          fin?: string | null
          id?: number
          inicio?: string | null
          lugar?: string | null
          tdt_session: number
        }
        Update: {
          canal?: string | null
          created_at?: string
          descripcion?: string | null
          fin?: string | null
          id?: number
          inicio?: string | null
          lugar?: string | null
          tdt_session?: number
        }
        Relationships: [
          {
            foreignKeyName: "tdt_observations_tdt_session_fkey"
            columns: ["tdt_session"]
            isOneToOne: false
            referencedRelation: "tdt_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tdt_options: {
        Row: {
          canal: string | null
          descripción: string | null
          id: string
          lugar: string | null
        }
        Insert: {
          canal?: string | null
          descripción?: string | null
          id?: string
          lugar?: string | null
        }
        Update: {
          canal?: string | null
          descripción?: string | null
          id?: string
          lugar?: string | null
        }
        Relationships: []
      }
      tdt_sessions: {
        Row: {
          agencia: number | null
          cliente: string | null
          comentarios: string | null
          created_at: string
          fin: string | null
          id: number
          inicio: string | null
        }
        Insert: {
          agencia?: number | null
          cliente?: string | null
          comentarios?: string | null
          created_at?: string
          fin?: string | null
          id?: number
          inicio?: string | null
        }
        Update: {
          agencia?: number | null
          cliente?: string | null
          comentarios?: string | null
          created_at?: string
          fin?: string | null
          id?: number
          inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tdt_sessions_agencia_fkey"
            columns: ["agencia"]
            isOneToOne: false
            referencedRelation: "lista_agencias"
            referencedColumns: ["CODSUCAGE"]
          },
        ]
      }
      tdt_users: {
        Row: {
          created_at: string
          id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_session_alias: {
        Args: { session_id_input: string }
        Returns: string
      }
      get_all_users: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_user_emails: {
        Args: { user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      user_has_project_access: {
        Args: { project_id_param: string }
        Returns: boolean
      }
      user_is_project_creator: {
        Args: { project_id_input: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "creator" | "admin" | "editor" | "viewer"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: ["creator", "admin", "editor", "viewer"],
    },
  },
} as const
