/**
 * 인앱 전화 — 영업맨이 앱 통해 전화 걸도록 유도해서 활동 로그를 정확히 잡음.
 *
 * 흐름:
 *   1. 영업맨이 고객 카드의 📞 클릭
 *   2. startCall() → tel: 링크 호출 + activity_log INSERT (status='in_progress')
 *   3. 사용자가 전화 끊고 앱 복귀 → "통화 잘 됐어요?" 모달
 *   4. completeCall() → activity_log UPDATE (status='completed' or 'cancelled', note, mood)
 *
 * 이렇게 하면 last_contact_at 트리거가 자동 갱신되고, 90일 무연락 알림이 정확해짐.
 */

import type { MetSupabaseClient } from '../supabase/client';

export interface StartCallInput {
  userId: string;
  organizationId: string;
  customerId: string;
  phone: string;
}

export interface CompleteCallInput {
  activityLogId: string;
  status: 'completed' | 'cancelled';
  note?: string;
  mood?: 'good' | 'neutral' | 'bad';
  durationSeconds?: number;
}

/**
 * 전화 걸기 시작 — activity_log INSERT.
 * 반환: 생성된 activity_log.id + tel: URL (호출자가 Linking.openURL 호출).
 *
 * shared 패키지는 react-native 의존성을 가질 수 없으므로,
 * tel: 호출은 호출 측 (mobile app) 에서 수행.
 */
export async function startCall(
  supabase: MetSupabaseClient,
  input: StartCallInput,
): Promise<{ logId: string; telUrl: string }> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: input.userId,
      organization_id: input.organizationId,
      customer_id: input.customerId,
      activity_type: 'ta_call',
      status: 'in_progress',
      activity_date: today,
      note: null,
      source: 'in_app_call',
      duration_seconds: null,
      mood: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .select('id')
    .single();

  if (error) throw error;

  const cleanedPhone = input.phone.replace(/[^0-9+]/g, '');
  return {
    logId: (data as { id: string }).id,
    telUrl: `tel:${cleanedPhone}`,
  };
}

/** 통화 완료 — 사후 메모 모달 결과 반영 */
export async function completeCall(
  supabase: MetSupabaseClient,
  input: CompleteCallInput,
): Promise<void> {
  const { error } = await supabase
    .from('activity_logs')
    .update({
      status: input.status,
      note: input.note ?? null,
      mood: input.mood ?? null,
      duration_seconds: input.durationSeconds ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .eq('id', input.activityLogId);

  if (error) throw error;
}

/**
 * 빠른 통화 로그 — 폰에서 직접 건 통화를 사후 1탭으로 기록.
 * 영업맨이 까먹기 전에 빨리 적용.
 */
export async function logQuickCall(
  supabase: MetSupabaseClient,
  input: {
    userId: string;
    organizationId: string;
    customerId: string;
    note?: string;
    mood?: 'good' | 'neutral' | 'bad';
  },
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('activity_logs').insert({
    user_id: input.userId,
    organization_id: input.organizationId,
    customer_id: input.customerId,
    activity_type: 'ta_call',
    status: 'completed',
    activity_date: today,
    note: input.note ?? '폰에서 직접 통화',
    source: 'quick_log',
    duration_seconds: null,
    mood: input.mood ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (error) throw error;
}
