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
  public: {
    Tables: {
      cash_sessions: {
        Row: {
          average_ticket: number | null
          closed_at: string | null
          created_at: string
          date: string
          deleted_at: string | null
          final_amount: number | null
          id: string
          initial_amount: number
          is_closed: boolean | null
          is_open: boolean
          opened_at: string
          sales_count: number | null
          total_entries: number
          total_exits: number
          total_expenses: number
          total_sales: number
          updated_at: string
        }
        Insert: {
          average_ticket?: number | null
          closed_at?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          final_amount?: number | null
          id?: string
          initial_amount?: number
          is_closed?: boolean | null
          is_open?: boolean
          opened_at?: string
          sales_count?: number | null
          total_entries?: number
          total_exits?: number
          total_expenses?: number
          total_sales?: number
          updated_at?: string
        }
        Update: {
          average_ticket?: number | null
          closed_at?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          final_amount?: number | null
          id?: string
          initial_amount?: number
          is_closed?: boolean | null
          is_open?: boolean
          opened_at?: string
          sales_count?: number | null
          total_entries?: number
          total_exits?: number
          total_expenses?: number
          total_sales?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_sale_payments: {
        Row: {
          amount: number
          created_at: string
          credit_sale_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          session_id: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_sale_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          session_id?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_sale_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          session_id?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_sale_payments_credit_sale_id_fkey"
            columns: ["credit_sale_id"]
            isOneToOne: false
            referencedRelation: "credit_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_sales: {
        Row: {
          amount_paid: number
          archived_at: string | null
          charge_date: string
          created_at: string
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          description: string
          id: string
          installment_value: number | null
          installments: number
          items: Json | null
          notes: string | null
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_transaction_id: string | null
          remaining_amount: number | null
          reminder_preferences: Json | null
          sale_date: string
          session_id: string | null
          status: Database["public"]["Enums"]["credit_sale_status"]
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          archived_at?: string | null
          charge_date: string
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          installment_value?: number | null
          installments?: number
          items?: Json | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_transaction_id?: string | null
          remaining_amount?: number | null
          reminder_preferences?: Json | null
          sale_date: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["credit_sale_status"]
          total: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          archived_at?: string | null
          charge_date?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          installment_value?: number | null
          installments?: number
          items?: Json | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_transaction_id?: string | null
          remaining_amount?: number | null
          reminder_preferences?: Json | null
          sale_date?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["credit_sale_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_sales_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_sales_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_config: {
        Row: {
          cnpj_loja: string | null
          created_at: string
          endereco_loja: string | null
          id: string
          instagram_loja: string | null
          largura_bobina: number
          mensagem_agradecimento: string | null
          nome_loja: string
          politica_garantia: string | null
          telefone_loja: string | null
          updated_at: string
        }
        Insert: {
          cnpj_loja?: string | null
          created_at?: string
          endereco_loja?: string | null
          id?: string
          instagram_loja?: string | null
          largura_bobina?: number
          mensagem_agradecimento?: string | null
          nome_loja?: string
          politica_garantia?: string | null
          telefone_loja?: string | null
          updated_at?: string
        }
        Update: {
          cnpj_loja?: string | null
          created_at?: string
          endereco_loja?: string | null
          id?: string
          instagram_loja?: string | null
          largura_bobina?: number
          mensagem_agradecimento?: string | null
          nome_loja?: string
          politica_garantia?: string | null
          telefone_loja?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          description: string
          estimated_deadline: string | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_splits: Json | null
          photos: string[] | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          deleted_at?: string | null
          description: string
          estimated_deadline?: string | null
          id?: string
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_splits?: Json | null
          photos?: string[] | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          description?: string
          estimated_deadline?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_splits?: Json | null
          photos?: string[] | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          auto_suggestion: boolean
          created_at: string
          currency: string
          id: string
          paper_width: number
          store_name: string
          store_phone: string | null
          theme: string
          updated_at: string
        }
        Insert: {
          auto_suggestion?: boolean
          created_at?: string
          currency?: string
          id?: string
          paper_width?: number
          store_name?: string
          store_phone?: string | null
          theme?: string
          updated_at?: string
        }
        Update: {
          auto_suggestion?: boolean
          created_at?: string
          currency?: string
          id?: string
          paper_width?: number
          store_name?: string
          store_phone?: string | null
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_splits: Json | null
          quantity: number
          service_order_id: string | null
          session_id: string | null
          total: number
          type: Database["public"]["Enums"]["transaction_type"]
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_splits?: Json | null
          quantity?: number
          service_order_id?: string | null
          session_id?: string | null
          total: number
          type: Database["public"]["Enums"]["transaction_type"]
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_splits?: Json | null
          quantity?: number
          service_order_id?: string | null
          session_id?: string | null
          total?: number
          type?: Database["public"]["Enums"]["transaction_type"]
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_service_orders"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      credit_sale_status: "em_aberto" | "paga"
      order_status: "aberta" | "concluida" | "cancelada"
      payment_method:
        | "dinheiro"
        | "pix"
        | "cartao_debito"
        | "cartao_credito"
        | "outros"
      transaction_type: "entrada" | "saida" | "venda" | "despesa"
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
      credit_sale_status: ["em_aberto", "paga"],
      order_status: ["aberta", "concluida", "cancelada"],
      payment_method: [
        "dinheiro",
        "pix",
        "cartao_debito",
        "cartao_credito",
        "outros",
      ],
      transaction_type: ["entrada", "saida", "venda", "despesa"],
    },
  },
} as const
