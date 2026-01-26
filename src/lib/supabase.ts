import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// ===========================================
// Client-Side Supabase Client
// ===========================================

export const createBrowserClient = () => {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// ===========================================
// Server-Side Supabase Client
// ===========================================

export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// ===========================================
// Type-Safe Database Types
// ===========================================

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          company: string | null;
          avatar_url: string | null;
          preferences: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name?: string | null;
          company?: string | null;
          avatar_url?: string | null;
          preferences?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string | null;
          company?: string | null;
          avatar_url?: string | null;
          preferences?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          config: Record<string, unknown>;
          thumbnail_url: string | null;
          duration: number;
          is_template: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          config?: Record<string, unknown>;
          thumbnail_url?: string | null;
          duration?: number;
          is_template?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          config?: Record<string, unknown>;
          thumbnail_url?: string | null;
          duration?: number;
          is_template?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      renders: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          status: 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
          resolution: 'HD_720P' | 'HD_1080P' | 'UHD_4K';
          progress: number;
          output_url: string | null;
          file_size: number | null;
          error_message: string | null;
          render_id: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          status?: 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
          resolution?: 'HD_720P' | 'HD_1080P' | 'UHD_4K';
          progress?: number;
          output_url?: string | null;
          file_size?: number | null;
          error_message?: string | null;
          render_id?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          status?: 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
          resolution?: 'HD_720P' | 'HD_1080P' | 'UHD_4K';
          progress?: number;
          output_url?: string | null;
          file_size?: number | null;
          error_message?: string | null;
          render_id?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          config: Record<string, unknown>;
          thumbnail_url: string | null;
          category: string | null;
          is_public: boolean;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          config?: Record<string, unknown>;
          thumbnail_url?: string | null;
          category?: string | null;
          is_public?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          config?: Record<string, unknown>;
          thumbnail_url?: string | null;
          category?: string | null;
          is_public?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      render_status: 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
      resolution: 'HD_720P' | 'HD_1080P' | 'UHD_4K';
    };
  };
};
