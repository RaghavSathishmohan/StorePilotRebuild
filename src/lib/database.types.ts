export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          timezone: string;
          default_store_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          timezone?: string;
          default_store_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          timezone?: string;
          default_store_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stores: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          description: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          description?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_id?: string;
          description?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
      };
      store_locations: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          code: string;
          phone: string | null;
          email: string | null;
          status: 'active' | 'inactive';
          address_line_1: string | null;
          address_line_2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string;
          latitude: number | null;
          longitude: number | null;
          timezone: string;
          hours_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          code: string;
          phone?: string | null;
          email?: string | null;
          status?: 'active' | 'inactive';
          address_line_1?: string | null;
          address_line_2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          timezone?: string;
          hours_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          code?: string;
          phone?: string | null;
          email?: string | null;
          status?: 'active' | 'inactive';
          address_line_1?: string | null;
          address_line_2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          timezone?: string;
          hours_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      store_members: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'manager' | 'staff';
          status: 'active' | 'pending';
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'manager' | 'staff';
          status?: 'active' | 'pending';
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'manager' | 'staff';
          status?: 'active' | 'pending';
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          store_id: string;
          email: string;
          role: 'admin' | 'manager' | 'staff';
          token: string;
          status: 'pending' | 'accepted' | 'expired';
          expires_at: string;
          invited_by: string;
          accepted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          email: string;
          role: 'admin' | 'manager' | 'staff';
          token: string;
          status?: 'pending' | 'accepted' | 'expired';
          expires_at: string;
          invited_by: string;
          accepted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          email?: string;
          role?: 'admin' | 'manager' | 'staff';
          token?: string;
          status?: 'pending' | 'accepted' | 'expired';
          expires_at?: string;
          invited_by?: string;
          accepted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      store_settings: {
        Row: {
          id: string;
          store_id: string;
          currency: string;
          timezone: string;
          date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
          low_stock_threshold: number;
          receipt_footer: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          currency?: string;
          timezone?: string;
          date_format?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
          low_stock_threshold?: number;
          receipt_footer?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          currency?: string;
          timezone?: string;
          date_format?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
          low_stock_threshold?: number;
          receipt_footer?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          store_id: string;
          user_id: string | null;
          entity_type: string;
          entity_id: string;
          action: 'create' | 'update' | 'delete';
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          user_id?: string | null;
          entity_type: string;
          entity_id: string;
          action: 'create' | 'update' | 'delete';
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          user_id?: string | null;
          entity_type?: string;
          entity_id?: string;
          action?: 'create' | 'update' | 'delete';
          metadata?: Json;
          created_at?: string;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          theme: 'light' | 'dark' | 'system';
          sidebar_collapsed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: 'light' | 'dark' | 'system';
          sidebar_collapsed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: 'light' | 'dark' | 'system';
          sidebar_collapsed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_store_member: {
        Args: {
          p_store_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      has_store_role: {
        Args: {
          p_store_id: string;
          p_user_id: string;
          p_required_role: string;
        };
        Returns: boolean;
      };
      is_store_owner: {
        Args: {
          p_store_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
