import type { MetSupabaseClient } from '../supabase/client';
import type {
  TeamEvent,
  TeamEventInsert,
  TeamEventType,
  TeamEventUpdate,
} from '../types/database';

/** 특정 월의 팀 이벤트 목록 */
export async function listMonthlyTeamEvents(
  supabase: MetSupabaseClient,
  monthKey: string,
): Promise<TeamEvent[]> {
  const [year, monthRaw] = monthKey.split('-');
  if (!year || !monthRaw) return [];
  const month = Number(monthRaw);
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Number(year), month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('team_events')
    .select('*')
    .gte('event_date', monthStart)
    .lte('event_date', monthEnd)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true, nullsFirst: false });
  if (error) {
    console.warn('[listMonthlyTeamEvents] failed', error);
    return [];
  }
  return (data ?? []) as TeamEvent[];
}

/** 팀 이벤트 추가 */
export async function createTeamEvent(
  supabase: MetSupabaseClient,
  input: TeamEventInsert,
): Promise<TeamEvent> {
  const { data, error } = await supabase
    .from('team_events')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(input as any)
    .select('*')
    .single();
  if (error) throw error;
  return data as TeamEvent;
}

/** 팀 이벤트 수정 */
export async function updateTeamEvent(
  supabase: MetSupabaseClient,
  id: string,
  patch: TeamEventUpdate,
): Promise<TeamEvent> {
  const { data, error } = await supabase
    .from('team_events')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ ...patch, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as TeamEvent;
}

/** 팀 이벤트 삭제 */
export async function deleteTeamEvent(
  supabase: MetSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('team_events').delete().eq('id', id);
  if (error) throw error;
}

/** 카테고리 라벨 */
export function teamEventTypeLabel(t: TeamEventType): string {
  return (
    {
      training: '교육',
      workshop: '워크샵',
      meeting: '회의',
      external: '외부 미팅',
      meal: '회식',
      announcement: '공지',
      other: '기타',
    } as Record<TeamEventType, string>
  )[t] ?? '기타';
}

/** 카테고리 아이콘 (Ionicons name) */
export function teamEventTypeIcon(t: TeamEventType): string {
  return (
    {
      training: 'school-outline',
      workshop: 'construct-outline',
      meeting: 'people-outline',
      external: 'briefcase-outline',
      meal: 'restaurant-outline',
      announcement: 'megaphone-outline',
      other: 'ellipse-outline',
    } as Record<TeamEventType, string>
  )[t] ?? 'ellipse-outline';
}

export const TEAM_EVENT_TYPES: TeamEventType[] = [
  'meeting',
  'training',
  'workshop',
  'external',
  'meal',
  'announcement',
  'other',
];
