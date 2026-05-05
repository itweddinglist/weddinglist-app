export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      app_users: {
        Row: {
          active_wedding_id: string | null
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          active_wedding_id?: string | null
          created_at?: string
          email: string
          id?: string
          updated_at?: string
        }
        Update: {
          active_wedding_id?: string | null
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_active_wedding_id_fkey"
            columns: ["active_wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_active_wedding_id_fkey"
            columns: ["active_wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_type: string
          app_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          request_id: string | null
          wedding_id: string | null
        }
        Insert: {
          action: string
          actor_type: string
          app_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          request_id?: string | null
          wedding_id?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          app_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          request_id?: string | null
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          actual_amount: number | null
          category: string | null
          created_at: string
          currency: string
          due_date: string | null
          estimated_amount: number
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          actual_amount?: number | null
          category?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          estimated_amount?: number
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          actual_amount?: number | null
          category?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          estimated_amount?: number
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      data_migrations: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          last_error: string | null
          migration_key: string
          status: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          last_error?: string | null
          migration_key: string
          status?: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          last_error?: string | null
          migration_key?: string
          status?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_migrations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_migrations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          is_rsvp_enabled: boolean
          is_seating_enabled: boolean
          location_name: string | null
          name: string
          sort_order: number
          starts_at: string | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          is_rsvp_enabled?: boolean
          is_seating_enabled?: boolean
          location_name?: string | null
          name: string
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          is_rsvp_enabled?: boolean
          is_seating_enabled?: boolean
          location_name?: string | null
          name?: string
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_events: {
        Row: {
          attendance_status: string
          created_at: string
          event_id: string
          guest_id: string
          id: string
          meal_choice: string | null
          plus_one_label: string | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          attendance_status?: string
          created_at?: string
          event_id: string
          guest_id: string
          id?: string
          meal_choice?: string | null
          plus_one_label?: string | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          attendance_status?: string
          created_at?: string
          event_id?: string
          guest_id?: string
          id?: string
          meal_choice?: string | null
          plus_one_label?: string | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_events_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_events_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_groups: {
        Row: {
          created_at: string
          group_type: string | null
          id: string
          name: string
          notes: string | null
          sort_order: number
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          group_type?: string | null
          id?: string
          name: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          group_type?: string | null
          id?: string
          name?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_groups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_groups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string
          display_name: string
          first_name: string
          guest_group_id: string | null
          id: string
          is_vip: boolean
          last_name: string | null
          notes: string | null
          side: string | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          first_name: string
          guest_group_id?: string | null
          id?: string
          is_vip?: boolean
          last_name?: string | null
          notes?: string | null
          side?: string | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          first_name?: string
          guest_group_id?: string | null
          id?: string
          is_vip?: boolean
          last_name?: string | null
          notes?: string | null
          side?: string | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_guest_group_id_fkey"
            columns: ["guest_group_id"]
            isOneToOne: false
            referencedRelation: "guest_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          app_user_id: string
          client_operation_id: string
          created_at: string | null
          id: string
          request_hash: string
          response: Json
          rpc_name: string
          wedding_id: string
        }
        Insert: {
          app_user_id: string
          client_operation_id: string
          created_at?: string | null
          id?: string
          request_hash: string
          response: Json
          rpc_name: string
          wedding_id: string
        }
        Update: {
          app_user_id?: string
          client_operation_id?: string
          created_at?: string | null
          id?: string
          request_hash?: string
          response?: Json
          rpc_name?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idempotency_keys_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idempotency_keys_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_links: {
        Row: {
          app_user_id: string
          created_at: string
          external_user_id: string
          id: string
          provider: string
        }
        Insert: {
          app_user_id: string
          created_at?: string
          external_user_id: string
          id?: string
          provider: string
        }
        Update: {
          app_user_id?: string
          created_at?: string
          external_user_id?: string
          id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_links_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          budget_item_id: string
          created_at: string
          currency: string
          id: string
          note: string | null
          paid_at: string | null
          payment_method: string | null
          wedding_id: string
        }
        Insert: {
          amount: number
          budget_item_id: string
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_method?: string | null
          wedding_id: string
        }
        Update: {
          amount?: number
          budget_item_id?: string
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_method?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_invitations: {
        Row: {
          created_at: string
          delivery_channel:
            | Database["public"]["Enums"]["rsvp_delivery_channel"]
            | null
          delivery_status: Database["public"]["Enums"]["rsvp_delivery_status"]
          event_id: string
          guest_id: string | null
          id: string
          is_active: boolean
          last_sent_at: string | null
          max_guests: number | null
          opened_at: string | null
          public_link_id: string
          responded_at: string | null
          sent_at: string | null
          status: string
          token_hash: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          delivery_channel?:
            | Database["public"]["Enums"]["rsvp_delivery_channel"]
            | null
          delivery_status?: Database["public"]["Enums"]["rsvp_delivery_status"]
          event_id: string
          guest_id?: string | null
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          max_guests?: number | null
          opened_at?: string | null
          public_link_id: string
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          token_hash: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          delivery_channel?:
            | Database["public"]["Enums"]["rsvp_delivery_channel"]
            | null
          delivery_status?: Database["public"]["Enums"]["rsvp_delivery_status"]
          event_id?: string
          guest_id?: string | null
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          max_guests?: number | null
          opened_at?: string | null
          public_link_id?: string
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          token_hash?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_invitations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_invitations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_invitations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_responses: {
        Row: {
          dietary_notes: string | null
          event_id: string
          guest_event_id: string
          id: string
          invitation_id: string
          meal_choice: Database["public"]["Enums"]["rsvp_meal_choice"] | null
          note: string | null
          responded_at: string
          rsvp_source: Database["public"]["Enums"]["rsvp_response_source"]
          status: Database["public"]["Enums"]["rsvp_attendance_status"]
          used_at: string | null
          wedding_id: string
        }
        Insert: {
          dietary_notes?: string | null
          event_id: string
          guest_event_id: string
          id?: string
          invitation_id: string
          meal_choice?: Database["public"]["Enums"]["rsvp_meal_choice"] | null
          note?: string | null
          responded_at?: string
          rsvp_source?: Database["public"]["Enums"]["rsvp_response_source"]
          status: Database["public"]["Enums"]["rsvp_attendance_status"]
          used_at?: string | null
          wedding_id: string
        }
        Update: {
          dietary_notes?: string | null
          event_id?: string
          guest_event_id?: string
          id?: string
          invitation_id?: string
          meal_choice?: Database["public"]["Enums"]["rsvp_meal_choice"] | null
          note?: string | null
          responded_at?: string
          rsvp_source?: Database["public"]["Enums"]["rsvp_response_source"]
          status?: Database["public"]["Enums"]["rsvp_attendance_status"]
          used_at?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_responses_guest_event_id_fkey"
            columns: ["guest_event_id"]
            isOneToOne: true
            referencedRelation: "guest_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_responses_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "rsvp_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_responses_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_responses_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_assignments: {
        Row: {
          assigned_at: string
          created_at: string
          event_id: string
          guest_event_id: string
          id: string
          seat_id: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          event_id: string
          guest_event_id: string
          id?: string
          seat_id: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          event_id?: string
          guest_event_id?: string
          id?: string
          seat_id?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_guest_event_id_fkey"
            columns: ["guest_event_id"]
            isOneToOne: true
            referencedRelation: "guest_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: true
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_audit_logs: {
        Row: {
          action: string
          app_user_id: string
          assignments_count: number | null
          created_at: string
          diff: Json | null
          event_id: string
          id: string
          log_tier: string
          new_assignments: Json | null
          old_assignments: Json | null
          request_id: string | null
          version_from: number | null
          version_to: number | null
          wedding_id: string
        }
        Insert: {
          action: string
          app_user_id: string
          assignments_count?: number | null
          created_at?: string
          diff?: Json | null
          event_id: string
          id?: string
          log_tier?: string
          new_assignments?: Json | null
          old_assignments?: Json | null
          request_id?: string | null
          version_from?: number | null
          version_to?: number | null
          wedding_id: string
        }
        Update: {
          action?: string
          app_user_id?: string
          assignments_count?: number | null
          created_at?: string
          diff?: Json | null
          event_id?: string
          id?: string
          log_tier?: string
          new_assignments?: Json | null
          old_assignments?: Json | null
          request_id?: string | null
          version_from?: number | null
          version_to?: number | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_audit_logs_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_audit_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_audit_logs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_audit_logs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_editor_states: {
        Row: {
          event_id: string | null
          id: string
          revision: number
          state: Json
          updated_at: string
          wedding_id: string
        }
        Insert: {
          event_id?: string | null
          id?: string
          revision?: number
          state?: Json
          updated_at?: string
          wedding_id: string
        }
        Update: {
          event_id?: string | null
          id?: string
          revision?: number
          state?: Json
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_editor_states_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_editor_states_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_editor_states_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_id_counters: {
        Row: {
          current_val: number
          entity_type: string
          event_id: string
          wedding_id: string
        }
        Insert: {
          current_val?: number
          entity_type: string
          event_id: string
          wedding_id: string
        }
        Update: {
          current_val?: number
          entity_type?: string
          event_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_id_counters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_id_counters_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_id_counters_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_id_maps: {
        Row: {
          created_at: string
          entity_type: string
          entity_uuid: string
          event_id: string
          id: string
          numeric_id: number
          wedding_id: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          entity_uuid: string
          event_id: string
          id?: string
          numeric_id: number
          wedding_id: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          entity_uuid?: string
          event_id?: string
          id?: string
          numeric_id?: number
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_id_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_id_maps_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_id_maps_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          created_at: string
          event_id: string
          id: string
          label: string | null
          seat_index: number
          table_id: string
          wedding_id: string
          x_offset: number | null
          y_offset: number | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          label?: string | null
          seat_index: number
          table_id: string
          wedding_id: string
          x_offset?: number | null
          y_offset?: number | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          label?: string | null
          seat_index?: number
          table_id?: string
          wedding_id?: string
          x_offset?: number | null
          y_offset?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string
          deleted_at: string | null
          event_id: string
          id: string
          name: string
          rotation: number
          seat_count: number
          shape_config: Json | null
          sort_order: number
          table_type: string
          updated_at: string
          wedding_id: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          event_id: string
          id?: string
          name: string
          rotation?: number
          seat_count: number
          shape_config?: Json | null
          sort_order?: number
          table_type: string
          updated_at?: string
          wedding_id: string
          x: number
          y: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          event_id?: string
          id?: string
          name?: string
          rotation?: number
          seat_count?: number
          shape_config?: Json | null
          sort_order?: number
          table_type?: string
          updated_at?: string
          wedding_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "tables_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          external_vendor_id: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string
          status: string
          updated_at: string
          website: string | null
          wedding_id: string
        }
        Insert: {
          category?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          external_vendor_id?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string
          status?: string
          updated_at?: string
          website?: string | null
          wedding_id: string
        }
        Update: {
          category?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          external_vendor_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string
          status?: string
          updated_at?: string
          website?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_members: {
        Row: {
          app_user_id: string
          created_at: string
          id: string
          role: string
          wedding_id: string
        }
        Insert: {
          app_user_id: string
          created_at?: string
          id?: string
          role: string
          wedding_id: string
        }
        Update: {
          app_user_id?: string
          created_at?: string
          id?: string
          role?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_members_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_members_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "active_weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_members_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      weddings: {
        Row: {
          created_at: string
          deleted_at: string | null
          event_date: string | null
          id: string
          owner_user_id: string
          plan_tier: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          event_date?: string | null
          id?: string
          owner_user_id: string
          plan_tier?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          event_date?: string | null
          id?: string
          owner_user_id?: string
          plan_tier?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weddings_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_weddings: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          event_date: string | null
          id: string | null
          owner_user_id: string | null
          plan_tier: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          event_date?: string | null
          id?: string | null
          owner_user_id?: string | null
          plan_tier?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          event_date?: string | null
          id?: string | null
          owner_user_id?: string | null
          plan_tier?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weddings_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      allocate_seating_numeric_ids_batch:
        | {
            Args: {
              p_entity_type: string
              p_entity_uuids: string[]
              p_event_id: string
              p_wedding_id: string
            }
            Returns: {
              entity_uuid: string
              numeric_id: number
            }[]
          }
        | {
            Args: {
              p_caller_uid: string
              p_entity_type: string
              p_entity_uuids: string[]
              p_event_id: string
              p_wedding_id: string
            }
            Returns: {
              entity_uuid: string
              numeric_id: number
            }[]
          }
      auth_user_id: { Args: never; Returns: string }
      is_wedding_member: { Args: { _wedding_id: string }; Returns: boolean }
      is_wedding_owner: { Args: { _wedding_id: string }; Returns: boolean }
      soft_delete_wedding: {
        Args: { p_wedding_id: string }
        Returns: undefined
      }
      sync_seating_editor_state: {
        Args: {
          p_assignments: Json
          p_caller_uid: string
          p_event_id: string
          p_force?: boolean
          p_request_id?: string
          p_tables: Json
          p_version?: number
          p_wedding_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      rsvp_attendance_status: "pending" | "accepted" | "declined" | "maybe"
      rsvp_delivery_channel:
        | "whatsapp"
        | "email"
        | "sms"
        | "facebook"
        | "qr"
        | "link"
        | "manual"
      rsvp_delivery_status: "draft" | "ready" | "sent" | "failed" | "revoked"
      rsvp_meal_choice: "standard" | "vegetarian"
      rsvp_response_source: "guest_link" | "couple_manual" | "import"
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
      rsvp_attendance_status: ["pending", "accepted", "declined", "maybe"],
      rsvp_delivery_channel: [
        "whatsapp",
        "email",
        "sms",
        "facebook",
        "qr",
        "link",
        "manual",
      ],
      rsvp_delivery_status: ["draft", "ready", "sent", "failed", "revoked"],
      rsvp_meal_choice: ["standard", "vegetarian"],
      rsvp_response_source: ["guest_link", "couple_manual", "import"],
    },
  },
} as const
