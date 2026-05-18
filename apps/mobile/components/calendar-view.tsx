import { Ionicons } from '@expo/vector-icons';
import {
  buildMonthGrid,
  ensureHolidayGreetings,
  formatMonthKeyKorean,
  listMonthlyEvents,
  shiftMonthKey,
  teamEventTypeIcon,
  WEEKDAY_KO,
  type CalendarEvent,
  type CalendarScope,
  type CustomerGrade,
  type TeamEventType,
} from '@metsystem/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GradeColor, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { EventAddSheet } from '@/components/event-add-sheet';
import { QuickEventAdd } from '@/components/quick-event-add';
import { TeamEventAdd } from '@/components/team-event-add';

interface Props {
  monthKey: string;
  onMonthChange: (next: string) => void;
}

type ScopeFilter = 'all' | 'personal' | 'team';

const KIND_COLOR: Record<string, string> = {
  ta_call: Palette.blue,
  meeting: Palette.green,
  contract: Palette.orange,
  golden_time: Palette.red,
  memo: Palette.textMuted,
  message: Palette.textMuted,
  holiday: Palette.red,
  team_event: '#8B5CF6', // 보라 — 팀 일정 전용
  birthday: '#EC4899', // 핫핑크
  anniversary: '#F472B6', // 라이트핑크
  contract_anniversary: Palette.orange,
  next_action: Palette.primary,
};

const SCOPE_TABS: { key: ScopeFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'personal', label: '내 일정' },
  { key: 'team', label: '팀 일정' },
];

export function CalendarView({ monthKey, onMonthChange }: Props) {
  const { authUser, profile } = useAuth();
  const isManager = profile?.role === 'manager' || profile?.role === 'owner';

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [teamAddOpen, setTeamAddOpen] = useState(false);
  const [eventAddOpen, setEventAddOpen] = useState(false);
  const router = useRouter();
  const [fabExpanded, setFabExpanded] = useState(false);
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [gradeFilter, setGradeFilter] = useState<CustomerGrade | null>(null);

  // 월 그리드 (6주 × 7일)
  const grid = useMemo(() => buildMonthGrid(monthKey), [monthKey]);

  // 토글에 따라 필터 (공휴일·팀일정은 등급 무관, 항상 표시)
  const visibleEvents = useMemo(() => {
    return events.filter((e) => {
      // 범위 필터
      if (scope !== 'all') {
        if (e.scope === 'holiday') {
          // 공휴일은 항상 표시
        } else if (scope === 'personal' && e.scope !== 'personal') return false;
        else if (scope === 'team' && e.scope !== 'team') return false;
      }

      // 등급 필터 — 고객 연결된 이벤트만 적용
      if (gradeFilter) {
        // 공휴일/팀일정은 등급 무관이라 통과
        if (e.scope === 'holiday' || e.scope === 'team') return true;
        const g = e.meta?.customer_grade as string | null | undefined;
        // 고객 없는 개인 일정 (e.g. 메모) 은 등급 필터 시 숨김
        if (!g) return false;
        if (g !== gradeFilter) return false;
      }
      return true;
    });
  }, [events, scope, gradeFilter]);

  // 날짜별 이벤트 인덱스
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    visibleEvents.forEach((e) => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [visibleEvents]);

  const reloadEvents = useCallback(() => {
    if (!authUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    listMonthlyEvents(supabase, authUser.id, monthKey)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setIsLoading(false));
  }, [authUser, monthKey]);

  useEffect(() => {
    reloadEvents();
  }, [reloadEvents]);

  // 캘린더 진입 시 한 번 명절 D-2 골든타임 룰 자동 생성 (idempotent)
  useEffect(() => {
    if (!authUser) return;
    void ensureHolidayGreetings(supabase, authUser.id).catch(() => {});
  }, [authUser]);

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  return (
    <View style={styles.container}>
      {/* 범위 토글 */}
      <View style={styles.scopeTabs}>
        {SCOPE_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.scopeTab, scope === t.key && styles.scopeTabActive]}
            onPress={() => setScope(t.key)}
            activeOpacity={0.7}>
            <Text
              style={[styles.scopeTabText, scope === t.key && styles.scopeTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 등급 필터 — 가로 칩 */}
      <View style={styles.gradeFilterRow}>
        <TouchableOpacity
          style={[styles.gradeChip, gradeFilter === null && styles.gradeChipActive]}
          onPress={() => setGradeFilter(null)}>
          <Text
            style={[
              styles.gradeChipText,
              gradeFilter === null && styles.gradeChipTextActive,
            ]}>
            전체
          </Text>
        </TouchableOpacity>
        {(['A', 'B', 'C', 'D'] as CustomerGrade[]).map((g) => {
          const color = GradeColor[g];
          const active = gradeFilter === g;
          return (
            <TouchableOpacity
              key={g}
              style={[
                styles.gradeChip,
                active && { backgroundColor: color.bg, borderColor: color.dot },
              ]}
              onPress={() => setGradeFilter(active ? null : g)}>
              <View style={[styles.gradeChipDot, { backgroundColor: color.dot }]} />
              <Text
                style={[
                  styles.gradeChipText,
                  active && { color: color.fg, fontWeight: '700' },
                ]}>
                {g}급
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 월 스위처 */}
      <View style={styles.monthBar}>
        <TouchableOpacity
          style={styles.monthBtn}
          onPress={() => onMonthChange(shiftMonthKey(monthKey, -1))}
          hitSlop={8}>
          <Ionicons name="chevron-back" size={16} color={Palette.textSub} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{formatMonthKeyKorean(monthKey)}</Text>
        <TouchableOpacity
          style={styles.monthBtn}
          onPress={() => onMonthChange(shiftMonthKey(monthKey, 1))}
          hitSlop={8}>
          <Ionicons name="chevron-forward" size={16} color={Palette.textSub} />
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_KO.map((w, i) => (
          <View key={w} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayLabel,
                i === 0 && { color: Palette.red },
                i === 6 && { color: Palette.blue },
              ]}>
              {w}
            </Text>
          </View>
        ))}
      </View>

      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={Palette.primary} />
        </View>
      )}

      {/* 6주 그리드 */}
      <View style={styles.grid}>
        {grid.map((row, wi) => (
          <View key={wi} style={styles.row}>
            {row.map((cell) => {
              const dayEvents = eventsByDate.get(cell.date) ?? [];
              const kindsInDay = new Set(dayEvents.map((e) => e.kind));
              const isSelected = selectedDate === cell.date;
              const holidayEvent = dayEvents.find((e) => e.kind === 'holiday');
              const isHoliday = !!holidayEvent;
              return (
                <TouchableOpacity
                  key={cell.date}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                  activeOpacity={0.6}
                  onPress={() => setSelectedDate(cell.date)}>
                  <View style={[styles.dayBubble, cell.isToday && styles.dayBubbleToday]}>
                    <Text
                      style={[
                        styles.dayText,
                        !cell.inMonth && styles.dayTextOut,
                        cell.weekday === 0 && cell.inMonth && { color: Palette.red },
                        cell.weekday === 6 && cell.inMonth && { color: Palette.blue },
                        isHoliday && cell.inMonth && { color: Palette.red },
                        cell.isToday && styles.dayTextToday,
                      ]}>
                      {cell.day}
                    </Text>
                  </View>
                  {isHoliday && cell.inMonth && (
                    <Text style={styles.holidayLabel} numberOfLines={1}>
                      {holidayEvent.label}
                    </Text>
                  )}
                  {/* 팀 이벤트 — 보라 라벨 + 아이콘으로 강조 */}
                  {dayEvents
                    .filter((e) => e.kind === 'team_event')
                    .slice(0, 1)
                    .map((te, i) => (
                      <View key={`te-${i}`} style={styles.teamBar}>
                        <Ionicons
                          name={
                            teamEventTypeIcon(
                              (te.meta?.event_type as TeamEventType) ?? 'other',
                            ) as keyof typeof Ionicons.glyphMap
                          }
                          size={8}
                          color="#FFFFFF"
                        />
                        <Text style={styles.teamBarText} numberOfLines={1}>
                          {te.label}
                        </Text>
                      </View>
                    ))}
                  {dayEvents.length > 0 && (
                    <View style={styles.dotsRow}>
                      {Array.from(kindsInDay)
                        .filter((k) => k !== 'holiday' && k !== 'team_event')
                        .slice(0, 4)
                        .map((kind, i) => (
                          <View
                            key={i}
                            style={[styles.dot, { backgroundColor: KIND_COLOR[kind] ?? Palette.textMuted }]}
                          />
                        ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* 범례 */}
      <View style={styles.legend}>
        <Legend color={Palette.blue} label="통화" />
        <Legend color={Palette.green} label="미팅" />
        <Legend color={Palette.orange} label="계약" />
        <Legend color={Palette.red} label="기념일·공휴일" />
        <Legend color="#8B5CF6" label="팀 일정" />
      </View>

      {/* FAB — 매니저면 확장 메뉴, 영업맨이면 바로 빠른 추가 */}
      {fabExpanded && isManager && (
        <Pressable
          style={styles.fabBackdrop}
          onPress={() => setFabExpanded(false)}
        />
      )}
      {fabExpanded && isManager && (
        <View style={styles.fabMenu}>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setFabExpanded(false);
              setTeamAddOpen(true);
            }}
            activeOpacity={0.85}>
            <View style={[styles.fabMenuIcon, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="people" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.fabMenuText}>팀 일정 추가</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setFabExpanded(false);
              setQuickAddOpen(true);
            }}
            activeOpacity={0.85}>
            <View style={[styles.fabMenuIcon, { backgroundColor: Palette.primary }]}>
              <Ionicons name="person" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.fabMenuText}>내 일정 추가</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (isManager) setFabExpanded((s) => !s);
          else setQuickAddOpen(true);
        }}
        activeOpacity={0.85}>
        <Ionicons
          name={fabExpanded && isManager ? 'close' : 'add'}
          size={24}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <QuickEventAdd
        visible={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdded={reloadEvents}
      />

      <TeamEventAdd
        visible={teamAddOpen}
        onClose={() => setTeamAddOpen(false)}
        onAdded={reloadEvents}
        defaultDate={selectedDate ?? undefined}
      />

      <EventAddSheet
        visible={eventAddOpen}
        onClose={() => setEventAddOpen(false)}
        onAdded={reloadEvents}
        defaultDate={selectedDate ?? undefined}
      />

      {/* 날짜 상세 시트 */}
      <Modal
        visible={selectedDate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDate(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSelectedDate(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>
              {selectedDate && formatDateKorean(selectedDate)}
            </Text>
            {selectedEvents.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <View style={styles.sheetEmptyIcon}>
                  <Ionicons name="calendar-outline" size={22} color={Palette.textMuted} />
                </View>
                <Text style={styles.sheetEmptyText}>이날 활동이 없어요</Text>
                <Text style={styles.sheetEmptySub}>
                  활동을 기록하면 여기에 표시돼요
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                {selectedEvents.map((ev, i) => {
                  const custId = ev.meta?.customer_id ? String(ev.meta.customer_id) : null;
                  const RowWrap = custId ? TouchableOpacity : View;
                  return (
                    <RowWrap
                      key={i}
                      style={styles.eventRow}
                      activeOpacity={0.7}
                      onPress={
                        custId
                          ? () => {
                              setSelectedDate(null);
                              router.push({
                                pathname: '/customer/[id]',
                                params: { id: custId },
                              });
                            }
                          : undefined
                      }>
                      <View
                        style={[
                          styles.eventIcon,
                          { backgroundColor: (KIND_COLOR[ev.kind] ?? Palette.gray) + '20' },
                        ]}>
                        <Ionicons
                          name={iconForKind(ev.kind)}
                          size={16}
                          color={KIND_COLOR[ev.kind] ?? Palette.gray}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventLabel}>{ev.label}</Text>
                        {ev.meta?.note ? (
                          <Text style={styles.eventNote} numberOfLines={2}>
                            {String(ev.meta.note)}
                          </Text>
                        ) : null}
                      </View>
                      {custId && (
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={Palette.textMuted}
                        />
                      )}
                    </RowWrap>
                  );
                })}
              </ScrollView>
            )}

            {/* 이날 일정 추가 — 핵심 액션 */}
            <TouchableOpacity
              style={styles.addEventBtn}
              onPress={() => setEventAddOpen(true)}
              activeOpacity={0.85}>
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.addEventBtnText}>이날 일정 추가</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedDate(null)}
              activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function iconForKind(kind: string): keyof typeof Ionicons.glyphMap {
  if (kind === 'ta_call') return 'call-outline';
  if (kind === 'meeting') return 'people-outline';
  if (kind === 'contract') return 'trophy-outline';
  if (kind === 'golden_time') return 'gift-outline';
  if (kind === 'memo') return 'document-text-outline';
  if (kind === 'birthday') return 'gift';
  if (kind === 'anniversary') return 'heart';
  if (kind === 'contract_anniversary') return 'ribbon-outline';
  if (kind === 'next_action') return 'flag';
  return 'ellipse-outline';
}

function formatDateKorean(date: string): string {
  const [y, m, d] = date.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
  return `${Number(m)}월 ${Number(d)}일 (${weekday})`;
}

const styles = StyleSheet.create({
  container: { backgroundColor: Palette.card, paddingBottom: 16 },

  monthBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  monthBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.grayBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: { fontSize: 15, fontWeight: '700', color: Palette.textMain },

  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  weekdayLabel: { fontSize: 11, fontWeight: '600', color: Palette.textSub },

  loading: { paddingVertical: 16, alignItems: 'center' },

  grid: { paddingHorizontal: 4 },
  row: { flexDirection: 'row' },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    paddingTop: 6,
    borderRadius: 10,
    margin: 2,
  },
  cellSelected: { backgroundColor: Palette.primarySoft },
  dayBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBubbleToday: { backgroundColor: Palette.primary },
  dayText: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  dayTextOut: { color: Palette.borderStrong },
  dayTextToday: { color: '#FFFFFF', fontWeight: '700' },

  scopeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 6,
  },
  scopeTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
  },
  scopeTabActive: { backgroundColor: Palette.textMain },
  scopeTabText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },
  scopeTabTextActive: { color: '#FFFFFF' },

  gradeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 5,
  },
  gradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gradeChipActive: { backgroundColor: Palette.textMain },
  gradeChipDot: { width: 5, height: 5, borderRadius: 3 },
  gradeChipText: { fontSize: 11, fontWeight: '600', color: Palette.textSub },
  gradeChipTextActive: { color: '#FFFFFF' },

  holidayLabel: {
    fontSize: 9,
    color: Palette.red,
    fontWeight: '600',
    marginTop: 2,
    paddingHorizontal: 2,
    textAlign: 'center',
  },

  teamBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginTop: 2,
    marginHorizontal: 2,
    maxWidth: '90%',
  },
  teamBarText: { fontSize: 8, color: '#FFFFFF', fontWeight: '700', flex: 1 },

  fabBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  fabMenu: {
    position: 'absolute',
    bottom: 88,
    right: 20,
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: '#191F28',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    minWidth: 180,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  fabMenuIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabMenuText: { fontSize: 14, color: Palette.textMain, fontWeight: '600' },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    minHeight: 6,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Palette.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 11, color: Palette.textSub, fontWeight: '500' },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.borderStrong,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Palette.textMain, marginBottom: 12 },
  sheetEmpty: { alignItems: 'center', paddingVertical: 32 },
  sheetEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.grayBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetEmptyText: { fontSize: 14, fontWeight: '600', color: Palette.textMain },
  sheetEmptySub: { fontSize: 12, color: Palette.textSub, marginTop: 4 },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventLabel: { fontSize: 14, fontWeight: '600', color: Palette.textMain },
  eventNote: { fontSize: 12, color: Palette.textSub, marginTop: 2 },

  addEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: Palette.primary,
    paddingVertical: 13,
    borderRadius: Radius.md,
  },
  addEventBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  closeBtn: {
    marginTop: 8,
    backgroundColor: Palette.grayBg,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '600', color: Palette.textMain },
});
