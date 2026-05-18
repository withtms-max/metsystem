import { Ionicons } from '@expo/vector-icons';
import {
  currentMonthKey,
  formatMonthKeyKorean,
  listActivities,
  startCall,
  type ActivityLog,
  type Customer,
  type CustomerGrade,
} from '@metsystem/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CallSheet } from '@/components/call-sheet';
import { useAuth } from '@/lib/auth-context';
import { useCustomers } from '@/hooks/use-customers';
import { usePipeline } from '@/hooks/use-pipeline';
import { supabase } from '@/lib/supabase';
import { GradeColor, Palette, Radius, Shadow } from '@/constants/theme';

type Tab = 'overview' | 'activity' | 'performance' | 'files';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: '개요' },
  { key: 'activity', label: '활동 이력' },
  { key: 'performance', label: '성과' },
  { key: 'files', label: '파일' },
];

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { authUser, profile } = useAuth();
  const { customers, update, isLoading } = useCustomers();
  const monthKey = currentMonthKey();
  const { cards, add: addToPipeline } = usePipeline(monthKey);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  const customer: Customer | undefined = customers.find((c) => c.id === id);
  const alreadyInPipeline = cards.some((c) => c.customer_id === id);
  const myCard = cards.find((c) => c.customer_id === id);

  useEffect(() => {
    if (!id) return;
    void listActivities(supabase, { customerId: id }).then(setActivities).catch(() => {});
  }, [id]);

  if (isLoading && !customer) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Palette.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Palette.textMain} />
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>고객을 찾을 수 없어요</Text>
        </View>
      </SafeAreaView>
    );
  }

  const grade = GradeColor[customer.grade];

  const handleCall = async () => {
    if (!customer.phone || !authUser || !profile?.organization_id) return;
    try {
      const { logId, telUrl } = await startCall(supabase, {
        userId: authUser.id,
        organizationId: profile.organization_id,
        customerId: customer.id,
        phone: customer.phone,
      });
      // 모바일/web 둘 다 tel: 호출 시도 (web 데스크톱은 실패해도 로그는 남음)
      Linking.openURL(telUrl).catch(() => {});
      setCallLogId(logId);
    } catch (e) {
      console.warn('[call] start failed', e);
      Linking.openURL(`tel:${customer.phone}`).catch(() => {});
    }
  };

  const reloadActivities = () => {
    if (!id) return;
    void listActivities(supabase, { customerId: id }).then(setActivities).catch(() => {});
  };

  const handleAddToPipeline = async () => {
    if (!authUser || alreadyInPipeline) return;
    setPipelineLoading(true);
    try {
      await addToPipeline({
        user_id: authUser.id,
        customer_id: customer.id,
        month_key: monthKey,
        stage: 'ta_target',
        note: null,
      });
      Alert.alert(
        '추가 완료',
        `${customer.name}님을 ${formatMonthKeyKorean(monthKey)} 영업판에 추가했어요.`,
      );
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '추가 실패');
    } finally {
      setPipelineLoading(false);
    }
  };

  const handleGradeChange = async (g: CustomerGrade) => {
    try {
      await update(customer.id, { grade: g });
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '수정 실패');
    }
  };

  const stageLabel: Record<string, string> = {
    ta_target: '통화 예정',
    ta_done: '통화 완료',
    meeting_scheduled: '미팅 예정',
    meeting_done: '미팅 완료',
    contract: '계약',
    on_hold: '보류',
  };

  return (
    <View style={styles.container}>
      {/* Teal 헤더 */}
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.headerTopBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{customer.company ?? customer.name}</Text>
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: '/customer/[id]/edit', params: { id: customer.id } })
            }>
            <Text style={styles.headerEditBtn}>수정</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerMeta}>
          <View style={[styles.gradeChip, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <View style={[styles.gradeDot, { backgroundColor: grade.dot }]} />
            <Text style={styles.gradeChipText}>{customer.grade}등급</Text>
          </View>
          {myCard && (
            <Text style={styles.headerStatus}>· {stageLabel[myCard.stage] ?? myCard.stage}</Text>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity>
            <Ionicons name="star-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 탭 메뉴 */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'overview' && (
          <>
            {/* 기본 정보 카드 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>기본 정보</Text>
              <InfoRow label="담당자" value={customer.name + (customer.job_title ? ` ${customer.job_title}` : '')} />
              <InfoRow label="연락처" value={customer.phone} />
              <InfoRow label="이메일" value={customer.email} />
              <InfoRow label="회사" value={customer.company} />
              <InfoRow label="지역" value={customer.region_tag} />
              <InfoRow label="주소" value={customer.address} />
            </View>

            {/* 진행 현황 카드 */}
            {myCard && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>진행 현황</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>단계</Text>
                  <Text style={styles.rowValue}>{stageLabel[myCard.stage] ?? myCard.stage}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>해당 월</Text>
                  <Text style={styles.rowValue}>{formatMonthKeyKorean(myCard.month_key)}</Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${stageProgress(myCard.stage)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercent}>{stageProgress(myCard.stage)}%</Text>
              </View>
            )}

            {/* 생명수 추가 */}
            {!alreadyInPipeline && (
              <TouchableOpacity
                style={styles.pipelineBtn}
                onPress={handleAddToPipeline}
                disabled={pipelineLoading}>
                {pipelineLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.pipelineBtnText}>
                      {formatMonthKeyKorean(monthKey)} 영업판에 추가 (통화 예정)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* 등급 변경 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>등급</Text>
              <View style={styles.gradeRow}>
                {(['A', 'B', 'C', 'D'] as CustomerGrade[]).map((g) => {
                  const c = GradeColor[g];
                  const active = customer.grade === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => handleGradeChange(g)}
                      style={[
                        styles.gradeBtn,
                        active && { backgroundColor: c.bg, borderColor: c.dot },
                      ]}>
                      <Text
                        style={[
                          styles.gradeBtnText,
                          active && { color: c.fg, fontWeight: '700' },
                        ]}>
                        {g}등급
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 다음 액션 — 진하게 강조 */}
            {customer.next_action_text && (
              <View style={[styles.card, { borderColor: Palette.primary, borderWidth: 1.5 }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>🎯 다음에 할 일</Text>
                  {customer.next_action_date && (
                    <Text style={{ fontSize: 12, color: Palette.primary, fontWeight: '700' }}>
                      {customer.next_action_date}
                    </Text>
                  )}
                </View>
                <Text style={[styles.memo, { color: Palette.primaryDeep, fontWeight: '600' }]}>
                  {customer.next_action_text}
                </Text>
              </View>
            )}

            {/* 기념일 카드 */}
            {(customer.birthday || customer.anniversary || customer.contract_date) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🎂 기념일 (매년 자동 알림)</Text>
                {customer.birthday && <InfoRow label="생일" value={customer.birthday} />}
                {customer.anniversary && (
                  <InfoRow label="결혼기념일" value={customer.anniversary} />
                )}
                {customer.contract_date && (
                  <InfoRow label="계약기념일" value={customer.contract_date} />
                )}
              </View>
            )}

            {/* 라포 정보 */}
            {(customer.hobbies?.length || customer.preferred_contact_time || customer.preferred_contact_method) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>💬 라포 정보</Text>
                {customer.hobbies && customer.hobbies.length > 0 && (
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>취미·관심사</Text>
                    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {customer.hobbies.map((h) => (
                        <View key={h} style={styles.tagChip}>
                          <Text style={styles.tagText}>#{h}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {customer.preferred_contact_time && (
                  <InfoRow label="선호 시간" value={customer.preferred_contact_time} />
                )}
                {customer.preferred_contact_method && (
                  <InfoRow label="선호 방법" value={customer.preferred_contact_method} />
                )}
              </View>
            )}

            {/* 메모 */}
            {customer.memo && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>메모</Text>
                <Text style={styles.memo}>{customer.memo}</Text>
              </View>
            )}

            {/* 최근 활동 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>최근 활동</Text>
              {activities.length === 0 ? (
                <Text style={styles.emptyMini}>아직 활동 기록이 없어요</Text>
              ) : (
                activities.slice(0, 5).map((a, i) => (
                  <View key={a.id} style={[styles.activityRow, i > 0 && styles.activityDivider]}>
                    <View style={styles.activityIcon}>
                      <Ionicons name={activityIcon(a.activity_type)} size={14} color={Palette.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityDate}>{a.activity_date}</Text>
                      <Text style={styles.activityType}>{activityLabel(a.activity_type)}</Text>
                      {a.note && (
                        <Text style={styles.activityNote} numberOfLines={2}>
                          {a.note}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {tab === 'activity' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>활동 이력 ({activities.length})</Text>
            {activities.length === 0 ? (
              <Text style={styles.emptyMini}>아직 활동 기록이 없어요</Text>
            ) : (
              activities.map((a, i) => (
                <View key={a.id} style={[styles.activityRow, i > 0 && styles.activityDivider]}>
                  <View style={styles.activityIcon}>
                    <Ionicons name={activityIcon(a.activity_type)} size={14} color={Palette.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityDate}>{a.activity_date}</Text>
                    <Text style={styles.activityType}>{activityLabel(a.activity_type)}</Text>
                    {a.note && <Text style={styles.activityNote}>{a.note}</Text>}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {tab === 'performance' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>성과</Text>
            <Text style={styles.emptyMini}>성과 분석은 다음 업데이트에 추가됩니다</Text>
          </View>
        )}

        {tab === 'files' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>파일</Text>
            <Text style={styles.emptyMini}>첨부 파일 기능은 Sprint 3에 추가됩니다</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 하단 액션 바 (sticky) */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomBtn} onPress={handleCall} disabled={!customer.phone}>
          <Ionicons name="call-outline" size={18} color={Palette.textMain} />
          <Text style={styles.bottomBtnText}>전화</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomBtn}>
          <Ionicons name="mail-outline" size={18} color={Palette.textMain} />
          <Text style={styles.bottomBtnText}>이메일</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomBtn}>
          <Ionicons name="calendar-outline" size={18} color={Palette.textMain} />
          <Text style={styles.bottomBtnText}>미팅</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomBtn, styles.bottomBtnPrimary]}>
          <Text style={styles.bottomBtnPrimaryText}>메모 작성</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* 통화 후 메모 시트 — 자동으로 뜸 */}
      <CallSheet
        callLogId={callLogId}
        customer={customer}
        onClose={() => setCallLogId(null)}
        onSaved={reloadActivities}
      />
    </View>
  );
}

function stageProgress(stage: string): number {
  const map: Record<string, number> = {
    ta_target: 10,
    ta_done: 25,
    meeting_scheduled: 50,
    meeting_done: 75,
    contract: 100,
    on_hold: 40,
  };
  return map[stage] ?? 0;
}

function activityIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'ta_call') return 'call-outline';
  if (type === 'meeting') return 'people-outline';
  if (type === 'memo') return 'document-text-outline';
  if (type === 'message') return 'chatbubble-outline';
  if (type === 'contract') return 'trophy-outline';
  return 'ellipse-outline';
}

function activityLabel(type: string): string {
  return (
    {
      ta_call: '통화',
      meeting: '미팅',
      memo: '메모',
      message: '메시지',
      contract: '계약',
    } as Record<string, string>
  )[type] ?? type;
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },

  // Header
  headerWrap: { backgroundColor: Palette.primary, paddingBottom: 16 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerEditBtn: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  headerStatus: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: Palette.primary },
  tabLabel: { fontSize: 13, fontWeight: '500', color: Palette.textSub },
  tabLabelActive: { color: Palette.primary, fontWeight: '700' },

  scroll: { padding: 16, paddingBottom: 24 },

  // Cards
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 12,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Palette.textMain, marginBottom: 12 },

  row: { flexDirection: 'row', paddingVertical: 6 },
  rowLabel: { width: 70, color: Palette.textSub, fontSize: 13 },
  rowValue: { flex: 1, color: Palette.textMain, fontSize: 14, fontWeight: '500' },

  progressBar: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Palette.primary, borderRadius: Radius.pill },
  progressPercent: {
    textAlign: 'right',
    marginTop: 6,
    fontSize: 12,
    color: Palette.textSub,
    fontWeight: '500',
  },

  // Grade
  gradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  gradeDot: { width: 6, height: 6, borderRadius: 3 },
  gradeChipText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  gradeRow: { flexDirection: 'row', gap: 8 },
  gradeBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Palette.bg,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  gradeBtnText: { fontWeight: '600', color: Palette.textSub, fontSize: 13 },

  // Pipeline button
  pipelineBtn: {
    backgroundColor: Palette.primary,
    paddingVertical: 14,
    borderRadius: Radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  pipelineBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // Memo
  memo: { fontSize: 14, color: Palette.textMain, lineHeight: 22 },
  emptyMini: { color: Palette.textMuted, fontSize: 13, paddingVertical: 8 },

  // Activities
  activityRow: { flexDirection: 'row', paddingVertical: 10, gap: 12 },
  activityDivider: { borderTopWidth: 1, borderTopColor: Palette.border },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityDate: { fontSize: 12, color: Palette.textMuted, fontWeight: '500' },
  activityType: { fontSize: 13, fontWeight: '600', color: Palette.textMain, marginTop: 2 },
  activityNote: { fontSize: 12, color: Palette.textSub, marginTop: 2 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Palette.bg,
    gap: 2,
  },
  bottomBtnText: { fontSize: 11, color: Palette.textMain, fontWeight: '600' },
  bottomBtnPrimary: { flex: 1.6, backgroundColor: Palette.primary, justifyContent: 'center' },
  bottomBtnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: Palette.textSub, fontWeight: '500' },
  tagChip: {
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  tagText: { fontSize: 11, color: Palette.primaryDeep, fontWeight: '700' },
});
