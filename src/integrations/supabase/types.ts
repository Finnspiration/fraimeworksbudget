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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bskat_rates: {
        Row: {
          belob: number
          betalt: number
          betalt_dato: string | null
          forfald: string | null
          id: number
        }
        Insert: {
          belob?: number
          betalt?: number
          betalt_dato?: string | null
          forfald?: string | null
          id: number
        }
        Update: {
          belob?: number
          betalt?: number
          betalt_dato?: string | null
          forfald?: string | null
          id?: number
        }
        Relationships: []
      }
      budget_entries: {
        Row: {
          amount: number
          id: string
          konto: number
          month_index: number
        }
        Insert: {
          amount?: number
          id?: string
          konto: number
          month_index: number
        }
        Update: {
          amount?: number
          id?: string
          konto?: number
          month_index?: number
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          grp: string | null
          id: string
          label: string | null
          moms: string | null
          nr: number | null
          row_id: string | null
          row_type: string
          sort_order: number
          sum_formula: string | null
        }
        Insert: {
          grp?: string | null
          id?: string
          label?: string | null
          moms?: string | null
          nr?: number | null
          row_id?: string | null
          row_type: string
          sort_order: number
          sum_formula?: string | null
        }
        Update: {
          grp?: string | null
          id?: string
          label?: string | null
          moms?: string | null
          nr?: number | null
          row_id?: string | null
          row_type?: string
          sort_order?: number
          sum_formula?: string | null
        }
        Relationships: []
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          closed: boolean
          context_label: string | null
          context_ref: string | null
          context_type: string | null
          created_at: string
          id: string
          is_direct: boolean
          is_thread: boolean
          name: string | null
        }
        Insert: {
          closed?: boolean
          context_label?: string | null
          context_ref?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          is_direct?: boolean
          is_thread?: boolean
          name?: string | null
        }
        Update: {
          closed?: boolean
          context_label?: string | null
          context_ref?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          is_direct?: boolean
          is_thread?: boolean
          name?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      future_expenses: {
        Row: {
          belob: number
          bilag: string | null
          created_at: string
          dato: string | null
          faktura: string | null
          id: string
          konto: number
          matched: boolean
          matched_txn_id: number | null
          modkonto: number | null
          moms: string | null
          tekst: string | null
        }
        Insert: {
          belob?: number
          bilag?: string | null
          created_at?: string
          dato?: string | null
          faktura?: string | null
          id?: string
          konto: number
          matched?: boolean
          matched_txn_id?: number | null
          modkonto?: number | null
          moms?: string | null
          tekst?: string | null
        }
        Update: {
          belob?: number
          bilag?: string | null
          created_at?: string
          dato?: string | null
          faktura?: string | null
          id?: string
          konto?: number
          matched?: boolean
          matched_txn_id?: number | null
          modkonto?: number | null
          moms?: string | null
          tekst?: string | null
        }
        Relationships: []
      }
      moms_betalt: {
        Row: {
          amount: number
          quarter: number
        }
        Insert: {
          amount?: number
          quarter: number
        }
        Update: {
          amount?: number
          quarter?: number
        }
        Relationships: []
      }
      pipeline_jobs: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          description: string
          expected_payment_date: string
          id: string
          konto: number
          notes: string | null
          probability: number
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          description: string
          expected_payment_date: string
          id?: string
          konto?: number
          notes?: string | null
          probability?: number
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          description?: string
          expected_payment_date?: string
          id?: string
          konto?: number
          notes?: string | null
          probability?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          email: string | null
          id: string
          magic_link: string | null
          magic_token: string | null
          name: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          email?: string | null
          id: string
          magic_link?: string | null
          magic_token?: string | null
          name?: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          email?: string | null
          id?: string
          magic_link?: string | null
          magic_token?: string | null
          name?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value?: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      todo_cards: {
        Row: {
          assigned_to: string | null
          column_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          assigned_to?: string | null
          column_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          assigned_to?: string | null
          column_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "todo_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_columns: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          belob: number
          bilag: string | null
          customer_id: string | null
          dato: string | null
          faktura: string | null
          id: number
          konto: number
          modkonto: number | null
          moms: string | null
          tekst: string | null
          type: string | null
        }
        Insert: {
          belob?: number
          bilag?: string | null
          customer_id?: string | null
          dato?: string | null
          faktura?: string | null
          id?: number
          konto: number
          modkonto?: number | null
          moms?: string | null
          tekst?: string | null
          type?: string | null
        }
        Update: {
          belob?: number
          bilag?: string | null
          customer_id?: string | null
          dato?: string | null
          faktura?: string | null
          id?: number
          konto?: number
          modkonto?: number | null
          moms?: string | null
          tekst?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      is_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
