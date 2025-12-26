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
      chat_actions_log: {
        Row: {
          action_type: string
          conversation_id: string | null
          created_at: string | null
          id: string
          payload: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_actions_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flashcard_decks: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          discipline_id: string | null
          emoji: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          discipline_id?: string | null
          emoji?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          discipline_id?: string | null
          emoji?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flashcard_reviews: {
        Row: {
          flashcard_id: string
          id: string
          rating: string
          response_time_ms: number | null
          reviewed_at: string | null
          user_id: string
        }
        Insert: {
          flashcard_id: string
          id?: string
          rating: string
          response_time_ms?: number | null
          reviewed_at?: string | null
          user_id: string
        }
        Update: {
          flashcard_id?: string
          id?: string
          rating?: string
          response_time_ms?: number | null
          reviewed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_sessions: {
        Row: {
          cards_correct: number | null
          cards_reviewed: number | null
          completed_at: string | null
          deck_id: string | null
          id: string
          rating_distribution: Json | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          cards_correct?: number | null
          cards_reviewed?: number | null
          completed_at?: string | null
          deck_id?: string | null
          id?: string
          rating_distribution?: Json | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          cards_correct?: number | null
          cards_reviewed?: number | null
          completed_at?: string | null
          deck_id?: string | null
          id?: string
          rating_distribution?: Json | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_sessions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string | null
          deck_id: string
          ease_factor: number | null
          front: string
          id: string
          interval_days: number | null
          next_review: string | null
          repetitions: number | null
          source_notebook_id: string | null
          source_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string | null
          deck_id: string
          ease_factor?: number | null
          front: string
          id?: string
          interval_days?: number | null
          next_review?: string | null
          repetitions?: number | null
          source_notebook_id?: string | null
          source_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string | null
          deck_id?: string
          ease_factor?: number | null
          front?: string
          id?: string
          interval_days?: number | null
          next_review?: string | null
          repetitions?: number | null
          source_notebook_id?: string | null
          source_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          proposal: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          proposal?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          proposal?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          position: number | null
          task_id: string
          text: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          position?: number | null
          task_id: string
          text: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          position?: number | null
          task_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          position: number | null
          task_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          position?: number | null
          task_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          position?: number | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_blocks: {
        Row: {
          content: Json
          created_at: string
          id: string
          position: number | null
          task_id: string
          type: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          position?: number | null
          task_id: string
          type: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          position?: number | null
          task_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_blocks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          canva_design_title: string | null
          canva_design_url: string | null
          canva_last_opened: string | null
          canva_time_spent: number | null
          category: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          device_id: string
          due_date: string | null
          due_time: string | null
          duration_minutes: number | null
          end_time: string | null
          focus_subject: string | null
          id: string
          is_canva_task: boolean | null
          priority: string | null
          source_type: string | null
          start_time: string | null
          text: string
          timer_paused_at: string | null
          timer_remaining_seconds: number | null
          timer_started_at: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          canva_design_title?: string | null
          canva_design_url?: string | null
          canva_last_opened?: string | null
          canva_time_spent?: number | null
          category?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          device_id: string
          due_date?: string | null
          due_time?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          focus_subject?: string | null
          id?: string
          is_canva_task?: boolean | null
          priority?: string | null
          source_type?: string | null
          start_time?: string | null
          text: string
          timer_paused_at?: string | null
          timer_remaining_seconds?: number | null
          timer_started_at?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          canva_design_title?: string | null
          canva_design_url?: string | null
          canva_last_opened?: string | null
          canva_time_spent?: number | null
          category?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          device_id?: string
          due_date?: string | null
          due_time?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          focus_subject?: string | null
          id?: string
          is_canva_task?: boolean | null
          priority?: string | null
          source_type?: string | null
          start_time?: string | null
          text?: string
          timer_paused_at?: string | null
          timer_remaining_seconds?: number | null
          timer_started_at?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
