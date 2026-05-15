/**
 * Supabase DB 자동생성 타입의 베이스 골격.
 * Phase 1에서 Supabase CLI로 `supabase gen types typescript`로 덮어쓰게 됨.
 * 지금은 수동으로 핵심 테이블만 정의해서 IDE 자동완성 작동시킴.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'salesperson' | 'manager' | 'owner';
export type CustomerGrade = 'A' | 'B' | 'C' | 'D';
export type ActivityType = 'ta_call' | 'meeting' | 'memo' | 'message' | 'contract';
export type ActivityStatus = 'completed' | 'scheduled' | 'cancelled';
export type ActivityMood = 'good' | 'neutral' | 'bad';
export type PipelineStage =
  | 'ta_target'
  | 'ta_done'
  | 'meeting_scheduled'
  | 'meeting_done'
  | 'contract'
  | 'on_hold';
export type GoldenTimeRuleType =
  | 'contract_anniversary'
  | 'birthday'
  | 'holiday_greeting'
  | 'custom'
  | 'follow_up';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          subscription_plan: string;
          subscription_expires_at: string | null;
          daily_ta_goal: number;
          daily_meeting_goal: number;
          invite_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          industry?: string | null;
          subscription_plan?: string;
          subscription_expires_at?: string | null;
          daily_ta_goal?: number;
          daily_meeting_goal?: number;
          invite_code?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          organization_id: string | null;
          role: UserRole;
          name: string;
          phone: string | null;
          email: string | null;
          profile_image_url: string | null;
          current_streak: number;
          best_streak: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          role: UserRole;
          name: string;
          phone?: string | null;
          email?: string | null;
          profile_image_url?: string | null;
          current_streak?: number;
          best_streak?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          company: string | null;
          job_title: string | null;
          address: string | null;
          grade: CustomerGrade;
          region_tag: string | null;
          latitude: number | null;
          longitude: number | null;
          source: string | null;
          profile_image_url: string | null;
          memo: string | null;
          contract_date: string | null;
          birthday: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          company?: string | null;
          job_title?: string | null;
          address?: string | null;
          grade?: CustomerGrade;
          region_tag?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          source?: string | null;
          profile_image_url?: string | null;
          memo?: string | null;
          contract_date?: string | null;
          birthday?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string | null;
          organization_id: string;
          activity_type: ActivityType;
          status: ActivityStatus | null;
          duration_seconds: number | null;
          mood: ActivityMood | null;
          note: string | null;
          source: string | null;
          activity_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_id?: string | null;
          organization_id: string;
          activity_type: ActivityType;
          status?: ActivityStatus | null;
          duration_seconds?: number | null;
          mood?: ActivityMood | null;
          note?: string | null;
          source?: string | null;
          activity_date?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>;
      };
      pipeline_cards: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string;
          month_key: string;
          stage: PipelineStage;
          sort_order: number;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_id: string;
          month_key: string;
          stage?: PipelineStage;
          sort_order?: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pipeline_cards']['Insert']>;
      };
      golden_time_rules: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string | null;
          rule_type: GoldenTimeRuleType;
          trigger_date: string | null;
          recurrence: string | null;
          days_before: number;
          message_template: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_id?: string | null;
          rule_type: GoldenTimeRuleType;
          trigger_date?: string | null;
          recurrence?: string | null;
          days_before?: number;
          message_template?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['golden_time_rules']['Insert']>;
      };
    };
    Views: {
      manager_activity_stats: {
        Row: {
          organization_id: string;
          user_id: string;
          salesperson_name: string;
          activity_date: string;
          activity_type: ActivityType;
          count: number;
          completed_count: number;
        };
      };
    };
  };
}

// 편의 타입 alias
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
export type PipelineCard = Database['public']['Tables']['pipeline_cards']['Row'];
export type GoldenTimeRule = Database['public']['Tables']['golden_time_rules']['Row'];
export type ManagerActivityStats = Database['public']['Views']['manager_activity_stats']['Row'];
