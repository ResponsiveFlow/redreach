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
      app_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      app_counters: {
        Row: {
          key: string
          value: number
        }
        Insert: {
          key: string
          value?: number
        }
        Update: {
          key?: string
          value?: number
        }
        Relationships: []
      }
      colonists: {
        Row: {
          colonist_name: string | null
          colonist_number: number
          created_at: string
          email: string
          id: string
          ig_username: string | null
          lang: string
          q: number
          r: number
          ref_code: string
          referred_by: string | null
          sector_id: number
          source: string
          tiktok_username: string | null
          zone: Database["public"]["Enums"]["zone_t"]
        }
        Insert: {
          colonist_name?: string | null
          colonist_number: number
          created_at?: string
          email: string
          id: string
          ig_username?: string | null
          lang?: string
          q: number
          r: number
          ref_code: string
          referred_by?: string | null
          sector_id: number
          source?: string
          tiktok_username?: string | null
          zone: Database["public"]["Enums"]["zone_t"]
        }
        Update: {
          colonist_name?: string | null
          colonist_number?: number
          created_at?: string
          email?: string
          id?: string
          ig_username?: string | null
          lang?: string
          q?: number
          r?: number
          ref_code?: string
          referred_by?: string | null
          sector_id?: number
          source?: string
          tiktok_username?: string | null
          zone?: Database["public"]["Enums"]["zone_t"]
        }
        Relationships: [
          {
            foreignKeyName: "colonists_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "colonists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colonists_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_stats"
            referencedColumns: ["sector_id"]
          },
          {
            foreignKeyName: "colonists_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          cols: number
          created_at: string
          deposits: Json
          id: number
          index: number
          is_open: boolean
          rows: number
          zone: Database["public"]["Enums"]["zone_t"]
        }
        Insert: {
          cols: number
          created_at?: string
          deposits?: Json
          id?: never
          index: number
          is_open?: boolean
          rows: number
          zone: Database["public"]["Enums"]["zone_t"]
        }
        Update: {
          cols?: number
          created_at?: string
          deposits?: Json
          id?: never
          index?: number
          is_open?: boolean
          rows?: number
          zone?: Database["public"]["Enums"]["zone_t"]
        }
        Relationships: []
      }
      slot_holds: {
        Row: {
          expires_at: string
          q: number
          r: number
          sector_id: number
          session_id: string
          zone: Database["public"]["Enums"]["zone_t"]
        }
        Insert: {
          expires_at: string
          q: number
          r: number
          sector_id: number
          session_id: string
          zone: Database["public"]["Enums"]["zone_t"]
        }
        Update: {
          expires_at?: string
          q?: number
          r?: number
          sector_id?: number
          session_id?: string
          zone?: Database["public"]["Enums"]["zone_t"]
        }
        Relationships: [
          {
            foreignKeyName: "slot_holds_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_stats"
            referencedColumns: ["sector_id"]
          },
          {
            foreignKeyName: "slot_holds_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          day: string
          lang: string
          source: string
          visitor_id: string
        }
        Insert: {
          day?: string
          lang?: string
          source?: string
          visitor_id: string
        }
        Update: {
          day?: string
          lang?: string
          source?: string
          visitor_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_holds: {
        Row: {
          q: number | null
          r: number | null
          sector_id: number | null
        }
        Insert: {
          q?: number | null
          r?: number | null
          sector_id?: number | null
        }
        Update: {
          q?: number | null
          r?: number | null
          sector_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "slot_holds_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_stats"
            referencedColumns: ["sector_id"]
          },
          {
            foreignKeyName: "slot_holds_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      public_slots: {
        Row: {
          colonist_name: string | null
          colonist_number: number | null
          q: number | null
          r: number | null
          sector_id: number | null
          zone: Database["public"]["Enums"]["zone_t"] | null
        }
        Insert: {
          colonist_name?: string | null
          colonist_number?: number | null
          q?: number | null
          r?: number | null
          sector_id?: number | null
          zone?: Database["public"]["Enums"]["zone_t"] | null
        }
        Update: {
          colonist_name?: string | null
          colonist_number?: number | null
          q?: number | null
          r?: number | null
          sector_id?: number | null
          zone?: Database["public"]["Enums"]["zone_t"] | null
        }
        Relationships: [
          {
            foreignKeyName: "colonists_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_stats"
            referencedColumns: ["sector_id"]
          },
          {
            foreignKeyName: "colonists_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_stats: {
        Row: {
          fill: number | null
          index: number | null
          sector_id: number | null
          zone: Database["public"]["Enums"]["zone_t"] | null
        }
        Relationships: []
      }
      site_countdown: {
        Row: {
          enabled: boolean | null
          ends_at: string | null
        }
        Relationships: []
      }
      zone_stats: {
        Row: {
          colonists: number | null
          zone: Database["public"]["Enums"]["zone_t"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_open_sector: {
        Args: { p_zone: Database["public"]["Enums"]["zone_t"] }
        Returns: {
          cols: number
          created_at: string
          deposits: Json
          id: number
          index: number
          is_open: boolean
          rows: number
          zone: Database["public"]["Enums"]["zone_t"]
        }
        SetofOptions: {
          from: "*"
          to: "sectors"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_stats: { Args: never; Returns: Json }
      cfg: { Args: { p_key: string }; Returns: number }
      complete_registration: {
        Args: {
          p_ig?: string
          p_lang?: string
          p_name?: string
          p_q: number
          p_r: number
          p_ref?: string
          p_sector: number
          p_session: string
          p_source?: string
          p_tiktok?: string
        }
        Returns: {
          colonist_name: string | null
          colonist_number: number
          created_at: string
          email: string
          id: string
          ig_username: string | null
          lang: string
          q: number
          r: number
          ref_code: string
          referred_by: string | null
          sector_id: number
          source: string
          tiktok_username: string | null
          zone: Database["public"]["Enums"]["zone_t"]
        }
        SetofOptions: {
          from: "*"
          to: "colonists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_sector: {
        Args: { p_zone: Database["public"]["Enums"]["zone_t"] }
        Returns: {
          cols: number
          created_at: string
          deposits: Json
          id: number
          index: number
          is_open: boolean
          rows: number
          zone: Database["public"]["Enums"]["zone_t"]
        }
        SetofOptions: {
          from: "*"
          to: "sectors"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deposit_distance: {
        Args: { p_deposits: Json; p_q: number; p_r: number }
        Returns: number
      }
      hex_distance: {
        Args: { q1: number; q2: number; r1: number; r2: number }
        Returns: number
      }
      hold_slot: {
        Args: { p_q: number; p_r: number; p_sector: number; p_session: string }
        Returns: string
      }
      invite_lookup: {
        Args: { p_ref: string }
        Returns: {
          colonist_name: string
          colonist_number: number
          q: number
          r: number
          sector_id: number
          zone: Database["public"]["Enums"]["zone_t"]
        }[]
      }
      log_visit: {
        Args: { p_lang?: string; p_source?: string; p_visitor: string }
        Returns: undefined
      }
      maybe_open_next_sector: {
        Args: { p_zone: Database["public"]["Enums"]["zone_t"] }
        Returns: undefined
      }
      my_invite_count: { Args: never; Returns: number }
      release_slot: { Args: { p_session: string }; Returns: undefined }
      set_colonist_name: { Args: { p_name: string }; Returns: string }
      set_social_handles: {
        Args: { p_ig?: string; p_tiktok?: string }
        Returns: {
          colonist_name: string | null
          colonist_number: number
          created_at: string
          email: string
          id: string
          ig_username: string | null
          lang: string
          q: number
          r: number
          ref_code: string
          referred_by: string | null
          sector_id: number
          source: string
          tiktok_username: string | null
          zone: Database["public"]["Enums"]["zone_t"]
        }
        SetofOptions: {
          from: "*"
          to: "colonists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      zone_t: "ice" | "metal" | "sun"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      zone_t: ["ice", "metal", "sun"],
    },
  },
} as const
