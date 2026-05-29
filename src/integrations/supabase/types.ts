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
      ai_product_settings: {
        Row: {
          claude_api_key: string | null
          created_at: string
          deepseek_api_key: string | null
          default_level: string
          default_provider: string
          gemini_api_key: string | null
          id: number
          image_api_key: string | null
          image_default_background: string
          image_default_format: string
          image_default_size: string
          image_provider: string
          image_quality: number
          openai_api_key: string | null
          updated_at: string
        }
        Insert: {
          claude_api_key?: string | null
          created_at?: string
          deepseek_api_key?: string | null
          default_level?: string
          default_provider?: string
          gemini_api_key?: string | null
          id?: number
          image_api_key?: string | null
          image_default_background?: string
          image_default_format?: string
          image_default_size?: string
          image_provider?: string
          image_quality?: number
          openai_api_key?: string | null
          updated_at?: string
        }
        Update: {
          claude_api_key?: string | null
          created_at?: string
          deepseek_api_key?: string | null
          default_level?: string
          default_provider?: string
          gemini_api_key?: string | null
          id?: number
          image_api_key?: string | null
          image_default_background?: string
          image_default_format?: string
          image_default_size?: string
          image_provider?: string
          image_quality?: number
          openai_api_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      analytics_settings: {
        Row: {
          ads_enabled: boolean
          ga4_enabled: boolean
          ga4_measurement_id: string | null
          google_ads_conversion_id: string | null
          google_ads_conversion_label: string | null
          gtm_container_id: string | null
          gtm_enabled: boolean
          id: number
          meta_pixel_id: string | null
          pixel_enabled: boolean
          updated_at: string
        }
        Insert: {
          ads_enabled?: boolean
          ga4_enabled?: boolean
          ga4_measurement_id?: string | null
          google_ads_conversion_id?: string | null
          google_ads_conversion_label?: string | null
          gtm_container_id?: string | null
          gtm_enabled?: boolean
          id?: number
          meta_pixel_id?: string | null
          pixel_enabled?: boolean
          updated_at?: string
        }
        Update: {
          ads_enabled?: boolean
          ga4_enabled?: boolean
          ga4_measurement_id?: string | null
          google_ads_conversion_id?: string | null
          google_ads_conversion_label?: string | null
          gtm_container_id?: string | null
          gtm_enabled?: boolean
          id?: number
          meta_pixel_id?: string | null
          pixel_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          category: string | null
          content: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          featured_order: number | null
          id: string
          is_featured: boolean
          is_published: boolean
          published_at: string
          read_time: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          featured_order?: number | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          published_at?: string
          read_time?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          featured_order?: number | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          published_at?: string
          read_time?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          banner_url: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          logo_url: string | null
          long_description: string | null
          name: string
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          long_description?: string | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          long_description?: string | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: []
      }
      catalog_filter_options: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          filter_id: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          updated_at: string
          value: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          filter_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          filter_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_filter_options_filter_id_fkey"
            columns: ["filter_id"]
            isOneToOne: false
            referencedRelation: "catalog_filters"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_filter_settings: {
        Row: {
          config: Json
          id: number
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_filters: {
        Row: {
          created_at: string
          default_open: boolean
          display_order: number
          filter_type: string
          id: string
          is_active: boolean
          name: string
          pages_visibility: Json
          selection_type: string
          show_desktop: boolean
          show_mobile: boolean
          slug: string
          ui_widget: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_open?: boolean
          display_order?: number
          filter_type: string
          id?: string
          is_active?: boolean
          name: string
          pages_visibility?: Json
          selection_type?: string
          show_desktop?: boolean
          show_mobile?: boolean
          slug: string
          ui_widget?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_open?: boolean
          display_order?: number
          filter_type?: string
          id?: string
          is_active?: boolean
          name?: string
          pages_visibility?: Json
          selection_type?: string
          show_desktop?: boolean
          show_mobile?: boolean
          slug?: string
          ui_widget?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          featured_cta_href: string | null
          featured_cta_label: string | null
          featured_enabled: boolean
          featured_image_url: string | null
          featured_text: string | null
          featured_title: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          long_description: string | null
          menu_badge: string | null
          menu_badge_bg: string | null
          menu_badge_color: string | null
          menu_column: number
          menu_group_title: string | null
          menu_label: string | null
          menu_show_desktop: boolean
          menu_show_mobile: boolean
          menu_type: string
          meta_description: string | null
          meta_title: string | null
          name: string
          parent_id: string | null
          related_category_ids: string[]
          related_goal_ids: string[]
          related_product_ids: string[]
          short_description: string | null
          show_in_home: boolean
          show_in_menu: boolean
          show_in_sitemap: boolean
          slug: string
          sort_order: number
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          featured_cta_href?: string | null
          featured_cta_label?: string | null
          featured_enabled?: boolean
          featured_image_url?: string | null
          featured_text?: string | null
          featured_title?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          long_description?: string | null
          menu_badge?: string | null
          menu_badge_bg?: string | null
          menu_badge_color?: string | null
          menu_column?: number
          menu_group_title?: string | null
          menu_label?: string | null
          menu_show_desktop?: boolean
          menu_show_mobile?: boolean
          menu_type?: string
          meta_description?: string | null
          meta_title?: string | null
          name: string
          parent_id?: string | null
          related_category_ids?: string[]
          related_goal_ids?: string[]
          related_product_ids?: string[]
          short_description?: string | null
          show_in_home?: boolean
          show_in_menu?: boolean
          show_in_sitemap?: boolean
          slug: string
          sort_order?: number
          type: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          featured_cta_href?: string | null
          featured_cta_label?: string | null
          featured_enabled?: boolean
          featured_image_url?: string | null
          featured_text?: string | null
          featured_title?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          long_description?: string | null
          menu_badge?: string | null
          menu_badge_bg?: string | null
          menu_badge_color?: string | null
          menu_column?: number
          menu_group_title?: string | null
          menu_label?: string | null
          menu_show_desktop?: boolean
          menu_show_mobile?: boolean
          menu_type?: string
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          parent_id?: string | null
          related_category_ids?: string[]
          related_goal_ids?: string[]
          related_product_ids?: string[]
          short_description?: string | null
          show_in_home?: boolean
          show_in_menu?: boolean
          show_in_sitemap?: boolean
          slug?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_ai_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          message_id: string | null
          rating: string
          session_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          rating: string
          session_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          rating?: string
          session_id?: string
        }
        Relationships: []
      }
      chat_ai_messages: {
        Row: {
          content: string
          created_at: string
          current_page: string | null
          device_data: Json
          id: string
          intent: string | null
          latency_ms: number | null
          location_data: Json
          matched_products: Json
          metadata: Json
          model: string | null
          product_id: string | null
          prompt_version_id: string | null
          provider: string | null
          referrer: string | null
          role: string
          session_id: string
          source: string | null
          tokens_input: number | null
          tokens_output: number | null
          utm_data: Json
          visitor_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          current_page?: string | null
          device_data?: Json
          id?: string
          intent?: string | null
          latency_ms?: number | null
          location_data?: Json
          matched_products?: Json
          metadata?: Json
          model?: string | null
          product_id?: string | null
          prompt_version_id?: string | null
          provider?: string | null
          referrer?: string | null
          role: string
          session_id: string
          source?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          utm_data?: Json
          visitor_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          current_page?: string | null
          device_data?: Json
          id?: string
          intent?: string | null
          latency_ms?: number | null
          location_data?: Json
          matched_products?: Json
          metadata?: Json
          model?: string | null
          product_id?: string | null
          prompt_version_id?: string | null
          provider?: string | null
          referrer?: string | null
          role?: string
          session_id?: string
          source?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          utm_data?: Json
          visitor_id?: string | null
        }
        Relationships: []
      }
      chat_ai_prompts: {
        Row: {
          business_rules: string
          created_at: string
          fallback_rules: string
          id: string
          is_active: boolean
          model: string | null
          name: string
          provider: string | null
          safety_rules: string
          sales_rules: string
          system_prompt: string
          updated_at: string
          version: number
        }
        Insert: {
          business_rules?: string
          created_at?: string
          fallback_rules?: string
          id?: string
          is_active?: boolean
          model?: string | null
          name?: string
          provider?: string | null
          safety_rules?: string
          sales_rules?: string
          system_prompt?: string
          updated_at?: string
          version?: number
        }
        Update: {
          business_rules?: string
          created_at?: string
          fallback_rules?: string
          id?: string
          is_active?: boolean
          model?: string | null
          name?: string
          provider?: string | null
          safety_rules?: string
          sales_rules?: string
          system_prompt?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      chat_ai_sessions: {
        Row: {
          browser: string | null
          campaign: string | null
          city: string | null
          consent_snapshot: Json | null
          country: string | null
          created_at: string
          current_product_id: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          device_type: string | null
          first_page: string | null
          first_product_viewed: string | null
          id: string
          landing_page: string | null
          last_page: string | null
          last_product_viewed: string | null
          medium: string | null
          os: string | null
          referrer: string | null
          session_id: string
          source: string
          status: string
          timezone: string | null
          updated_at: string
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          campaign?: string | null
          city?: string | null
          consent_snapshot?: Json | null
          country?: string | null
          created_at?: string
          current_product_id?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          device_type?: string | null
          first_page?: string | null
          first_product_viewed?: string | null
          id?: string
          landing_page?: string | null
          last_page?: string | null
          last_product_viewed?: string | null
          medium?: string | null
          os?: string | null
          referrer?: string | null
          session_id: string
          source?: string
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          campaign?: string | null
          city?: string | null
          consent_snapshot?: Json | null
          country?: string | null
          created_at?: string
          current_product_id?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          device_type?: string | null
          first_page?: string | null
          first_product_viewed?: string | null
          id?: string
          landing_page?: string | null
          last_page?: string | null
          last_product_viewed?: string | null
          medium?: string | null
          os?: string | null
          referrer?: string | null
          session_id?: string
          source?: string
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      chat_ai_settings: {
        Row: {
          assistant_name: string
          assistant_tagline: string
          enabled: boolean
          hide_whatsapp_button: boolean
          history_size: number
          id: number
          max_tokens: number
          model: string
          proactive_bubble_delay_ms: number
          proactive_bubble_enabled: boolean
          provider: string
          save_conversations: boolean
          show_on_category: boolean
          show_on_home: boolean
          show_on_landing: boolean
          show_on_product: boolean
          temperature: number
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          assistant_name?: string
          assistant_tagline?: string
          enabled?: boolean
          hide_whatsapp_button?: boolean
          history_size?: number
          id?: number
          max_tokens?: number
          model?: string
          proactive_bubble_delay_ms?: number
          proactive_bubble_enabled?: boolean
          provider?: string
          save_conversations?: boolean
          show_on_category?: boolean
          show_on_home?: boolean
          show_on_landing?: boolean
          show_on_product?: boolean
          temperature?: number
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          assistant_name?: string
          assistant_tagline?: string
          enabled?: boolean
          hide_whatsapp_button?: boolean
          history_size?: number
          id?: number
          max_tokens?: number
          model?: string
          proactive_bubble_delay_ms?: number
          proactive_bubble_enabled?: boolean
          provider?: string
          save_conversations?: boolean
          show_on_category?: boolean
          show_on_home?: boolean
          show_on_landing?: boolean
          show_on_product?: boolean
          temperature?: number
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      combo_config: {
        Row: {
          ai_enabled: boolean
          ai_prompt: string
          ai_provider: string | null
          id: string
          max_recommendations: number
          show_in_cart: boolean
          show_in_category: boolean
          show_in_checkout: boolean
          show_in_home: boolean
          show_in_product: boolean
          show_in_search: boolean
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          ai_prompt?: string
          ai_provider?: string | null
          id?: string
          max_recommendations?: number
          show_in_cart?: boolean
          show_in_category?: boolean
          show_in_checkout?: boolean
          show_in_home?: boolean
          show_in_product?: boolean
          show_in_search?: boolean
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          ai_prompt?: string
          ai_provider?: string | null
          id?: string
          max_recommendations?: number
          show_in_cart?: boolean
          show_in_category?: boolean
          show_in_checkout?: boolean
          show_in_home?: boolean
          show_in_product?: boolean
          show_in_search?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      combo_events: {
        Row: {
          amount: number | null
          combo_id: string
          created_at: string
          event_type: string
          id: string
          order_id: string | null
          source_location: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          combo_id: string
          created_at?: string
          event_type: string
          id?: string
          order_id?: string | null
          source_location?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          combo_id?: string
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string | null
          source_location?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "combo_events_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_products: {
        Row: {
          combo_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          combo_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          combo_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_products_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_rules: {
        Row: {
          category_id: string | null
          combo_id: string
          created_at: string
          id: string
          is_active: boolean
          max_cart_total: number | null
          min_cart_total: number | null
          need_tag: string | null
          priority: string
          product_id: string | null
          rule_type: string
        }
        Insert: {
          category_id?: string | null
          combo_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_cart_total?: number | null
          min_cart_total?: number | null
          need_tag?: string | null
          priority?: string
          product_id?: string | null
          rule_type: string
        }
        Update: {
          category_id?: string | null
          combo_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_cart_total?: number | null
          min_cart_total?: number | null
          need_tag?: string | null
          priority?: string
          product_id?: string | null
          rule_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_rules_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          display_locations: string[]
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          need_tag: string | null
          price_combo: number
          price_normal: number
          priority: string
          slug: string
          starts_at: string | null
          stat_cart_adds: number
          stat_purchases: number
          stat_revenue: number
          stat_views: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          display_locations?: string[]
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          need_tag?: string | null
          price_combo?: number
          price_normal?: number
          priority?: string
          slug: string
          starts_at?: string | null
          stat_cart_adds?: number
          stat_purchases?: number
          stat_revenue?: number
          stat_views?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          display_locations?: string[]
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          need_tag?: string | null
          price_combo?: number
          price_normal?: number
          priority?: string
          slug?: string
          starts_at?: string | null
          stat_cart_adds?: number
          stat_purchases?: number
          stat_revenue?: number
          stat_views?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      filter_options: {
        Row: {
          created_at: string
          group: string
          id: string
          is_enabled: boolean
          label: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          group: string
          id?: string
          is_enabled?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          group?: string
          id?: string
          is_enabled?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      footer_links: {
        Row: {
          column_index: number
          created_at: string
          href: string
          id: string
          is_active: boolean
          label: string
          open_in_new_tab: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          column_index?: number
          created_at?: string
          href?: string
          id?: string
          is_active?: boolean
          label: string
          open_in_new_tab?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          column_index?: number
          created_at?: string
          href?: string
          id?: string
          is_active?: boolean
          label?: string
          open_in_new_tab?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      goal_cards: {
        Row: {
          created_at: string
          cta_href: string | null
          cta_label: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          canonical_url: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          long_description: string | null
          meta_description: string | null
          name: string
          related_category_ids: string[]
          related_product_ids: string[]
          short_description: string | null
          show_in_home: boolean
          show_in_mega_menu: boolean
          show_in_menu: boolean
          show_in_sitemap: boolean
          slug: string
          sort_order: number
          title_seo: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          long_description?: string | null
          meta_description?: string | null
          name: string
          related_category_ids?: string[]
          related_product_ids?: string[]
          short_description?: string | null
          show_in_home?: boolean
          show_in_mega_menu?: boolean
          show_in_menu?: boolean
          show_in_sitemap?: boolean
          slug: string
          sort_order?: number
          title_seo?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          long_description?: string | null
          meta_description?: string | null
          name?: string
          related_category_ids?: string[]
          related_product_ids?: string[]
          short_description?: string | null
          show_in_home?: boolean
          show_in_mega_menu?: boolean
          show_in_menu?: boolean
          show_in_sitemap?: boolean
          slug?: string
          sort_order?: number
          title_seo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string
          eyebrow: string | null
          id: string
          image_url: string | null
          is_active: boolean
          primary_href: string | null
          primary_label: string | null
          secondary_href: string | null
          secondary_label: string | null
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          eyebrow?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          primary_href?: string | null
          primary_label?: string | null
          secondary_href?: string | null
          secondary_label?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          eyebrow?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          primary_href?: string | null
          primary_label?: string | null
          secondary_href?: string | null
          secondary_label?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      home_blocks: {
        Row: {
          block_key: string
          block_type: string
          created_at: string
          cta_href: string | null
          cta_label: string | null
          cta2_href: string | null
          cta2_label: string | null
          eyebrow: string | null
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          block_key: string
          block_type: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          cta2_href?: string | null
          cta2_label?: string | null
          eyebrow?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          block_key?: string
          block_type?: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          cta2_href?: string | null
          cta2_label?: string | null
          eyebrow?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lucia_events: {
        Row: {
          campaign: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          medium: string | null
          metadata: Json
          page: string | null
          product_id: string | null
          product_slug: string | null
          session_id: string | null
          source: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          campaign?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          medium?: string | null
          metadata?: Json
          page?: string | null
          product_id?: string | null
          product_slug?: string | null
          session_id?: string | null
          source?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          campaign?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          medium?: string | null
          metadata?: Json
          page?: string | null
          product_id?: string | null
          product_slug?: string | null
          session_id?: string | null
          source?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      mega_menu_columns: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          parent_nav: string
          position: number
          see_all_href: string | null
          see_all_label: string | null
          show_desktop: boolean
          show_mobile: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          parent_nav?: string
          position?: number
          see_all_href?: string | null
          see_all_label?: string | null
          show_desktop?: boolean
          show_mobile?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          parent_nav?: string
          position?: number
          see_all_href?: string | null
          see_all_label?: string | null
          show_desktop?: boolean
          show_mobile?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mega_menu_items: {
        Row: {
          category_id: string | null
          column_id: string
          created_at: string
          display_label: string
          goal_id: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_type: string
          open_in_new_tab: boolean
          position: number
          seo_note: string | null
          show_desktop: boolean
          show_mobile: boolean
          updated_at: string
          url: string | null
        }
        Insert: {
          category_id?: string | null
          column_id: string
          created_at?: string
          display_label: string
          goal_id?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_type?: string
          open_in_new_tab?: boolean
          position?: number
          seo_note?: string | null
          show_desktop?: boolean
          show_mobile?: boolean
          updated_at?: string
          url?: string | null
        }
        Update: {
          category_id?: string | null
          column_id?: string
          created_at?: string
          display_label?: string
          goal_id?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_type?: string
          open_in_new_tab?: boolean
          position?: number
          seo_note?: string | null
          show_desktop?: boolean
          show_mobile?: boolean
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mega_menu_items_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "mega_menu_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      mega_menu_nav_settings: {
        Row: {
          href: string
          label: string
          parent_nav: string
          position: number
          updated_at: string
        }
        Insert: {
          href: string
          label: string
          parent_nav: string
          position?: number
          updated_at?: string
        }
        Update: {
          href?: string
          label?: string
          parent_nav?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_custom_fields: {
        Row: {
          badge_bg: string | null
          badge_color: string | null
          badge_text: string | null
          column_index: number
          created_at: string
          cta_label: string | null
          field_type: string
          href: string | null
          id: string
          image_url: string | null
          is_active: boolean
          parent_category_id: string | null
          show_desktop: boolean
          show_mobile: boolean
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          badge_bg?: string | null
          badge_color?: string | null
          badge_text?: string | null
          column_index?: number
          created_at?: string
          cta_label?: string | null
          field_type?: string
          href?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          parent_category_id?: string | null
          show_desktop?: boolean
          show_mobile?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          badge_bg?: string | null
          badge_color?: string | null
          badge_text?: string | null
          column_index?: number
          created_at?: string
          cta_label?: string | null
          field_type?: string
          href?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          parent_category_id?: string | null
          show_desktop?: boolean
          show_mobile?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      merchant_feed_logs: {
        Row: {
          errors_json: Json
          generated_at: string
          id: string
          invalid_products: number
          status: string
          total_products: number
          valid_products: number
        }
        Insert: {
          errors_json?: Json
          generated_at?: string
          id?: string
          invalid_products?: number
          status?: string
          total_products?: number
          valid_products?: number
        }
        Update: {
          errors_json?: Json
          generated_at?: string
          id?: string
          invalid_products?: number
          status?: string
          total_products?: number
          valid_products?: number
        }
        Relationships: []
      }
      nav_links: {
        Row: {
          created_at: string
          href: string
          id: string
          is_active: boolean
          label: string
          open_in_new_tab: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          href: string
          id?: string
          is_active?: boolean
          label: string
          open_in_new_tab?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          href?: string
          id?: string
          is_active?: boolean
          label?: string
          open_in_new_tab?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          commission_amount: number
          commission_percent: number
          created_at: string
          fulfillment_status: string
          id: string
          order_id: string
          product_image: string | null
          product_name: string
          product_slug: string
          purchase_type: string
          quantity: number
          subscription_interval_days: number | null
          supplier_id: string | null
          supplier_payout: number
          tracking_number: string | null
          unit_price: number
          variant: string | null
        }
        Insert: {
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          fulfillment_status?: string
          id?: string
          order_id: string
          product_image?: string | null
          product_name: string
          product_slug: string
          purchase_type?: string
          quantity?: number
          subscription_interval_days?: number | null
          supplier_id?: string | null
          supplier_payout?: number
          tracking_number?: string | null
          unit_price: number
          variant?: string | null
        }
        Update: {
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          fulfillment_status?: string
          id?: string
          order_id?: string
          product_image?: string | null
          product_name?: string
          product_slug?: string
          purchase_type?: string
          quantity?: number
          subscription_interval_days?: number | null
          supplier_id?: string | null
          supplier_payout?: number
          tracking_number?: string | null
          unit_price?: number
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          order_code: string
          payment_method: string
          referral_source: string | null
          reseller_discount_applied: number
          reseller_id: string | null
          shipping: number
          shipping_address: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_name: string | null
          shipping_phone: string | null
          shipping_postal_code: string | null
          status: Database["public"]["Enums"]["order_status"]
          store_credit_used: number
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_code?: string
          payment_method?: string
          referral_source?: string | null
          reseller_discount_applied?: number
          reseller_id?: string | null
          shipping?: number
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_postal_code?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_credit_used?: number
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_code?: string
          payment_method?: string
          referral_source?: string | null
          reseller_discount_applied?: number
          reseller_id?: string | null
          shipping?: number
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_postal_code?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_credit_used?: number
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_benefits: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          landing_slug: string | null
          metadata: Json
          product_id: string | null
          product_slug: string | null
          session_id: string | null
          user_id: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          landing_slug?: string | null
          metadata?: Json
          product_id?: string | null
          product_slug?: string | null
          session_id?: string | null
          user_id?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          landing_slug?: string | null
          metadata?: Json
          product_id?: string | null
          product_slug?: string | null
          session_id?: string | null
          user_id?: string | null
          value?: number | null
        }
        Relationships: []
      }
      product_filter_values: {
        Row: {
          created_at: string
          filter_id: string
          id: string
          option_id: string | null
          product_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          filter_id: string
          id?: string
          option_id?: string | null
          product_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          filter_id?: string
          id?: string
          option_id?: string | null
          product_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_filter_values_filter_id_fkey"
            columns: ["filter_id"]
            isOneToOne: false
            referencedRelation: "catalog_filters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_filter_values_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "catalog_filter_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_filter_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_search_terms: {
        Row: {
          created_at: string
          id: string
          kind: string
          product_id: string
          term: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          product_id: string
          term: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          product_id?: string
          term?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_search_terms_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          approval_status: string
          badge: string | null
          brand: string | null
          brand_id: string | null
          category: string | null
          created_at: string
          description: string | null
          faqs: Json
          flavor: string | null
          gallery_images: Json
          goal: string | null
          id: string
          ingredients: string | null
          is_active: boolean
          main_image: string | null
          main_ingredient: string | null
          name: string
          nutrition_facts: Json | null
          price: number
          rating: number
          rejection_reason: string | null
          sale_price: number | null
          short_description: string | null
          size: string | null
          size_variants: Json
          slug: string
          sort_order: number
          stock: number
          subcategory: string | null
          subscription_discount_percent: number
          subscription_enabled: boolean
          subscription_intervals: number[]
          supplier_id: string | null
          updated_at: string
          usage_instructions: string | null
        }
        Insert: {
          approval_status?: string
          badge?: string | null
          brand?: string | null
          brand_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          faqs?: Json
          flavor?: string | null
          gallery_images?: Json
          goal?: string | null
          id?: string
          ingredients?: string | null
          is_active?: boolean
          main_image?: string | null
          main_ingredient?: string | null
          name: string
          nutrition_facts?: Json | null
          price?: number
          rating?: number
          rejection_reason?: string | null
          sale_price?: number | null
          short_description?: string | null
          size?: string | null
          size_variants?: Json
          slug: string
          sort_order?: number
          stock?: number
          subcategory?: string | null
          subscription_discount_percent?: number
          subscription_enabled?: boolean
          subscription_intervals?: number[]
          supplier_id?: string | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Update: {
          approval_status?: string
          badge?: string | null
          brand?: string | null
          brand_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          faqs?: Json
          flavor?: string | null
          gallery_images?: Json
          goal?: string | null
          id?: string
          ingredients?: string | null
          is_active?: boolean
          main_image?: string | null
          main_ingredient?: string | null
          name?: string
          nutrition_facts?: Json | null
          price?: number
          rating?: number
          rejection_reason?: string | null
          sale_price?: number | null
          short_description?: string | null
          size?: string | null
          size_variants?: Json
          slug?: string
          sort_order?: number
          stock?: number
          subcategory?: string | null
          subscription_discount_percent?: number
          subscription_enabled?: boolean
          subscription_intervals?: number[]
          supplier_id?: string | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products_carousel_config: {
        Row: {
          autoplay: boolean
          autoplay_speed: number
          id: string
          is_active: boolean
          manual_slugs: Json
          show_arrows: boolean
          show_dots: boolean
          show_view_all: boolean
          source: string
          subtitle: string | null
          title: string
          total_items: number
          updated_at: string
          view_all_href: string
          view_all_label: string
          visible_desktop: number
          visible_mobile: number
          visible_tablet: number
        }
        Insert: {
          autoplay?: boolean
          autoplay_speed?: number
          id?: string
          is_active?: boolean
          manual_slugs?: Json
          show_arrows?: boolean
          show_dots?: boolean
          show_view_all?: boolean
          source?: string
          subtitle?: string | null
          title?: string
          total_items?: number
          updated_at?: string
          view_all_href?: string
          view_all_label?: string
          visible_desktop?: number
          visible_mobile?: number
          visible_tablet?: number
        }
        Update: {
          autoplay?: boolean
          autoplay_speed?: number
          id?: string
          is_active?: boolean
          manual_slugs?: Json
          show_arrows?: boolean
          show_dots?: boolean
          show_view_all?: boolean
          source?: string
          subtitle?: string | null
          title?: string
          total_items?: number
          updated_at?: string
          view_all_href?: string
          view_all_label?: string
          visible_desktop?: number
          visible_mobile?: number
          visible_tablet?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_products: {
        Row: {
          created_at: string
          product_id: string
          promotion_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          promotion_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          benefit_type: Database["public"]["Enums"]["promotion_benefit_type"]
          created_at: string
          discount_percent: number
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          show_on_home: boolean
          show_on_product: boolean
          start_date: string | null
          updated_at: string
          usage_limit_per_order: number
        }
        Insert: {
          benefit_type?: Database["public"]["Enums"]["promotion_benefit_type"]
          created_at?: string
          discount_percent?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          show_on_home?: boolean
          show_on_product?: boolean
          start_date?: string | null
          updated_at?: string
          usage_limit_per_order?: number
        }
        Update: {
          benefit_type?: Database["public"]["Enums"]["promotion_benefit_type"]
          created_at?: string
          discount_percent?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          show_on_home?: boolean
          show_on_product?: boolean
          start_date?: string | null
          updated_at?: string
          usage_limit_per_order?: number
        }
        Relationships: []
      }
      reseller_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          reseller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reseller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reseller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_payouts_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_referrals: {
        Row: {
          commission_amount: number
          commission_percent: number
          created_at: string
          id: string
          order_id: string
          reseller_id: string
          source: string
          status: string
          subtotal: number
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          order_id: string
          reseller_id: string
          source: string
          status?: string
          subtotal?: number
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          order_id?: string
          reseller_id?: string
          source?: string
          status?: string
          subtotal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_referrals_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_tiers: {
        Row: {
          commission_percent: number
          created_at: string
          customer_discount_percent: number
          id: string
          is_active: boolean
          min_sales: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          customer_discount_percent?: number
          id?: string
          is_active?: boolean
          min_sales?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          customer_discount_percent?: number
          id?: string
          is_active?: boolean
          min_sales?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      resellers: {
        Row: {
          balance_cash: number
          balance_credit: number
          code: string
          created_at: string
          id: string
          is_active: boolean
          link_slug: string
          payout_account: string | null
          payout_method: string
          tier_id: string | null
          total_commission: number
          total_sales: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cash?: number
          balance_credit?: number
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          link_slug: string
          payout_account?: string | null
          payout_method?: string
          tier_id?: string | null
          total_commission?: number
          total_sales?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cash?: number
          balance_credit?: number
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          link_slug?: string
          payout_account?: string | null
          payout_method?: string
          tier_id?: string | null
          total_commission?: number
          total_sales?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resellers_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "reseller_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpful_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          helpful_count: number
          id: string
          is_published: boolean
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          is_published?: boolean
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          is_published?: boolean
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      search_ai_settings: {
        Row: {
          api_key: string | null
          created_at: string
          enabled: boolean
          fallback_whatsapp_enabled: boolean
          helper_text: string
          id: number
          live_suggestions_enabled: boolean
          manual_suggestions: string[]
          max_products: number
          max_tokens: number
          min_confidence: number
          model: string
          prompt_template: string
          provider: string
          result_mode: string
          temperature: number
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          enabled?: boolean
          fallback_whatsapp_enabled?: boolean
          helper_text?: string
          id?: number
          live_suggestions_enabled?: boolean
          manual_suggestions?: string[]
          max_products?: number
          max_tokens?: number
          min_confidence?: number
          model?: string
          prompt_template?: string
          provider?: string
          result_mode?: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          enabled?: boolean
          fallback_whatsapp_enabled?: boolean
          helper_text?: string
          id?: number
          live_suggestions_enabled?: boolean
          manual_suggestions?: string[]
          max_products?: number
          max_tokens?: number
          min_confidence?: number
          model?: string
          prompt_template?: string
          provider?: string
          result_mode?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      search_keyword_map: {
        Row: {
          category_slug: string | null
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          need_slug: string | null
          product_ids: string[]
          updated_at: string
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          need_slug?: string | null
          product_ids?: string[]
          updated_at?: string
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          need_slug?: string | null
          product_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          clicked_product_id: string | null
          clicked_product_slug: string | null
          created_at: string
          id: string
          query: string
          results_count: number
          user_id: string | null
        }
        Insert: {
          clicked_product_id?: string | null
          clicked_product_slug?: string | null
          created_at?: string
          id?: string
          query: string
          results_count?: number
          user_id?: string | null
        }
        Update: {
          clicked_product_id?: string | null
          clicked_product_slug?: string | null
          created_at?: string
          id?: string
          query?: string
          results_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      search_needs: {
        Row: {
          created_at: string
          id: string
          intent: string | null
          is_active: boolean
          keywords: string[]
          message: string | null
          name: string
          priority: number
          related_category: string | null
          related_products: string[]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent?: string | null
          is_active?: boolean
          keywords?: string[]
          message?: string | null
          name: string
          priority?: number
          related_category?: string | null
          related_products?: string[]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intent?: string | null
          is_active?: boolean
          keywords?: string[]
          message?: string | null
          name?: string
          priority?: number
          related_category?: string | null
          related_products?: string[]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      sensitive_claims_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          pattern: string
          severity: string
          suggestion: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          pattern: string
          severity?: string
          suggestion: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          pattern?: string
          severity?: string
          suggestion?: string
        }
        Relationships: []
      }
      seo_change_logs: {
        Row: {
          changed_at: string
          changed_by: string | null
          entity_id: string | null
          entity_type: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          entity_id?: string | null
          entity_type: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          entity_id?: string | null
          entity_type?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      seo_content_plan: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          kind: string
          notes: string | null
          payload: Json
          status: string
          target_keyword: string | null
          target_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          kind: string
          notes?: string | null
          payload?: Json
          status?: string
          target_keyword?: string | null
          target_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          kind?: string
          notes?: string | null
          payload?: Json
          status?: string
          target_keyword?: string | null
          target_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_gsc_settings: {
        Row: {
          id: number
          last_synced_at: string | null
          notes: string | null
          site_property: string | null
          updated_at: string
          verification_method: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          id?: number
          last_synced_at?: string | null
          notes?: string | null
          site_property?: string | null
          updated_at?: string
          verification_method?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          id?: number
          last_synced_at?: string | null
          notes?: string | null
          site_property?: string | null
          updated_at?: string
          verification_method?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      seo_gsc_urls: {
        Row: {
          coverage_state: string | null
          id: string
          is_indexable: boolean | null
          last_crawl_at: string | null
          last_synced_at: string
          raw: Json | null
          url: string
        }
        Insert: {
          coverage_state?: string | null
          id?: string
          is_indexable?: boolean | null
          last_crawl_at?: string | null
          last_synced_at?: string
          raw?: Json | null
          url: string
        }
        Update: {
          coverage_state?: string | null
          id?: string
          is_indexable?: boolean | null
          last_crawl_at?: string | null
          last_synced_at?: string
          raw?: Json | null
          url?: string
        }
        Relationships: []
      }
      seo_image_alts: {
        Row: {
          alt_text: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          image_url: string
          updated_at: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          image_url: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_landing_pages: {
        Row: {
          created_at: string
          filter_field: string | null
          filter_value: string | null
          id: string
          intro: string | null
          is_published: boolean
          kind: string
          long_description: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          filter_field?: string | null
          filter_value?: string | null
          id?: string
          intro?: string | null
          is_published?: boolean
          kind: string
          long_description?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          filter_field?: string | null
          filter_value?: string | null
          id?: string
          intro?: string | null
          is_published?: boolean
          kind?: string
          long_description?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_meta: {
        Row: {
          canonical: string | null
          created_at: string
          entity_id: string
          entity_type: string
          h1: string | null
          id: string
          intro_text: string | null
          keywords: string[]
          last_analyzed_at: string | null
          llms_summary: string | null
          long_description: string | null
          noindex: boolean
          og_description: string | null
          og_image: string | null
          og_site_name: string | null
          og_title: string | null
          robots_directive: string | null
          schema_jsonld: Json | null
          score: number | null
          seo_description: string | null
          seo_title: string | null
          shopping_description: string | null
          shopping_title: string | null
          short_description: string | null
          slug: string | null
          tags: string[]
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string
        }
        Insert: {
          canonical?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          h1?: string | null
          id?: string
          intro_text?: string | null
          keywords?: string[]
          last_analyzed_at?: string | null
          llms_summary?: string | null
          long_description?: string | null
          noindex?: boolean
          og_description?: string | null
          og_image?: string | null
          og_site_name?: string | null
          og_title?: string | null
          robots_directive?: string | null
          schema_jsonld?: Json | null
          score?: number | null
          seo_description?: string | null
          seo_title?: string | null
          shopping_description?: string | null
          shopping_title?: string | null
          short_description?: string | null
          slug?: string | null
          tags?: string[]
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
        }
        Update: {
          canonical?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          h1?: string | null
          id?: string
          intro_text?: string | null
          keywords?: string[]
          last_analyzed_at?: string | null
          llms_summary?: string | null
          long_description?: string | null
          noindex?: boolean
          og_description?: string | null
          og_image?: string | null
          og_site_name?: string | null
          og_title?: string | null
          robots_directive?: string | null
          schema_jsonld?: Json | null
          score?: number | null
          seo_description?: string | null
          seo_title?: string | null
          shopping_description?: string | null
          shopping_title?: string | null
          short_description?: string | null
          slug?: string | null
          tags?: string[]
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_redirects: {
        Row: {
          active: boolean
          created_at: string
          from_path: string
          id: string
          status_code: number
          to_path: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          from_path: string
          id?: string
          status_code?: number
          to_path: string
        }
        Update: {
          active?: boolean
          created_at?: string
          from_path?: string
          id?: string
          status_code?: number
          to_path?: string
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          brand: string | null
          default_description: string | null
          default_og_image: string | null
          default_title_template: string
          google_product_category: string | null
          id: number
          robots_extra: string | null
          site_name: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          default_description?: string | null
          default_og_image?: string | null
          default_title_template?: string
          google_product_category?: string | null
          id?: number
          robots_extra?: string | null
          site_name?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          default_description?: string | null
          default_og_image?: string | null
          default_title_template?: string
          google_product_category?: string | null
          id?: number
          robots_extra?: string | null
          site_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_suggestions: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          faqs: Json
          id: string
          image_alts: Json
          keywords: string[]
          long_description: string | null
          model: string | null
          raw: Json | null
          reviewed_at: string | null
          seo_description: string | null
          seo_title: string | null
          shopping_description: string | null
          shopping_title: string | null
          short_description: string | null
          slug: string | null
          status: string
          tags: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          faqs?: Json
          id?: string
          image_alts?: Json
          keywords?: string[]
          long_description?: string | null
          model?: string | null
          raw?: Json | null
          reviewed_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shopping_description?: string | null
          shopping_title?: string | null
          short_description?: string | null
          slug?: string | null
          status?: string
          tags?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          faqs?: Json
          id?: string
          image_alts?: Json
          keywords?: string[]
          long_description?: string | null
          model?: string | null
          raw?: Json | null
          reviewed_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shopping_description?: string | null
          shopping_title?: string | null
          short_description?: string | null
          slug?: string | null
          status?: string
          tags?: string[]
        }
        Relationships: []
      }
      seo_synonyms: {
        Row: {
          created_at: string
          hits: number
          id: string
          resolved_to: string | null
          status: string
          suggested_target_id: string | null
          suggested_target_kind: string | null
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hits?: number
          id?: string
          resolved_to?: string | null
          status?: string
          suggested_target_id?: string | null
          suggested_target_kind?: string | null
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hits?: number
          id?: string
          resolved_to?: string | null
          status?: string
          suggested_target_id?: string | null
          suggested_target_kind?: string | null
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_providers: {
        Row: {
          code: string | null
          cost: number
          created_at: string
          estimated_days: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          sort_order: number
          updated_at: string
          zones: string | null
        }
        Insert: {
          code?: string | null
          cost?: number
          created_at?: string
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
          zones?: string | null
        }
        Update: {
          code?: string | null
          cost?: number
          created_at?: string
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
          zones?: string | null
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          cities: string[]
          cost: number
          created_at: string
          estimated_days: string | null
          free_threshold: number | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cities?: string[]
          cost?: number
          created_at?: string
          estimated_days?: string | null
          free_threshold?: number | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cities?: string[]
          cost?: number
          created_at?: string
          estimated_days?: string | null
          free_threshold?: number | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          interval_days: number
          last_order_id: string | null
          last_processed_at: string | null
          next_delivery_at: string
          product_id: string | null
          product_image: string | null
          product_name: string
          product_slug: string
          quantity: number
          status: Database["public"]["Enums"]["subscription_status"]
          unit_price: number
          updated_at: string
          user_id: string
          variant: string | null
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          id?: string
          interval_days?: number
          last_order_id?: string | null
          last_processed_at?: string | null
          next_delivery_at?: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          product_slug: string
          quantity?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          unit_price?: number
          updated_at?: string
          user_id: string
          variant?: string | null
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          interval_days?: number
          last_order_id?: string | null
          last_processed_at?: string | null
          next_delivery_at?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          product_slug?: string
          quantity?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          unit_price?: number
          updated_at?: string
          user_id?: string
          variant?: string | null
        }
        Relationships: []
      }
      supplier_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          reason: string | null
          supplier_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          supplier_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          supplier_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_status_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          business_name: string
          city: string | null
          commercial_name: string | null
          commission_percent: number
          contact_name: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          notes: string | null
          payment_terms: string | null
          payout_account: string | null
          payout_method: string | null
          phone: string | null
          publish_mode: string
          rejection_reason: string | null
          slug: string | null
          status: string
          tax_id: string | null
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          city?: string | null
          commercial_name?: string | null
          commission_percent?: number
          contact_name?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          notes?: string | null
          payment_terms?: string | null
          payout_account?: string | null
          payout_method?: string | null
          phone?: string | null
          publish_mode?: string
          rejection_reason?: string | null
          slug?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          city?: string | null
          commercial_name?: string | null
          commission_percent?: number
          contact_name?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          notes?: string | null
          payment_terms?: string | null
          payout_account?: string | null
          payout_method?: string | null
          phone?: string | null
          publish_mode?: string
          rejection_reason?: string | null
          slug?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
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
      testimonials: {
        Row: {
          author_handle: string | null
          author_name: string
          caption: string | null
          created_at: string
          id: string
          instagram_url: string | null
          is_active: boolean
          media_type: string
          media_url: string
          rating: number | null
          sort_order: number
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          author_handle?: string | null
          author_name: string
          caption?: string | null
          created_at?: string
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          media_type?: string
          media_url: string
          rating?: number | null
          sort_order?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          author_handle?: string | null
          author_name?: string
          caption?: string | null
          created_at?: string
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          media_type?: string
          media_url?: string
          rating?: number | null
          sort_order?: number
          thumbnail_url?: string | null
          updated_at?: string
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
      visitor_tracking: {
        Row: {
          browser: string | null
          campaign: string | null
          city: string | null
          consent_analytics: boolean
          consent_marketing: boolean
          consent_personalization: boolean
          country: string | null
          created_at: string
          current_page: string | null
          device_type: string | null
          fbclid: string | null
          first_page: string | null
          gclid: string | null
          id: string
          language: string | null
          last_page: string | null
          medium: string | null
          os: string | null
          referrer: string | null
          region: string | null
          session_id: string | null
          source: string | null
          timezone: string | null
          ttclid: string | null
          updated_at: string
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          campaign?: string | null
          city?: string | null
          consent_analytics?: boolean
          consent_marketing?: boolean
          consent_personalization?: boolean
          country?: string | null
          created_at?: string
          current_page?: string | null
          device_type?: string | null
          fbclid?: string | null
          first_page?: string | null
          gclid?: string | null
          id?: string
          language?: string | null
          last_page?: string | null
          medium?: string | null
          os?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          source?: string | null
          timezone?: string | null
          ttclid?: string | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          campaign?: string | null
          city?: string | null
          consent_analytics?: boolean
          consent_marketing?: boolean
          consent_personalization?: boolean
          country?: string | null
          created_at?: string
          current_page?: string | null
          device_type?: string | null
          fbclid?: string | null
          first_page?: string | null
          gclid?: string | null
          id?: string
          language?: string | null
          last_page?: string | null
          medium?: string | null
          os?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          source?: string | null
          timezone?: string | null
          ttclid?: string | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_reseller: {
        Args: never
        Returns: {
          balance_cash: number
          balance_credit: number
          code: string
          created_at: string
          id: string
          is_active: boolean
          link_slug: string
          payout_account: string | null
          payout_method: string
          tier_id: string | null
          total_commission: number
          total_sales: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "resellers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_supplier_id: { Args: never; Returns: string }
      current_supplier_status: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_seo_change: {
        Args: {
          _entity_id: string
          _entity_type: string
          _field: string
          _new: string
          _old: string
        }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_admins: {
        Args: { _body: string; _link: string; _title: string; _type: string }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _body: string
          _link: string
          _title: string
          _type: string
          _user: string
        }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalc_reseller_tier: {
        Args: { _reseller_id: string }
        Returns: undefined
      }
      resolve_referral: {
        Args: { _ref: string }
        Returns: {
          code: string
          customer_discount_percent: number
          link_slug: string
          reseller_id: string
          source: string
        }[]
      }
      search_products: {
        Args: { q: string }
        Returns: {
          category: string
          id: string
          main_image: string
          name: string
          price: number
          rating: number
          sale_price: number
          score: number
          short_description: string
          slug: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      supplier_owns_order: { Args: { _order_id: string }; Returns: boolean }
      user_has_confirmed_purchase: {
        Args: { _product_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
      category_type: "product" | "blog"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "shipped"
        | "delivered"
        | "cancelled"
      promotion_benefit_type: "second_discount" | "second_free"
      subscription_status: "active" | "paused" | "cancelled"
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
      app_role: ["admin", "client"],
      category_type: ["product", "blog"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      promotion_benefit_type: ["second_discount", "second_free"],
      subscription_status: ["active", "paused", "cancelled"],
    },
  },
} as const
