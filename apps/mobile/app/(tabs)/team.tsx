import { Ionicons } from '@expo/vector-icons';
import {
  campaignMetricLabel,
  campaignMetricUnit,
  getCampaignProgress,
  getIndustry,
  listActiveCampaigns,
  listAnnouncements,
  type CampaignProgress,
  type TeamEvent,
} from '@metsystem/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CampaignAddSheet } from '@/components/campaign-add-sheet';
import { TeamEventAdd } from '@/components/team-event-add';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Palette, Radius, Shadow } from '@/constants/theme';

export default function TeamHubScreen() {
  const router = useRouter();
  const { authUser, profile, organization } = useAuth();
  const isManager = profile?.role === 'manager' || profile?.role === 'owner';
  const industryDef = getIndustry(organization?.industry);

  const [campaigns, setCampaigns] = useState<TeamEvent[]>([]);
  const [progress, setProgress] = useState<Record<string, CampaignProgress>>({});
  const [announcements, setAnnouncements] = useState<TeamEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [campaignAddOpen, setCampaignAddOpen] = useState(false);
  const [noticeAddOpen, setNoticeAddOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      const [cs, ns] = await Promise.all([
        listActiveCampaigns(supabase),
        listAnnouncements(supabase, 3),
      ]);
      setCampaigns(cs);
      setAnnouncements(ns);

      // 각 시책 진척률 병렬 로드
      const progressMap: Record<string, CampaignProgress> = {};
      await Promise.all(
        cs.map(async (c) => {
          const p = await getCampaignProgress(supabase, c, authUser.id);
          if (p) progressMap[c.id] = p;
        }),
      );
      setProgress(progressMap);
    } catch (e) {
      console.warn('[team hub] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Palette.card }}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>팀</Text>
              <Text style={styles.sub}>
                {organization?.name ?? '소속 조직 없음'}
                {organization?.industry ? ` · ${industryDef.emoji} ${industryDef.label}` : ''}
              </Text>
            </View>
            {/* V2 팀 스위처 자리 — 현재는 단일 조직 */}
            <TouchableOpacity
              style={styles.switcherPlaceholder}
              activeOpacity={0.6}
              onPress={() => {
                // V1: 안내만
              }}>
              <Text style={styles.switcherText}>내 팀</Text>
              <Ionicons name="chevron-down" size={12} color={Palette.textSub} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Palette.primary} />
          </View>
        ) : (
          <>
            {/* 진행 중 시책 */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>🎯 진행 중인 시책</Text>
                {isManager && (
                  <TouchableOpacity
                    style={styles.addLink}
                    onPress={() => setCampaignAddOpen(true)}>
                    <Ionicons name="add" size={14} color={Palette.primary} />
                    <Text style={styles.addLinkText}>시책 추가</Text>
                  </TouchableOpacity>
                )}
              </View>

              {campaigns.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    진행 중인 시책이 없어요
                    {isManager && '\n위에서 시책을 추가해보세요'}
                  </Text>
                </View>
              ) : (
                campaigns.map((c) => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    progress={progress[c.id]}
                    onPress={() => {
                      // V1: 카드 자체로 진척률 보임 (상세는 V2)
                    }}
                  />
                ))
              )}
            </View>

            {/* 공지사항 */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>📢 공지사항</Text>
                {isManager && (
                  <TouchableOpacity
                    style={styles.addLink}
                    onPress={() => setNoticeAddOpen(true)}>
                    <Ionicons name="add" size={14} color={Palette.primary} />
                    <Text style={styles.addLinkText}>공지 작성</Text>
                  </TouchableOpacity>
                )}
              </View>

              {announcements.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>아직 공지사항이 없어요</Text>
                </View>
              ) : (
                announcements.map((a) => <NoticeRow key={a.id} notice={a} />)
              )}
            </View>

            {/* 빠른 접근 타일 */}
            <View style={styles.tilesRow}>
              <Tile
                icon="folder"
                label="자료실"
                color={Palette.primary}
                onPress={() => router.push('/resources' as never)}
              />
              <Tile
                icon="calendar"
                label="팀 일정"
                color={Palette.green}
                onPress={() => router.push('/(tabs)/pipeline' as never)}
              />
              <Tile
                icon="people"
                label="팀원"
                color={Palette.orange}
                onPress={() => {
                  // V2 자리표시자
                }}
              />
            </View>

            <Text style={styles.footnote}>
              다중 팀 소속 · 팀원 목록 · 시책 보상은 V2 에 추가 예정
            </Text>
          </>
        )}
      </ScrollView>

      {/* 시책 작성 */}
      <CampaignAddSheet
        visible={campaignAddOpen}
        onClose={() => setCampaignAddOpen(false)}
        onAdded={() => {
          setCampaignAddOpen(false);
          void reload();
        }}
      />

      {/* 공지 작성 — 기존 TeamEventAdd 재사용 (type='announcement') */}
      <TeamEventAdd
        visible={noticeAddOpen}
        onClose={() => setNoticeAddOpen(false)}
        onAdded={() => {
          setNoticeAddOpen(false);
          void reload();
        }}
      />
    </View>
  );
}

function CampaignCard({
  campaign,
  progress,
  onPress,
}: {
  campaign: TeamEvent;
  progress: CampaignProgress | undefined;
  onPress: () => void;
}) {
  const metricLabel = campaign.target_metric ? campaignMetricLabel(campaign.target_metric) : '';
  const unit = campaign.target_metric ? campaignMetricUnit(campaign.target_metric) : '건';

  return (
    <TouchableOpacity style={styles.campaignCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.campaignHead}>
        <Text style={styles.campaignTitle} numberOfLines={1}>
          {campaign.title}
        </Text>
        {progress && (
          <Text style={styles.daysLeft}>
            {progress.daysLeft >= 0 ? `${progress.daysLeft}일 남음` : '종료'}
          </Text>
        )}
      </View>
      {metricLabel && campaign.target_value && (
        <Text style={styles.campaignMeta}>
          {metricLabel} {campaign.target_value}
          {unit}
          {campaign.start_date && campaign.end_date && (
            <> · {campaign.start_date.slice(5)} ~ {campaign.end_date.slice(5)}</>
          )}
        </Text>
      )}
      {progress ? (
        <>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress.myPercent}%`,
                  backgroundColor:
                    progress.myPercent >= 100 ? Palette.green : Palette.primary,
                },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressMine}>
              내 진척 {progress.myCurrent}/{progress.target} ({progress.myPercent}%)
            </Text>
            <Text style={styles.progressTeam}>
              팀 {progress.teamCurrent}{unit}
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.campaignDesc}>{campaign.description ?? ''}</Text>
      )}
    </TouchableOpacity>
  );
}

function NoticeRow({ notice }: { notice: TeamEvent }) {
  return (
    <View style={styles.noticeRow}>
      <Ionicons name="megaphone-outline" size={16} color={Palette.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.noticeTitle}>{notice.title}</Text>
        {notice.description && (
          <Text style={styles.noticeDesc} numberOfLines={2}>
            {notice.description}
          </Text>
        )}
      </View>
      <Text style={styles.noticeDate}>{notice.event_date.slice(5)}</Text>
    </View>
  );
}

function Tile({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.tileIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },
  sub: { fontSize: 12, color: Palette.textSub, marginTop: 3 },
  switcherPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
  },
  switcherText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },

  scroll: { padding: 12, paddingBottom: 24 },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },

  section: { marginBottom: 14 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Palette.textMain },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addLinkText: { fontSize: 12, fontWeight: '700', color: Palette.primary },

  emptyCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
  },
  emptyText: { fontSize: 12, color: Palette.textMuted, textAlign: 'center', lineHeight: 18 },

  // Campaign card
  campaignCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 8,
    ...Shadow.card,
  },
  campaignHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  campaignTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Palette.textMain },
  daysLeft: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.orange,
    backgroundColor: Palette.orangeBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  campaignMeta: { fontSize: 11, color: Palette.textSub, marginBottom: 8 },
  campaignDesc: { fontSize: 12, color: Palette.textSub, lineHeight: 17 },
  progressBar: {
    height: 8,
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: { height: '100%', borderRadius: Radius.pill },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  progressMine: { fontSize: 11, fontWeight: '700', color: Palette.textMain },
  progressTeam: { fontSize: 10, color: Palette.textMuted, fontWeight: '500' },

  // Notice
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 6,
  },
  noticeTitle: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  noticeDesc: { fontSize: 11, color: Palette.textSub, marginTop: 2 },
  noticeDate: { fontSize: 10, color: Palette.textMuted, fontWeight: '600' },

  // Tiles
  tilesRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tile: {
    flex: 1,
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    ...Shadow.card,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  tileLabel: { fontSize: 12, fontWeight: '700', color: Palette.textMain },

  footnote: {
    fontSize: 10,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: 18,
    fontStyle: 'italic',
  },
});
