import type { CustomerGrade } from './database';

export type TemplateCategory = 'ta_script' | 'kakao_greeting' | 'holiday' | 'anniversary';
export type TemplateSituation =
  | 'nearby_visit'
  | 'long_untouched'
  | 'cold_call'
  | 'anniversary'
  | 'holiday'
  | 'follow_up';

export interface MessageTemplate {
  id: string;
  organization_id: string | null;
  category: TemplateCategory | string;
  target_grade: CustomerGrade | null;
  situation: TemplateSituation | string | null;
  title: string | null;
  body_template: string;
  tone: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ScriptContext {
  customer_name: string;
  title: string; // '대표님', '형님' 등
  region: string; // 현재 영업맨 위치 ('판교', '강남')
  last_meeting_days?: number;
}
