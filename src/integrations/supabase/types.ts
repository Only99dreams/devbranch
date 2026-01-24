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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      donations: {
        Row: {
          amount: number
          created_at: string
          currency: string
          donor_email: string | null
          donor_name: string | null
          id: string
          is_anonymous: boolean | null
          message: string | null
          payment_method: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      download_requests: {
        Row: {
          created_at: string
          id: string
          media_id: string
          request_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["download_request_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          request_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["download_request_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          request_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["download_request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_requests_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_content"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          address: string | null
          created_at: string
          email: string
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          full_name: string
          id: string
          is_reviewed: boolean | null
          message: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          full_name: string
          id?: string
          is_reviewed?: boolean | null
          message: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          feedback_type?: Database["public"]["Enums"]["feedback_type"]
          full_name?: string
          id?: string
          is_reviewed?: boolean | null
          message?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ended_at: string | null
          external_stream_url: string | null
          id: string
          recording_status:
            | Database["public"]["Enums"]["recording_status"]
            | null
          recording_url: string | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["stream_status"]
          stream_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          external_stream_url?: string | null
          id?: string
          recording_status?:
            | Database["public"]["Enums"]["recording_status"]
            | null
          recording_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["stream_status"]
          stream_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          external_stream_url?: string | null
          id?: string
          recording_status?:
            | Database["public"]["Enums"]["recording_status"]
            | null
          recording_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["stream_status"]
          stream_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_content: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration: number | null
          file_url: string | null
          id: string
          is_downloadable: boolean | null
          is_published: boolean | null
          media_type: Database["public"]["Enums"]["media_type"]
          thumbnail_url: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          view_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          file_url?: string | null
          id?: string
          is_downloadable?: boolean | null
          is_published?: boolean | null
          media_type: Database["public"]["Enums"]["media_type"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          view_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          file_url?: string | null
          id?: string
          is_downloadable?: boolean | null
          is_published?: boolean | null
          media_type?: Database["public"]["Enums"]["media_type"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      prayer_participants: {
        Row: {
          can_speak: boolean | null
          can_video: boolean | null
          hand_raised: boolean | null
          id: string
          is_muted: boolean | null
          joined_at: string
          left_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          can_speak?: boolean | null
          can_video?: boolean | null
          hand_raised?: boolean | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          left_at?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          can_speak?: boolean | null
          can_video?: boolean | null
          hand_raised?: boolean | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          left_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "prayer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ended_at: string | null
          id: string
          max_participants: number | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["prayer_session_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          max_participants?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["prayer_session_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          max_participants?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["prayer_session_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          location: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      make_user_admin: { Args: { admin_email: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      download_request_status: "pending" | "approved" | "denied"
      feedback_type: "inquiry" | "feedback" | "complaint"
      media_type: "video" | "audio" | "pdf" | "text"
      prayer_session_status: "scheduled" | "active" | "ended"
      recording_status: "pending" | "saved" | "discarded"
      stream_status: "scheduled" | "live" | "ended" | "cancelled"
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
      app_role: ["admin", "moderator", "user"],
      download_request_status: ["pending", "approved", "denied"],
      feedback_type: ["inquiry", "feedback", "complaint"],
      media_type: ["video", "audio", "pdf", "text"],
      prayer_session_status: ["scheduled", "active", "ended"],
      recording_status: ["pending", "saved", "discarded"],
      stream_status: ["scheduled", "live", "ended", "cancelled"],
    },
  },
} as const
