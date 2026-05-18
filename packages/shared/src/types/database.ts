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

export type TeamEventType =
  | 'training'
  | 'workshop'
  | 'meeting'
  | 'external'
  | 'meal'
  | 'announcement'
  | 'campaign'
  | 'other';

export type CampaignMetric =
  | 'contracts'   // 신규 계약 건수
  | 'meetings'    // 미팅 건수
  | 'ta_calls'    // 통화 건수
  | 'amount_won'  // 거래 금액 (V2)
  | 'custom';     // 수동 갱신

export type ResourceCategory =
  | 'training'    // 교육 자료
  | 'sales_doc'   // 영업 자료 (제안서 등)
  | 'contract'    // 약관·계약서
  | 'notice'      // 공지
  | 'script'      // 스크립트
  | 'general';    // 일반

// ============================================
// Row 타입 (DB SELECT 결과)
// ============================================

export interface OrganizationRow {
  id: string;
  name: string;
  industry: string | null;
  subscription_plan: string;
  subscription_expires_at: string | null;
  daily_ta_goal: number;
  daily_meeting_goal: number;
  invite_code: string | null;
  created_at: string;
}

export interface UserRow {
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
}

export interface CustomerRow {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  address: string | null;
  home_address: string | null;
  contract_address: string | null;
  grade: CustomerGrade;
  region_tag: string | null;
  latitude: number | null;
  longitude: number | null;
  home_latitude: number | null;
  home_longitude: number | null;
  contract_latitude: number | null;
  contract_longitude: number | null;
  source: string | null;
  profile_image_url: string | null;
  memo: string | null;
  contract_date: string | null;
  birthday: string | null;
  // 영업 인텔리전스 필드
  anniversary: string | null;
  children: ChildInfo[] | null;
  hobbies: string[] | null;
  referrer_id: string | null;
  next_action_text: string | null;
  next_action_date: string | null;
  last_contact_at: string | null;
  preferred_contact_time: string | null;
  preferred_contact_method: string | null;
  competitor_product: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChildInfo {
  name: string;
  birth_year?: number;
  school?: string;
}

export interface ActivityLogRow {
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
}

export interface PipelineCardRow {
  id: string;
  user_id: string;
  customer_id: string;
  month_key: string;
  stage: PipelineStage;
  sort_order: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoldenTimeRuleRow {
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
}

export interface OrganizationMembershipRow {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  status: 'active' | 'left' | 'removed';
  joined_at: string;
  left_at: string | null;
  invited_by: string | null;
  exit_reason: string | null;
}

export interface JoinRequestRow {
  id: string;
  user_id: string;
  organization_id: string;
  invite_code: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
}

export interface TeamEventRow {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  event_date: string;
  event_time: string | null;
  is_all_day: boolean;
  event_type: TeamEventType;
  description: string | null;
  // 시책 전용
  start_date: string | null;
  end_date: string | null;
  target_value: number | null;
  target_metric: CampaignMetric | null;
  created_at: string;
  updated_at: string;
}

export interface ManagerActivityStatsRow {
  organization_id: string;
  user_id: string;
  salesperson_name: string;
  activity_date: string;
  activity_type: ActivityType;
  count: number;
  completed_count: number;
}

// ============================================
// Supabase Database 타입 — 명시적 Insert/Update 분리
// ============================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow;
        Insert: Omit<OrganizationRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<OrganizationRow>;
        Relationships: [];
      };
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, 'created_at' | 'current_streak' | 'best_streak' | 'is_active'> & {
          created_at?: string;
          current_streak?: number;
          best_streak?: number;
          is_active?: boolean;
        };
        Update: Partial<UserRow>;
        Relationships: [];
      };
      customers: {
        Row: CustomerRow;
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          company?: string | null;
          job_title?: string | null;
          address?: string | null;
          home_address?: string | null;
          contract_address?: string | null;
          home_latitude?: number | null;
          home_longitude?: number | null;
          contract_latitude?: number | null;
          contract_longitude?: number | null;
          grade?: CustomerGrade;
          region_tag?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          source?: string | null;
          profile_image_url?: string | null;
          memo?: string | null;
          contract_date?: string | null;
          birthday?: string | null;
          anniversary?: string | null;
          children?: ChildInfo[] | null;
          hobbies?: string[] | null;
          referrer_id?: string | null;
          next_action_text?: string | null;
          next_action_date?: string | null;
          last_contact_at?: string | null;
          preferred_contact_time?: string | null;
          preferred_contact_method?: string | null;
          competitor_product?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CustomerRow>;
        Relationships: [];
      };
      activity_logs: {
        Row: ActivityLogRow;
        Insert: Omit<ActivityLogRow, 'id' | 'created_at' | 'activity_date'> & {
          id?: string;
          activity_date?: string;
          created_at?: string;
        };
        Update: Partial<ActivityLogRow>;
        Relationships: [];
      };
      pipeline_cards: {
        Row: PipelineCardRow;
        Insert: Omit<PipelineCardRow, 'id' | 'created_at' | 'updated_at' | 'stage' | 'sort_order'> & {
          id?: string;
          stage?: PipelineStage;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PipelineCardRow>;
        Relationships: [];
      };
      golden_time_rules: {
        Row: GoldenTimeRuleRow;
        Insert: Omit<GoldenTimeRuleRow, 'id' | 'created_at' | 'is_active' | 'days_before'> & {
          id?: string;
          is_active?: boolean;
          days_before?: number;
          created_at?: string;
        };
        Update: Partial<GoldenTimeRuleRow>;
        Relationships: [];
      };
      team_events: {
        Row: TeamEventRow;
        Insert: {
          id?: string;
          organization_id: string;
          created_by: string;
          title: string;
          event_date: string;
          event_time?: string | null;
          is_all_day?: boolean;
          event_type: TeamEventType;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          target_value?: number | null;
          target_metric?: CampaignMetric | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<TeamEventRow>;
        Relationships: [];
      };
    };
    Views: {
      manager_activity_stats: {
        Row: ManagerActivityStatsRow;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ============================================
// 편의 alias
// ============================================

export type Organization = OrganizationRow;
export type User = UserRow;
export type Customer = CustomerRow;
export type ActivityLog = ActivityLogRow;
export type PipelineCard = PipelineCardRow;
export type GoldenTimeRule = GoldenTimeRuleRow;
export type ManagerActivityStats = ManagerActivityStatsRow;
export type TeamEvent = TeamEventRow;
export type TeamEventInsert = Database['public']['Tables']['team_events']['Insert'];
export type TeamEventUpdate = Database['public']['Tables']['team_events']['Update'];

export type OrganizationMembership = OrganizationMembershipRow;
export type JoinRequest = JoinRequestRow;

export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
export type CustomerUpdate = Database['public']['Tables']['customers']['Update'];
export type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];
export type PipelineCardInsert = Database['public']['Tables']['pipeline_cards']['Insert'];
