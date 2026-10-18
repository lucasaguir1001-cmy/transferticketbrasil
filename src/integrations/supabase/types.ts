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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          event_id: string
          id: string
          max_uses: number | null
          updated_at: string
          uses_count: number
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          event_id: string
          id?: string
          max_uses?: number | null
          updated_at?: string
          uses_count?: number
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value?: number
          event_id?: string
          id?: string
          max_uses?: number | null
          updated_at?: string
          uses_count?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          featured: boolean
          highlights: string[] | null
          id: string
          image_url: string | null
          organizer_id: string
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          subtitle: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          featured?: boolean
          highlights?: string[] | null
          id?: string
          image_url?: string | null
          organizer_id: string
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          subtitle?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          featured?: boolean
          highlights?: string[] | null
          id?: string
          image_url?: string | null
          organizer_id?: string
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          subtitle?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          quantity: number
          tier_id: string
          unit_fee_cents: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          quantity: number
          tier_id: string
          unit_fee_cents?: number
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          quantity?: number
          tier_id?: string
          unit_fee_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          discount_cents: number
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_ref: string | null
          refund_status: Database["public"]["Enums"]["refund_status"]
          refunded_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_ref?: string | null
          refund_status?: Database["public"]["Enums"]["refund_status"]
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_cents: number
          updated_at?: string
          user_id: string
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_ref?: string | null
          refund_status?: Database["public"]["Enums"]["refund_status"]
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ticket_tiers: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          fee_cents: number
          id: string
          name: string
          price_cents: number
          quantity_available: number
          quantity_total: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          fee_cents?: number
          id?: string
          name: string
          price_cents: number
          quantity_available: number
          quantity_total: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          fee_cents?: number
          id?: string
          name?: string
          price_cents?: number
          quantity_available?: number
          quantity_total?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          checked_in_at: string | null
          code: string
          created_at: string
          event_id: string
          id: string
          order_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          tier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          code: string
          created_at?: string
          event_id: string
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          tier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          code?: string
          created_at?: string
          event_id?: string
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          tier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      organizers_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "organizer" | "user"
      coupon_discount_type: "percent" | "fixed"
      event_status: "draft" | "published" | "ended" | "cancelled"
      order_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
      payment_provider: "stripe" | "mercadopago" | "mock"
      refund_status: "none" | "requested" | "refunded" | "failed"
      ticket_status: "valid" | "used" | "cancelled"
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
      app_role: ["admin", "organizer", "user"],
      coupon_discount_type: ["percent", "fixed"],
      event_status: ["draft", "published", "ended", "cancelled"],
      order_status: ["pending", "paid", "failed", "refunded", "cancelled"],
      payment_provider: ["stripe", "mercadopago", "mock", "syncpay"],
      refund_status: ["none", "requested", "refunded", "failed"],
      ticket_status: ["valid", "used", "cancelled"],
    },
  },
} as const
