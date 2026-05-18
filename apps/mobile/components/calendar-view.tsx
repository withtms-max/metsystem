import { Ionicons } from '@expo/vector-icons';
import {
  buildMonthGrid,
  ensureHolidayGreetings,
  formatMonthKeyKorean,
  listMonthlyEvents,
  shiftMonthKey,
  WEEKDAY_KO,
  type CalendarEvent,
} from '@metsystem/shared';
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
import { Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { QuickEventAdd } from '@/components/quick-event-add';

interface Props {
  monthKey: string;
  onMonthChange: (next: string) => void;
}

const KIND_COLOR: Record<string, string> = {
  ta_call: Palette.blue,
  meeting: Palette.green,
  contract: Palette.orange,
  golden_time: Palette.red,
  memo: Palette.textMuted,
  message: Palette.textMuted,
  holiday: Palette.red,
};

export function CalendarView({ monthKey, onMonthChange }: Props) {
  const { authUser } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // 월 그리드 (6주 × 7일)
  const grid = useMemo(() => buildMonthGrid(monthKey), [monthKey]);

  // 날짜별 이벤트 인덱스
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [events]);

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
                  {dayEvents.length > 0 && (
                    <View style={styles.dotsRow}>
                      {Array.from(kindsInDay)
                        .filter((k) => k !== 'holiday')
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
      </View>

      {/* FAB — 빠른 일정 추가 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setQuickAddOpen(true)}
        activeOpacity={0.85}>
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <QuickEventAdd
        visible={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdded={reloadEvents}
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
              <ScrollView style={{ maxHeight: 400 }}>
                {selectedEvents.map((ev, i) => (
                  <View key={i} style={styles.eventRow}>
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
                  </View>
                ))}
              </ScrollView>
            )}
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

  holidayLabel: {
    fontSize: 9,
    color: Palette.red,
    fontWeight: '600',
    marginTop: 2,
    paddingHorizontal: 2,
    textAlign: 'center',
  },
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

  closeBtn: {
    marginTop: 16,
    backgroundColor: Palette.grayBg,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '600', color: Palette.textMain },
});
