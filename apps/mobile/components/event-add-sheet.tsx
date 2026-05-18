import { Ionicons } from '@expo/vector-icons';
import { logActivity, type ActivityType, type Customer } from '@metsystem/shared';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GradeColor, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useCustomers } from '@/hooks/use-customers';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded?: () => void;
  /** YYYY-MM-DD — 클릭한 셀 날짜 자동 채움 */
  defaultDate?: string;
}

const TYPES: { type: ActivityType; label: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; color: string }[] = [
  { type: 'meeting', label: '미팅', icon: 'people-outline', color: Palette.green },
  { type: 'ta_call', label: '통화', icon: 'call-outline', color: Palette.blue },
  { type: 'memo', label: '메모', icon: 'document-text-outline', color: Palette.textSub },
  { type: 'message', label: '메시지', icon: 'chatbubble-outline', color: Palette.primary },
  { type: 'contract', label: '계약', icon: 'trophy-outline', color: Palette.orange },
];

/**
 * 일정 추가 — 캘린더 셀에서 호출.
 * - 본인만의 일정 (memo) 또는
 * - 고객 검색 후 선택 → 그 고객의 활동 로그로 저장
 */
export function EventAddSheet({ visible, onClose, onAdded, defaultDate }: Props) {
  const { authUser, profile } = useAuth();
  const { customers } = useCustomers();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate ?? today);
  const [time, setTime] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('meeting');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달 열릴 때마다 defaultDate 반영
  useEffect(() => {
    if (visible) {
      setDate(defaultDate ?? today);
      setError(null);
    }
  }, [visible, defaultDate, today]);

  // 고객 검색 매칭
  const customerMatches = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase().trim();
    return customers
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.phone?.replace(/-/g, '').includes(q.replace(/-/g, '')),
      )
      .slice(0, 8);
  }, [customerSearch, customers]);

  const reset = () => {
    setTitle('');
    setTime('');
    setActivityType('meeting');
    setCustomerSearch('');
    setSelectedCustomer(null);
    setShowCustomerList(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearch('');
    setShowCustomerList(false);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError('일정 제목을 적어주세요');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('날짜는 YYYY-MM-DD 형식 (예: 2026-05-25)');
      return;
    }
    if (time && !/^\d{2}:\d{2}$/.test(time)) {
      setError('시간은 HH:MM 형식 (예: 14:30)');
      return;
    }
    if (!authUser || !profile?.organization_id) {
      setError('로그인 정보가 필요해요');
      return;
    }

    setLoading(true);
    try {
      const noteWithTime = time ? `[${time}] ${title.trim()}` : title.trim();
      await logActivity(supabase, {
        user_id: authUser.id,
        organization_id: profile.organization_id,
        customer_id: selectedCustomer?.id ?? null,
        activity_type: activityType,
        status: 'scheduled',
        activity_date: date,
        note: noteWithTime,
        source: 'calendar',
        duration_seconds: null,
        mood: null,
      });
      reset();
      onAdded?.();
      onClose();
    } catch (e) {
      const err = e as { message?: string; details?: string };
      setError(err.message || err.details || '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <Text style={styles.title}>일정 추가</Text>
          <Text style={styles.subtitle}>고객 선택은 선택사항이에요 — 비워두면 내 개인 일정</Text>

          {/* 제목 */}
          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 한빛생명 사장님 미팅"
            placeholderTextColor={Palette.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          {/* 날짜 + 시간 */}
          <View style={styles.row}>
            <View style={{ flex: 1.5 }}>
              <Text style={styles.label}>날짜</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-05-25"
                placeholderTextColor={Palette.textMuted}
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>시간 (선택)</Text>
              <TextInput
                style={styles.input}
                placeholder="14:30"
                placeholderTextColor={Palette.textMuted}
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>

          {/* 타입 */}
          <Text style={styles.label}>분류</Text>
          <View style={styles.typeRow}>
            {TYPES.map((t) => {
              const active = activityType === t.type;
              return (
                <TouchableOpacity
                  key={t.type}
                  style={[
                    styles.typeChip,
                    active && { backgroundColor: t.color },
                  ]}
                  onPress={() => setActivityType(t.type)}
                  activeOpacity={0.75}>
                  <Ionicons
                    name={t.icon}
                    size={14}
                    color={active ? '#FFFFFF' : t.color}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      active && { color: '#FFFFFF' },
                    ]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 고객 (선택) */}
          <Text style={styles.label}>고객 연결 (선택)</Text>
          {selectedCustomer ? (
            <View style={styles.selectedCustomer}>
              <View
                style={[
                  styles.gradeDot,
                  { backgroundColor: GradeColor[selectedCustomer.grade].dot },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedName}>
                  {selectedCustomer.company ?? selectedCustomer.name}
                </Text>
                <Text style={styles.selectedSub}>
                  {selectedCustomer.name}
                  {selectedCustomer.job_title ? ` · ${selectedCustomer.job_title}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedCustomer(null)}
                hitSlop={6}>
                <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="이름·회사·전화로 검색 (비워두면 개인 일정)"
                placeholderTextColor={Palette.textMuted}
                value={customerSearch}
                onChangeText={(t) => {
                  setCustomerSearch(t);
                  setShowCustomerList(t.trim().length > 0);
                }}
                onFocus={() => setShowCustomerList(customerSearch.trim().length > 0)}
              />
              {showCustomerList && customerMatches.length > 0 && (
                <View style={styles.customerList}>
                  <FlatList
                    data={customerMatches}
                    keyExtractor={(c) => c.id}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 200 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.customerRow}
                        onPress={() => handlePickCustomer(item)}>
                        <View
                          style={[
                            styles.gradeDot,
                            { backgroundColor: GradeColor[item.grade].dot },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.customerName}>
                            {item.company ?? item.name}
                          </Text>
                          <Text style={styles.customerSub} numberOfLines={1}>
                            {item.name}
                            {item.phone ? ` · ${item.phone}` : ''}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
              {showCustomerList && customerSearch.trim() && customerMatches.length === 0 && (
                <Text style={styles.noMatch}>매칭되는 고객 없음 — 비워두고 등록하면 개인 일정</Text>
              )}
            </>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color={Palette.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>등록</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.borderStrong,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: Palette.textSub, marginTop: 4, marginBottom: 12 },

  label: { fontSize: 12, fontWeight: '700', color: Palette.textSub, marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.textMain,
  },

  row: { flexDirection: 'row', gap: 8 },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
  },
  typeChipText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },

  selectedCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.md,
    padding: 12,
  },
  selectedName: { fontSize: 14, fontWeight: '700', color: Palette.textMain },
  selectedSub: { fontSize: 11, color: Palette.textSub, marginTop: 2 },
  gradeDot: { width: 8, height: 8, borderRadius: 4 },

  customerList: {
    marginTop: 6,
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  customerName: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  customerSub: { fontSize: 11, color: Palette.textSub, marginTop: 2 },
  noMatch: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
    paddingHorizontal: 4,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 12,
  },
  errorText: { fontSize: 12, color: Palette.red, fontWeight: '500', flex: 1 },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Palette.textMain },
  submitBtn: {
    flex: 1.6,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
