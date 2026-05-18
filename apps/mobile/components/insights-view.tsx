import { Ionicons } from '@expo/vector-icons';
import {
  computeMonthInsights,
  formatMonthKeyKorean,
  type MonthInsights,
} from '@metsystem/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GradeColor, Palette, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Props {
  monthKey: string;
}

const ACTIVITY_META = {
  ta_call: { label: '통화', icon: 'call' as const, color: Palette.blue },
  meeting: { label: '미팅', icon: 'people' as const, color: Palette.green },
  memo: { label: '메모', icon: 'document-text' as const, color: Palette.textSub },
  message: { label: '메시지', icon: 'chatbubble' as const, color: Palette.primary },
  contract: { label: '계약', icon: 'trophy' as const, color: Palette.orange },
};

export function InsightsView({ monthKey }: Props) {
  const { authUser } = useAuth();
  const [insights, setInsights] = useState<MonthInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    setLoading(true);
    computeMonthInsights(supabase, authUser.id, monthKey)
      .then(setInsights)
      .catch((e) => {
        console.warn('[insights] failed', e);
        setInsights(null);
      })
      .finally(() => setLoading(false));
  }, [authUser, monthKey]);

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1 }]}>
        <ActivityIndicator size="large" color={Palette.primary} />
      </View>
    );
  }

  if (!insights) {
    return (
      <View style={[styles.center, { flex: 1 }]}>
        <Text style={styles.empty}>인사이트 불러오기 실패</Text>
      </View>
    );
  }

  const totalActivities = insights.activityCounts.reduce((s, a) => s + a.count, 0);
  const maxDaily = Math.max(...insights.dailyCounts.map((d) => d.count), 1);
  const totalCustomers = insights.gradeDistribution.reduce((s, g) => s + g.count, 0);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.headerLabel}>{formatMonthKeyKorean(monthKey)} 인사이트</Text>

      {/* KPI 4개 큰 카드 */}
      <View style={styles.kpiRow}>
        <KpiCard
          label="이번 달 활동"
          value={totalActivities}
          unit="건"
          color={Palette.primary}
          icon="pulse"
        />
        <KpiCard
          label="계약 체결"
          value={insights.contracts}
          unit="건"
          color={Palette.orange}
          icon="trophy"
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label="신규 고객"
          value={insights.newCustomers}
          unit="명"
          color={Palette.green}
          icon="person-add"
        />
        <KpiCard
          label="평균 일일 통화"
          value={insights.avgDailyCalls}
          unit="콜"
          color={Palette.blue}
          icon="call"
        />
      </View>

      {/* 활동 분포 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>활동 분포</Text>
        {insights.activityCounts.map((a) => {
          const meta = ACTIVITY_META[a.type];
          const pct = totalActivities > 0 ? (a.count / totalActivities) * 100 : 0;
          return (
            <View key={a.type} style={styles.barRow}>
              <View style={styles.barLabel}>
                <View style={[styles.barIcon, { backgroundColor: meta.color + '20' }]}>
                  <Ionicons name={meta.icon} size={11} color={meta.color} />
                </View>
                <Text style={styles.barLabelText}>{meta.label}</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[styles.barFill, { width: `${pct}%`, backgroundColor: meta.color }]}
                />
              </View>
              <Text style={styles.barValue}>{a.count}</Text>
            </View>
          );
        })}
      </View>

      {/* 전환율 — 깔때기 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>전환 깔때기</Text>
        <FunnelStage
          label="통화 시도"
          value={insights.activityCounts.find((a) => a.type === 'ta_call')?.count ?? 0}
          color={Palette.blue}
        />
        <FunnelArrow rate={insights.taToMeetingRate} />
        <FunnelStage
          label="미팅 성사"
          value={insights.activityCounts.find((a) => a.type === 'meeting')?.count ?? 0}
          color={Palette.green}
        />
        <FunnelArrow rate={insights.meetingToContractRate} />
        <FunnelStage
          label="계약 체결"
          value={insights.contracts}
          color={Palette.orange}
        />
      </View>

      {/* 일별 히트맵 (간이 막대) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>일별 활동량</Text>
        {insights.dailyCounts.length === 0 ? (
          <Text style={styles.empty}>이번 달 활동이 없어요</Text>
        ) : (
          <View style={styles.heatmap}>
            {insights.dailyCounts.map((d) => {
              const height = (d.count / maxDaily) * 60;
              return (
                <View key={d.date} style={styles.heatColumn}>
                  <View
                    style={[
                      styles.heatBar,
                      {
                        height: Math.max(4, height),
                        backgroundColor: Palette.primary,
                      },
                    ]}
                  />
                  <Text style={styles.heatDate}>{d.date.slice(8)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 등급 분포 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>내 고객 등급 분포 ({totalCustomers}명)</Text>
        <View style={styles.gradeRow}>
          {insights.gradeDistribution.map((g) => {
            const color = GradeColor[g.grade];
            const pct = totalCustomers > 0 ? (g.count / totalCustomers) * 100 : 0;
            return (
              <View key={g.grade} style={styles.gradeStat}>
                <View style={[styles.gradeBig, { backgroundColor: color.bg }]}>
                  <Text style={[styles.gradeBigText, { color: color.fg }]}>{g.count}</Text>
                </View>
                <Text style={styles.gradeStatLabel}>
                  {g.grade}급 · {Math.round(pct)}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 경고 */}
      {insights.staleHighGrade > 0 && (
        <View style={[styles.card, styles.warnCard]}>
          <View style={styles.warnHeader}>
            <Ionicons name="warning" size={18} color={Palette.red} />
            <Text style={styles.warnTitle}>주의가 필요해요</Text>
          </View>
          <Text style={styles.warnText}>
            A·B급 고객 {insights.staleHighGrade}명이 90일 이상 무연락. 이번 주 안에
            한 통씩이라도 챙겨보세요.
          </Text>
        </View>
      )}

      <Text style={styles.footnote}>
        · 인사이트는 본인 활동만 집계 · 매번 진입 시 최신 데이터 반영
      </Text>
    </ScrollView>
  );
}

function KpiCard({
  label,
  value,
  unit,
  color,
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: color + '15' }]}>
      <View style={styles.kpiHead}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
      <Text style={[styles.kpiValue, { color }]}>
        {value}
        <Text style={styles.kpiUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

function FunnelStage({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.funnelStage, { backgroundColor: color + '15', borderColor: color }]}>
      <Text style={[styles.funnelLabel, { color }]}>{label}</Text>
      <Text style={[styles.funnelValue, { color }]}>{value}</Text>
    </View>
  );
}

function FunnelArrow({ rate }: { rate: number }) {
  return (
    <View style={styles.funnelArrow}>
      <Ionicons name="arrow-down" size={14} color={Palette.textMuted} />
      <Text style={styles.funnelRate}>{rate}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32 },
  center: { justifyContent: 'center', alignItems: 'center' },
  empty: { color: Palette.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 16 },
  headerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textSub,
    marginBottom: 10,
  },

  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kpiCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: 14,
    ...Shadow.card,
  },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  kpiLabel: { fontSize: 11, color: Palette.textSub, fontWeight: '600' },
  kpiValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  kpiUnit: { fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 8,
    ...Shadow.card,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Palette.textMain, marginBottom: 10 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  barLabel: { flexDirection: 'row', alignItems: 'center', width: 70, gap: 5 },
  barIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barLabelText: { fontSize: 11, fontWeight: '600', color: Palette.textMain },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Palette.grayBg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barValue: { fontSize: 11, fontWeight: '700', color: Palette.textMain, width: 28, textAlign: 'right' },

  // Funnel
  funnelStage: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  funnelLabel: { fontSize: 13, fontWeight: '700' },
  funnelValue: { fontSize: 17, fontWeight: '800' },
  funnelArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  funnelRate: { fontSize: 11, color: Palette.textMuted, fontWeight: '700' },

  // Heatmap
  heatmap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    paddingTop: 8,
    minHeight: 80,
  },
  heatColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  heatBar: { width: '100%', borderRadius: 2, minHeight: 4 },
  heatDate: { fontSize: 8, color: Palette.textMuted, marginTop: 3 },

  // Grade
  gradeRow: { flexDirection: 'row', gap: 8 },
  gradeStat: { flex: 1, alignItems: 'center' },
  gradeBig: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  gradeBigText: { fontSize: 22, fontWeight: '800' },
  gradeStatLabel: { fontSize: 11, fontWeight: '600', color: Palette.textSub },

  // Warning
  warnCard: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 },
  warnHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  warnTitle: { fontSize: 13, fontWeight: '700', color: Palette.red },
  warnText: { fontSize: 12, color: '#991B1B', lineHeight: 18 },

  footnote: {
    fontSize: 10,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});
