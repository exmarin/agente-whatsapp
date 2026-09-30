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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          hl_appointment_id: string | null
          id: string
          meta: Json
          schedule_id: string | null
          scheduled_at: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          hl_appointment_id?: string | null
          id?: string
          meta?: Json
          schedule_id?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          hl_appointment_id?: string | null
          id?: string
          meta?: Json
          schedule_id?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      business_info: {
        Row: {
          free_text: string | null
          id: string
          structured: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          free_text?: string | null
          id?: string
          structured?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          free_text?: string | null
          id?: string
          structured?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_info_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          custom_fields: Json
          email: string | null
          hl_contact_id: string | null
          id: string
          name: string | null
          opt_in: boolean
          opt_in_at: string | null
          owner_id: string | null
          phone: string
          source: string | null
          stage: Database["public"]["Enums"]["contact_stage"]
          tags: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json
          email?: string | null
          hl_contact_id?: string | null
          id?: string
          name?: string | null
          opt_in?: boolean
          opt_in_at?: string | null
          owner_id?: string | null
          phone: string
          source?: string | null
          stage?: Database["public"]["Enums"]["contact_stage"]
          tags?: string[]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json
          email?: string | null
          hl_contact_id?: string | null
          id?: string
          name?: string | null
          opt_in?: boolean
          opt_in_at?: string | null
          owner_id?: string | null
          phone?: string
          source?: string | null
          stage?: Database["public"]["Enums"]["contact_stage"]
          tags?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_enabled: boolean
          assigned_to: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          contact_id: string
          created_at: string
          id: string
          last_message_at: string | null
          state: Database["public"]["Enums"]["conversation_state"]
          unread_count: number
          updated_at: string
          window_expires_at: string | null
          workspace_id: string
        }
        Insert: {
          ai_enabled?: boolean
          assigned_to?: string | null
          channel?: Database["public"]["Enums"]["conversation_channel"]
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          state?: Database["public"]["Enums"]["conversation_state"]
          unread_count?: number
          updated_at?: string
          window_expires_at?: string | null
          workspace_id: string
        }
        Update: {
          ai_enabled?: boolean
          assigned_to?: string | null
          channel?: Database["public"]["Enums"]["conversation_channel"]
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          state?: Database["public"]["Enums"]["conversation_state"]
          unread_count?: number
          updated_at?: string
          window_expires_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          level: string
          payload: Json
          type: string
          workspace_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          level?: string
          payload?: Json
          type: string
          workspace_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          level?: string
          payload?: Json
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          credentials: Json
          enabled: boolean
          id: string
          oauth_tokens: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          credentials?: Json
          enabled?: boolean
          id?: string
          oauth_tokens?: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          credentials?: Json
          enabled?: boolean
          id?: string
          oauth_tokens?: Json
          provider?: Database["public"]["Enums"]["integration_provider"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          meta: Json
          workspace_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          meta?: Json
          workspace_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          meta?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_chunks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_documents: {
        Row: {
          content: string | null
          created_at: string
          id: string
          meta: Json
          source_type: string
          source_url: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          meta?: Json
          source_type?: string
          source_url?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          meta?: Json
          source_type?: string
          source_url?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_batches: {
        Row: {
          conversation_id: string
          created_at: string
          flush_at: string | null
          id: string
          merged_text: string | null
          message_count: number
          meta: Json
          silence_ms: number
          status: Database["public"]["Enums"]["batch_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          flush_at?: string | null
          id?: string
          merged_text?: string | null
          message_count?: number
          meta?: Json
          silence_ms?: number
          status?: Database["public"]["Enums"]["batch_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          flush_at?: string | null
          id?: string
          merged_text?: string | null
          message_count?: number
          meta?: Json
          silence_ms?: number
          status?: Database["public"]["Enums"]["batch_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_batches_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_batches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          batch_id: string | null
          body: string | null
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          error_message: string | null
          id: string
          media: Json | null
          meta: Json
          sender_user_id: string | null
          status: Database["public"]["Enums"]["message_status"] | null
          template_id: string | null
          type: Database["public"]["Enums"]["message_type"]
          wamid: string | null
          workspace_id: string
        }
        Insert: {
          batch_id?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          error_message?: string | null
          id?: string
          media?: Json | null
          meta?: Json
          sender_user_id?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          template_id?: string | null
          type?: Database["public"]["Enums"]["message_type"]
          wamid?: string | null
          workspace_id: string
        }
        Update: {
          batch_id?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          error_message?: string | null
          id?: string
          media?: Json | null
          meta?: Json
          sender_user_id?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          template_id?: string | null
          type?: Database["public"]["Enums"]["message_type"]
          wamid?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_template"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "message_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          capability: string
          created_at: string
          granted: boolean
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          capability: string
          created_at?: string
          granted?: boolean
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          capability?: string
          created_at?: string
          granted?: boolean
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_versions: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          guardrails: Json
          id: string
          model_overrides: Json
          prompt_id: string
          published_at: string | null
          state: Database["public"]["Enums"]["prompt_version_state"]
          variables: Json
          version: number
          workspace_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          guardrails?: Json
          id?: string
          model_overrides?: Json
          prompt_id: string
          published_at?: string | null
          state?: Database["public"]["Enums"]["prompt_version_state"]
          variables?: Json
          version: number
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          guardrails?: Json
          id?: string
          model_overrides?: Json
          prompt_id?: string
          published_at?: string | null
          state?: Database["public"]["Enums"]["prompt_version_state"]
          variables?: Json
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_versions_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          active_version_id: string | null
          created_at: string
          id: string
          name: string
          scope: Database["public"]["Enums"]["prompt_scope"]
          scope_ref: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active_version_id?: string | null
          created_at?: string
          id?: string
          name: string
          scope: Database["public"]["Enums"]["prompt_scope"]
          scope_ref?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active_version_id?: string | null
          created_at?: string
          id?: string
          name?: string
          scope?: Database["public"]["Enums"]["prompt_scope"]
          scope_ref?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_prompts_active_version"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          mode: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          mode?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          mode?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      setter_configs: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          knockout_rules: Json
          name: string
          post_action: Json
          questions: Json
          scoring: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          knockout_rules?: Json
          name: string
          post_action?: Json
          questions?: Json
          scoring?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          knockout_rules?: Json
          name?: string
          post_action?: Json
          questions?: Json
          scoring?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setter_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          body_template: string
          category: string
          components: Json
          created_at: string
          id: string
          language: string
          name: string
          provider_template_id: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
          variables: Json
          workspace_id: string
        }
        Insert: {
          body_template: string
          category: string
          components?: Json
          created_at?: string
          id?: string
          language?: string
          name: string
          provider_template_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          variables?: Json
          workspace_id: string
        }
        Update: {
          body_template?: string
          category?: string
          components?: Json
          created_at?: string
          id?: string
          language?: string
          name?: string
          provider_template_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          variables?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_configs: {
        Row: {
          config: Json
          created_at: string
          credentials: Json
          enabled: boolean
          id: string
          require_confirmation: boolean
          tool_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          credentials?: Json
          enabled?: boolean
          id?: string
          require_confirmation?: boolean
          tool_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          credentials?: Json
          enabled?: boolean
          id?: string
          require_confirmation?: boolean
          tool_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_configs_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          schema: Json
          sensitivity: Database["public"]["Enums"]["tool_sensitivity"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          schema?: Json
          sensitivity?: Database["public"]["Enums"]["tool_sensitivity"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          schema?: Json
          sensitivity?: Database["public"]["Enums"]["tool_sensitivity"]
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_has_role: {
        Args: {
          p_roles: Database["public"]["Enums"]["workspace_role"][]
          p_workspace: string
        }
        Returns: boolean
      }
      auth_workspace_ids: { Args: never; Returns: string[] }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      batch_status: "buffering" | "flushed" | "processed" | "cancelled"
      contact_stage: "new" | "engaged" | "qualified" | "customer" | "lost"
      conversation_channel: "whatsapp"
      conversation_state:
        | "ai_active"
        | "human_active"
        | "handoff_pending"
        | "waiting_reply"
        | "paused"
        | "closed"
      integration_provider: "highlevel" | "openrouter" | "ycloud" | "caldotcom" | "meta"
      message_direction: "in" | "out"
      message_status: "queued" | "sent" | "delivered" | "read" | "failed"
      message_type:
        | "text"
        | "audio"
        | "image"
        | "document"
        | "video"
        | "sticker"
        | "location"
        | "template"
        | "system"
      prompt_scope: "global" | "number" | "campaign" | "segment" | "mode"
      prompt_version_state: "draft" | "published"
      template_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "paused"
      tool_sensitivity: "read" | "write" | "sensitive"
      workspace_role: "admin" | "manager" | "agent" | "viewer"
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
      batch_status: ["buffering", "flushed", "processed", "cancelled"],
      contact_stage: ["new", "engaged", "qualified", "customer", "lost"],
      conversation_channel: ["whatsapp"],
      conversation_state: [
        "ai_active",
        "human_active",
        "handoff_pending",
        "waiting_reply",
        "paused",
        "closed",
      ],
      integration_provider: ["highlevel", "openrouter", "ycloud", "caldotcom", "meta"],
      message_direction: ["in", "out"],
      message_status: ["queued", "sent", "delivered", "read", "failed"],
      message_type: [
        "text",
        "audio",
        "image",
        "document",
        "video",
        "sticker",
        "location",
        "template",
        "system",
      ],
      prompt_scope: ["global", "number", "campaign", "segment", "mode"],
      prompt_version_state: ["draft", "published"],
      template_status: ["draft", "submitted", "approved", "rejected", "paused"],
      tool_sensitivity: ["read", "write", "sensitive"],
      workspace_role: ["admin", "manager", "agent", "viewer"],
    },
  },
} as const
