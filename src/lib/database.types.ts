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
      product_categories: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          description: string | null;
          color: string | null;
          icon: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          description?: string | null;
          color?: string | null;
          icon?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          description?: string | null;
          color?: string | null;
          icon?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          sku: string;
          name: string;
          description: string | null;
          category_id: string | null;
          barcode: string | null;
          cost_price: number | null;
          selling_price: number;
          tax_rate: number | null;
          min_stock_level: number | null;
          max_stock_level: number | null;
          reorder_point: number | null;
          reorder_quantity: number | null;
          unit_of_measure: string | null;
          supplier_name: string | null;
          supplier_contact: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          sku: string;
          name: string;
          description?: string | null;
          category_id?: string | null;
          barcode?: string | null;
          cost_price?: number | null;
          selling_price: number;
          tax_rate?: number | null;
          min_stock_level?: number | null;
          max_stock_level?: number | null;
          reorder_point?: number | null;
          reorder_quantity?: number | null;
          unit_of_measure?: string | null;
          supplier_name?: string | null;
          supplier_contact?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          sku?: string;
          name?: string;
          description?: string | null;
          category_id?: string | null;
          barcode?: string | null;
          cost_price?: number | null;
          selling_price?: number;
          tax_rate?: number | null;
          min_stock_level?: number | null;
          max_stock_level?: number | null;
          reorder_point?: number | null;
          reorder_quantity?: number | null;
          unit_of_measure?: string | null;
          supplier_name?: string | null;
          supplier_contact?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      sales_receipts: {
        Row: {
          id: string;
          store_id: string;
          location_id: string | null;
          receipt_number: string;
          transaction_date: string;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          payment_method: string;
          payment_status: string;
          customer_name: string | null;
          customer_email: string | null;
          customer_phone: string | null;
          cashier_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          location_id?: string | null;
          receipt_number: string;
          transaction_date: string;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          payment_method?: string;
          payment_status?: string;
          customer_name?: string | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          cashier_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          location_id?: string | null;
          receipt_number?: string;
          transaction_date?: string;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          payment_method?: string;
          payment_status?: string;
          customer_name?: string | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          cashier_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sale_line_items: {
        Row: {
          id: string;
          receipt_id: string;
          product_id: string | null;
          product_name: string;
          product_sku: string | null;
          quantity: number;
          unit_price: number;
          discount_amount: number;
          tax_amount: number;
          total_amount: number;
          cost_price: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          receipt_id: string;
          product_id?: string | null;
          product_name: string;
          product_sku?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          cost_price?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          receipt_id?: string;
          product_id?: string | null;
          product_name?: string;
          product_sku?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          cost_price?: number | null;
          created_at?: string;
        };
      };
      inventory_snapshots: {
        Row: {
          id: string;
          store_id: string;
          location_id: string | null;
          product_id: string;
          quantity: number;
          reserved_quantity: number;
          unit_cost: number | null;
          total_value: number | null;
          snapshot_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          location_id?: string | null;
          product_id: string;
          quantity?: number;
          reserved_quantity?: number;
          unit_cost?: number | null;
          total_value?: number | null;
          snapshot_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          location_id?: string | null;
          product_id?: string;
          quantity?: number;
          reserved_quantity?: number;
          unit_cost?: number | null;
          total_value?: number | null;
          snapshot_date?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      imports: {
        Row: {
          id: string;
          store_id: string;
          import_type: string;
          file_name: string;
          file_size_bytes: number | null;
          file_format: string;
          status: string;
          total_rows: number | null;
          processed_rows: number | null;
          successful_rows: number | null;
          failed_rows: number | null;
          error_log: Json | null;
          mapping_config: Json | null;
          mapping_accuracy: number | null;
          column_mapping_details: Json | null;
          started_at: string | null;
          completed_at: string | null;
          processing_time_ms: number | null;
          initiated_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          import_type: string;
          file_name: string;
          file_size_bytes?: number | null;
          file_format?: string;
          status?: string;
          total_rows?: number | null;
          processed_rows?: number | null;
          successful_rows?: number | null;
          failed_rows?: number | null;
          error_log?: Json | null;
          mapping_config?: Json | null;
          mapping_accuracy?: number | null;
          column_mapping_details?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          processing_time_ms?: number | null;
          initiated_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          import_type?: string;
          file_name?: string;
          file_size_bytes?: number | null;
          file_format?: string;
          status?: string;
          total_rows?: number | null;
          processed_rows?: number | null;
          successful_rows?: number | null;
          failed_rows?: number | null;
          error_log?: Json | null;
          mapping_config?: Json | null;
          mapping_accuracy?: number | null;
          column_mapping_details?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          processing_time_ms?: number | null;
          initiated_by?: string;
          created_at?: string;
        };
      };
      import_row_details: {
        Row: {
          id: string;
          import_id: string;
          row_number: number;
          row_data: Json | null;
          status: string;
          error_message: string | null;
          error_field: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          import_id: string;
          row_number: number;
          row_data?: Json | null;
          status?: string;
          error_message?: string | null;
          error_field?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          import_id?: string;
          row_number?: number;
          row_data?: Json | null;
          status?: string;
          error_message?: string | null;
          error_field?: string | null;
          created_at?: string;
        };
      };
      os_analytics_insights: {
        Row: {
          id: string;
          store_id: string;
          insight_type: string;
          title: string;
          description: string;
          product_id: string | null;
          product_name: string | null;
          metric_value: number;
          metric_unit: string;
          severity: string;
          action_recommended: string | null;
          action_taken: boolean;
          dismissed: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          insight_type: string;
          title: string;
          description: string;
          product_id?: string | null;
          product_name?: string | null;
          metric_value: number;
          metric_unit: string;
          severity: string;
          action_recommended?: string | null;
          action_taken?: boolean;
          dismissed?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          insight_type?: string;
          title?: string;
          description?: string;
          product_id?: string | null;
          product_name?: string | null;
          metric_value?: number;
          metric_unit?: string;
          severity?: string;
          action_recommended?: string | null;
          action_taken?: boolean;
          dismissed?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      os_test_results: {
        Row: {
          id: string;
          test_name: string;
          test_type: string;
          related_feature: string;
          status: string;
          duration_ms: number | null;
          screenshot_url: string | null;
          run_at: string;
        };
        Insert: {
          id?: string;
          test_name: string;
          test_type: string;
          related_feature: string;
          status: string;
          duration_ms?: number | null;
          screenshot_url?: string | null;
          run_at?: string;
        };
        Update: {
          id?: string;
          test_name?: string;
          test_type?: string;
          related_feature?: string;
          status?: string;
          duration_ms?: number | null;
          screenshot_url?: string | null;
          run_at?: string;
        };
      };
      os_agent_activity: {
        Row: {
          id: string;
          agent_name: string;
          action_type: string;
          status: string;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_name: string;
          action_type: string;
          status: string;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_name?: string;
          action_type?: string;
          status?: string;
          duration_ms?: number | null;
          created_at?: string;
        };
      };
      os_decision_queue: {
        Row: {
          id: string;
          title: string;
          description: string;
          priority: string;
          agent_name: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          priority: string;
          agent_name: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          priority?: string;
          agent_name?: string;
          status?: string;
          created_at?: string;
        };
      };
      analytics_daily_summary: {
        Row: {
          id: string;
          store_id: string;
          summary_date: string;
          total_revenue: number | null;
          total_sales: number | null;
          total_items_sold: number | null;
          average_order_value: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          summary_date: string;
          total_revenue?: number | null;
          total_sales?: number | null;
          total_items_sold?: number | null;
          average_order_value?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          summary_date?: string;
          total_revenue?: number | null;
          total_sales?: number | null;
          total_items_sold?: number | null;
          average_order_value?: number | null;
          created_at?: string;
        };
      };
      analytics_category_performance: {
        Row: {
          id: string;
          store_id: string;
          category_id: string | null;
          category_name: string;
          revenue: number | null;
          items_sold: number | null;
          sales_count: number | null;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          category_id?: string | null;
          category_name: string;
          revenue?: number | null;
          items_sold?: number | null;
          sales_count?: number | null;
          period_start: string;
          period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          category_id?: string | null;
          category_name?: string;
          revenue?: number | null;
          items_sold?: number | null;
          sales_count?: number | null;
          period_start?: string;
          period_end?: string;
          created_at?: string;
        };
      };
      analytics_product_performance: {
        Row: {
          id: string;
          store_id: string;
          product_id: string;
          product_name: string;
          revenue: number | null;
          items_sold: number | null;
          sales_count: number | null;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          product_id: string;
          product_name: string;
          revenue?: number | null;
          items_sold?: number | null;
          sales_count?: number | null;
          period_start: string;
          period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          product_id?: string;
          product_name?: string;
          revenue?: number | null;
          items_sold?: number | null;
          sales_count?: number | null;
          period_start?: string;
          period_end?: string;
          created_at?: string;
        };
      };
      analytics_user_preferences: {
        Row: {
          id: string;
          user_id: string;
          store_id: string;
          default_date_range: number | null;
          pinned_metrics: string[] | null;
          hidden_cards: string[] | null;
          email_alerts_enabled: boolean | null;
          alert_threshold_low_stock: number | null;
          alert_threshold_sales_drop: number | null;
          updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id: string;
          default_date_range?: number | null;
          pinned_metrics?: string[] | null;
          hidden_cards?: string[] | null;
          email_alerts_enabled?: boolean | null;
          alert_threshold_low_stock?: number | null;
          alert_threshold_sales_drop?: number | null;
          updated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_id?: string;
          default_date_range?: number | null;
          pinned_metrics?: string[] | null;
          hidden_cards?: string[] | null;
          email_alerts_enabled?: boolean | null;
          alert_threshold_low_stock?: number | null;
          alert_threshold_sales_drop?: number | null;
          updated_at?: string | null;
          created_at?: string;
        };
      };
      analytics_computation_log: {
        Row: {
          id: string;
          store_id: string;
          computed_by: string;
          records_processed: number | null;
          started_at: string;
          completed_at: string | null;
          status: string;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          store_id: string;
          computed_by: string;
          records_processed?: number | null;
          started_at?: string;
          completed_at?: string | null;
          status?: string;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          store_id?: string;
          computed_by?: string;
          records_processed?: number | null;
          started_at?: string;
          completed_at?: string | null;
          status?: string;
          error_message?: string | null;
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
      compute_store_analytics: {
        Args: {
          p_store_id: string;
          p_computed_by: string;
        };
        Returns: Record<string, unknown>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
