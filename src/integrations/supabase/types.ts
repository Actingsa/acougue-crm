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
      cash_sessions: {
        Row: {
          closed_at: string | null
          closing_cents: number | null
          company_id: string
          id: string
          opened_at: string
          opened_by: string
          opening_cents: number
          status: Database["public"]["Enums"]["cash_status"]
          terminal: string
        }
        Insert: {
          closed_at?: string | null
          closing_cents?: number | null
          company_id: string
          id?: string
          opened_at?: string
          opened_by: string
          opening_cents?: number
          status?: Database["public"]["Enums"]["cash_status"]
          terminal?: string
        }
        Update: {
          closed_at?: string | null
          closing_cents?: number | null
          company_id?: string
          id?: string
          opened_at?: string
          opened_by?: string
          opening_cents?: number
          status?: Database["public"]["Enums"]["cash_status"]
          terminal?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          cnpj: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          ie: string | null
          im: string | null
          legal_name: string | null
          license_expires_at: string | null
          license_notes: string | null
          license_seats: number
          license_status: Database["public"]["Enums"]["license_status"]
          logo_url: string | null
          name: string
          phone: string | null
          plan: Database["public"]["Enums"]["company_plan"]
          report_footer: string | null
          slug: string
          tax_regime: string | null
          trade_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnpj?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          legal_name?: string | null
          license_expires_at?: string | null
          license_notes?: string | null
          license_seats?: number
          license_status?: Database["public"]["Enums"]["license_status"]
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["company_plan"]
          report_footer?: string | null
          slug: string
          tax_regime?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          legal_name?: string | null
          license_expires_at?: string | null
          license_notes?: string | null
          license_seats?: number
          license_status?: Database["public"]["Enums"]["license_status"]
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["company_plan"]
          report_footer?: string | null
          slug?: string
          tax_regime?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          company_id: string
          created_at: string
          credit_limit_cents: number
          doc: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          company_id: string
          created_at?: string
          credit_limit_cents?: number
          doc?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          company_id?: string
          created_at?: string
          credit_limit_cents?: number
          doc?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deboning_outputs: {
        Row: {
          company_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["deboning_output_kind"]
          name_snapshot: string
          product_id: string | null
          qty_expected: number | null
          qty_real: number
          session_id: string
          unit: Database["public"]["Enums"]["product_unit"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["deboning_output_kind"]
          name_snapshot: string
          product_id?: string | null
          qty_expected?: number | null
          qty_real?: number
          session_id: string
          unit?: Database["public"]["Enums"]["product_unit"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["deboning_output_kind"]
          name_snapshot?: string
          product_id?: string | null
          qty_expected?: number | null
          qty_real?: number
          session_id?: string
          unit?: Database["public"]["Enums"]["product_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "deboning_outputs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "deboning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      deboning_sessions: {
        Row: {
          carcass_name: string
          carcass_product_id: string | null
          carcass_qty: number
          carcass_unit: Database["public"]["Enums"]["product_unit"]
          company_id: string
          created_at: string
          created_by: string
          expected_yield_pct: number | null
          id: string
          notes: string | null
          output_bone_qty: number
          output_cut_qty: number
          output_fat_qty: number
          output_loss_qty: number
          real_yield_pct: number
          updated_at: string
        }
        Insert: {
          carcass_name: string
          carcass_product_id?: string | null
          carcass_qty: number
          carcass_unit?: Database["public"]["Enums"]["product_unit"]
          company_id: string
          created_at?: string
          created_by: string
          expected_yield_pct?: number | null
          id?: string
          notes?: string | null
          output_bone_qty?: number
          output_cut_qty?: number
          output_fat_qty?: number
          output_loss_qty?: number
          real_yield_pct?: number
          updated_at?: string
        }
        Update: {
          carcass_name?: string
          carcass_product_id?: string | null
          carcass_qty?: number
          carcass_unit?: Database["public"]["Enums"]["product_unit"]
          company_id?: string
          created_at?: string
          created_by?: string
          expected_yield_pct?: number | null
          id?: string
          notes?: string | null
          output_bone_qty?: number
          output_cut_qty?: number
          output_fat_qty?: number
          output_loss_qty?: number
          real_yield_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      hardware_settings: {
        Row: {
          barcode_enabled: boolean
          barcode_max_length: number
          barcode_min_length: number
          barcode_mode: string
          barcode_prefix: string
          barcode_serial_baud: number | null
          barcode_serial_port: string | null
          barcode_suffix: string
          barcode_weight_pattern: string | null
          company_id: string
          created_at: string
          id: string
          nfce_csc_id: string | null
          nfce_csc_token: string | null
          nfce_enabled: boolean
          nfce_environment: string | null
          printer_auto_cut: boolean
          printer_brand: string
          printer_cash_drawer: boolean
          printer_connection: string
          printer_copies: number
          printer_enabled: boolean
          printer_footer: string | null
          printer_header: string | null
          printer_ip: string | null
          printer_model: string | null
          printer_paper_width: number
          printer_port: number | null
          printer_serial_baud: number | null
          printer_serial_port: string | null
          sat_activation_code: string | null
          sat_cnpj: string | null
          sat_enabled: boolean
          updated_at: string
        }
        Insert: {
          barcode_enabled?: boolean
          barcode_max_length?: number
          barcode_min_length?: number
          barcode_mode?: string
          barcode_prefix?: string
          barcode_serial_baud?: number | null
          barcode_serial_port?: string | null
          barcode_suffix?: string
          barcode_weight_pattern?: string | null
          company_id: string
          created_at?: string
          id?: string
          nfce_csc_id?: string | null
          nfce_csc_token?: string | null
          nfce_enabled?: boolean
          nfce_environment?: string | null
          printer_auto_cut?: boolean
          printer_brand?: string
          printer_cash_drawer?: boolean
          printer_connection?: string
          printer_copies?: number
          printer_enabled?: boolean
          printer_footer?: string | null
          printer_header?: string | null
          printer_ip?: string | null
          printer_model?: string | null
          printer_paper_width?: number
          printer_port?: number | null
          printer_serial_baud?: number | null
          printer_serial_port?: string | null
          sat_activation_code?: string | null
          sat_cnpj?: string | null
          sat_enabled?: boolean
          updated_at?: string
        }
        Update: {
          barcode_enabled?: boolean
          barcode_max_length?: number
          barcode_min_length?: number
          barcode_mode?: string
          barcode_prefix?: string
          barcode_serial_baud?: number | null
          barcode_serial_port?: string | null
          barcode_suffix?: string
          barcode_weight_pattern?: string | null
          company_id?: string
          created_at?: string
          id?: string
          nfce_csc_id?: string | null
          nfce_csc_token?: string | null
          nfce_enabled?: boolean
          nfce_environment?: string | null
          printer_auto_cut?: boolean
          printer_brand?: string
          printer_cash_drawer?: boolean
          printer_connection?: string
          printer_copies?: number
          printer_enabled?: boolean
          printer_footer?: string | null
          printer_header?: string | null
          printer_ip?: string | null
          printer_model?: string | null
          printer_paper_width?: number
          printer_port?: number | null
          printer_serial_baud?: number | null
          printer_serial_port?: string | null
          sat_activation_code?: string | null
          sat_cnpj?: string | null
          sat_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          user_id?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          barcode: string | null
          category: string | null
          company_id: string
          cost_cents: number
          created_at: string
          id: string
          image_url: string | null
          is_weighable: boolean
          min_stock: number
          name: string
          package_grams: number | null
          plu_code: string | null
          price_cents: number
          scale_prefix: string | null
          sku: string | null
          stock_qty: number
          tare_grams: number
          unit: Database["public"]["Enums"]["product_unit"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          barcode?: string | null
          category?: string | null
          company_id: string
          cost_cents?: number
          created_at?: string
          id?: string
          image_url?: string | null
          is_weighable?: boolean
          min_stock?: number
          name: string
          package_grams?: number | null
          plu_code?: string | null
          price_cents?: number
          scale_prefix?: string | null
          sku?: string | null
          stock_qty?: number
          tare_grams?: number
          unit?: Database["public"]["Enums"]["product_unit"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          barcode?: string | null
          category?: string | null
          company_id?: string
          cost_cents?: number
          created_at?: string
          id?: string
          image_url?: string | null
          is_weighable?: boolean
          min_stock?: number
          name?: string
          package_grams?: number | null
          plu_code?: string | null
          price_cents?: number
          scale_prefix?: string | null
          sku?: string | null
          stock_qty?: number
          tare_grams?: number
          unit?: Database["public"]["Enums"]["product_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_company_id: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_company_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_company_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_company_id_fkey"
            columns: ["current_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoice_items: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          invoice_id: string
          lot: string | null
          name_snapshot: string
          product_id: string | null
          qty: number
          total_cents: number
          unit: Database["public"]["Enums"]["product_unit"]
          unit_cost_cents: number
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invoice_id: string
          lot?: string | null
          name_snapshot: string
          product_id?: string | null
          qty: number
          total_cents?: number
          unit?: Database["public"]["Enums"]["product_unit"]
          unit_cost_cents?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invoice_id?: string
          lot?: string | null
          name_snapshot?: string
          product_id?: string | null
          qty?: number
          total_cents?: number
          unit?: Database["public"]["Enums"]["product_unit"]
          unit_cost_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoices: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          doc_key: string | null
          doc_number: string | null
          doc_series: string | null
          doc_type: Database["public"]["Enums"]["purchase_doc_type"]
          id: string
          issued_at: string | null
          notes: string | null
          received_at: string
          supplier_doc: string | null
          supplier_name: string | null
          total_cents: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          doc_key?: string | null
          doc_number?: string | null
          doc_series?: string | null
          doc_type?: Database["public"]["Enums"]["purchase_doc_type"]
          id?: string
          issued_at?: string | null
          notes?: string | null
          received_at?: string
          supplier_doc?: string | null
          supplier_name?: string | null
          total_cents?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          doc_key?: string | null
          doc_number?: string | null
          doc_series?: string | null
          doc_type?: Database["public"]["Enums"]["purchase_doc_type"]
          id?: string
          issued_at?: string | null
          notes?: string | null
          received_at?: string
          supplier_doc?: string | null
          supplier_name?: string | null
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name_snapshot: string
          product_id: string | null
          qty: number
          sale_id: string
          total_cents: number
          unit: Database["public"]["Enums"]["product_unit"]
          unit_price_cents: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name_snapshot: string
          product_id?: string | null
          qty: number
          sale_id: string
          total_cents: number
          unit?: Database["public"]["Enums"]["product_unit"]
          unit_price_cents: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name_snapshot?: string
          product_id?: string | null
          qty?: number
          sale_id?: string
          total_cents?: number
          unit?: Database["public"]["Enums"]["product_unit"]
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_session_id: string | null
          cashier_id: string
          client_uuid: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          discount_cents: number
          id: string
          number: number
          pay_method: Database["public"]["Enums"]["pay_method"]
          status: Database["public"]["Enums"]["sale_status"]
          subtotal_cents: number
          synced_offline: boolean
          terminal: string
          total_cents: number
        }
        Insert: {
          cash_session_id?: string | null
          cashier_id: string
          client_uuid?: string | null
          company_id: string
          created_at?: string
          customer_id?: string | null
          discount_cents?: number
          id?: string
          number?: number
          pay_method?: Database["public"]["Enums"]["pay_method"]
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal_cents?: number
          synced_offline?: boolean
          terminal?: string
          total_cents?: number
        }
        Update: {
          cash_session_id?: string | null
          cashier_id?: string
          client_uuid?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          discount_cents?: number
          id?: string
          number?: number
          pay_method?: Database["public"]["Enums"]["pay_method"]
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal_cents?: number
          synced_offline?: boolean
          terminal?: string
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          kind: Database["public"]["Enums"]["stock_kind"]
          lot: string | null
          product_id: string | null
          qty: number
          reason: string | null
          sale_id: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["stock_kind"]
          lot?: string | null
          product_id?: string | null
          qty: number
          reason?: string | null
          sale_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["stock_kind"]
          lot?: string | null
          product_id?: string | null
          qty?: number
          reason?: string | null
          sale_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      company_license_active: {
        Args: { _company_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_company_role: {
        Args: {
          _company_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      register_deboning: {
        Args: {
          _carcass_name: string
          _carcass_product_id: string
          _carcass_qty: number
          _carcass_unit: Database["public"]["Enums"]["product_unit"]
          _company_id: string
          _expected_yield_pct: number
          _notes: string
          _outputs: Json
        }
        Returns: string
      }
      register_purchase: {
        Args: {
          _company_id: string
          _doc_key: string
          _doc_number: string
          _doc_series: string
          _doc_type: Database["public"]["Enums"]["purchase_doc_type"]
          _issued_at: string
          _items: Json
          _notes: string
          _supplier_doc: string
          _supplier_name: string
        }
        Returns: string
      }
      register_sale: {
        Args: {
          _client_uuid: string
          _company_id: string
          _customer_id: string
          _discount_cents: number
          _items: Json
          _pay_method: Database["public"]["Enums"]["pay_method"]
          _terminal: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "manager" | "butcher" | "cashier"
      cash_status: "open" | "closed"
      company_plan: "trial" | "starter" | "pro" | "enterprise"
      deboning_output_kind: "cut" | "fat" | "bone" | "loss"
      license_status: "trial" | "active" | "inactive" | "suspended"
      pay_method: "cash" | "debit" | "credit" | "pix" | "voucher"
      product_unit: "kg" | "un"
      purchase_doc_type: "nfe" | "nfce" | "cupom" | "non_fiscal"
      sale_status: "open" | "paid" | "cancelled"
      stock_kind: "in" | "out" | "loss" | "adjust" | "butcher"
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
      app_role: ["owner", "admin", "manager", "butcher", "cashier"],
      cash_status: ["open", "closed"],
      company_plan: ["trial", "starter", "pro", "enterprise"],
      deboning_output_kind: ["cut", "fat", "bone", "loss"],
      license_status: ["trial", "active", "inactive", "suspended"],
      pay_method: ["cash", "debit", "credit", "pix", "voucher"],
      product_unit: ["kg", "un"],
      purchase_doc_type: ["nfe", "nfce", "cupom", "non_fiscal"],
      sale_status: ["open", "paid", "cancelled"],
      stock_kind: ["in", "out", "loss", "adjust", "butcher"],
    },
  },
} as const
