export type Database = {
  public: {
    Tables: {
      live_streams: {
        Row: {
          id: string
          title: string
          description: string | null
          status: Database["public"]["Enums"]["stream_status"]
          stream_key: string | null
          external_stream_url: string | null
          scheduled_at: string | null
          started_at: string | null
          ended_at: string | null
          recording_url: string | null
          recording_status: Database["public"]["Enums"]["recording_status"]
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: Database["public"]["Enums"]["stream_status"]
          stream_key?: string | null
          external_stream_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          ended_at?: string | null
          recording_url?: string | null
          recording_status?: Database["public"]["Enums"]["recording_status"]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: Database["public"]["Enums"]["stream_status"]
          stream_key?: string | null
          external_stream_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          ended_at?: string | null
          recording_url?: string | null
          recording_status?: Database["public"]["Enums"]["recording_status"]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      live_viewers: {
        Row: {
          id: string
          stream_id: string
          user_id: string | null
          anon_id: string | null
          joined_at: string
          left_at: string | null
        }
        Insert: {
          id?: string
          stream_id: string
          user_id?: string | null
          anon_id?: string | null
          joined_at?: string
          left_at?: string | null
        }
        Update: {
          id?: string
          stream_id?: string
          user_id?: string | null
          anon_id?: string | null
          joined_at?: string
          left_at?: string | null
        }
      }
      prayer_sessions: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'scheduled' | 'active' | 'ended'
          scheduled_at: string | null
          started_at: string | null
          ended_at: string | null
          max_participants: number
          created_by: string | null
          created_at: string
          updated_at: string
          requires_permission: boolean
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'scheduled' | 'active' | 'ended'
          scheduled_at?: string | null
          started_at?: string | null
          ended_at?: string | null
          max_participants?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          requires_permission?: boolean
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: 'scheduled' | 'active' | 'ended'
          scheduled_at?: string | null
          started_at?: string | null
          ended_at?: string | null
          max_participants?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          requires_permission?: boolean
        }
      }
      prayer_join_requests: {
        Row: {
          id: string
          session_id: string
          user_id: string
          status: 'pending' | 'approved' | 'denied'
          requested_at: string
          responded_at: string | null
          responded_by: string | null
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          status?: 'pending' | 'approved' | 'denied'
          requested_at?: string
          responded_at?: string | null
          responded_by?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          status?: 'pending' | 'approved' | 'denied'
          requested_at?: string
          responded_at?: string | null
          responded_by?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          phone: string | null
          location: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          email: string
          phone?: string | null
          location?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string
          phone?: string | null
          location?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prayer_requests: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          request_text: string
          doctors_report_url: string | null
          status: Database["public"]["Enums"]["prayer_request_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone?: string | null
          request_text: string
          doctors_report_url?: string | null
          status?: Database["public"]["Enums"]["prayer_request_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string | null
          request_text?: string
          doctors_report_url?: string | null
          status?: Database["public"]["Enums"]["prayer_request_status"]
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: 'admin' | 'moderator' | 'user'
      stream_status: 'scheduled' | 'live' | 'ended' | 'cancelled'
      recording_status: 'pending' | 'saved' | 'discarded'
      prayer_session_status: 'scheduled' | 'active' | 'ended'
      media_type: 'video' | 'audio' | 'pdf' | 'text'
      download_request_status: 'pending' | 'approved' | 'denied'
      feedback_type: 'inquiry' | 'feedback' | 'complaint'
      join_request_status: 'pending' | 'approved' | 'denied'
      prayer_request_status: 'pending' | 'reviewed' | 'prayed_for'
    }
  }
}