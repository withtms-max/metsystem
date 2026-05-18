import { Ionicons } from '@expo/vector-icons';
import {
  currentMonthKey,
  inferTitle,
  logActivity,
  pickTemplate,
  renderScript,
  type Customer,
  type PipelineCardWithCustomer,
} from '@metsystem/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useCustomers } from '@/hooks/use-customers';
import { usePipeline } from '@/hooks/use-pipeline';
import { useTaScripts } from '@/hooks/use-templates';

type Phase = 'preview' | 'calling' | 'result' | 'done';

const TIMER_TOTAL_SECONDS = 60;
const WARNING_AT_SECONDS = 50;

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

export default function SwipeTAScreen() {
  const router = useRouter();
  const { authUser, profile } = useAuth();
  const monthKey = currentMonthKey();
  const { byStage } = usePipeline(monthKey);
  const { customers } = useCustomers();
  const { templates, isLoading: templatesLoading } = useTaScripts();

  // 'TA 대상' 단계 카드만 (이 사람들이 오늘 전화 돌릴 명단)
  const taTargets: PipelineCardWithCustomer[] = byStage('ta_target');

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('preview');
  const [secondsLeft, setSecondsLeft] = useState(TIMER_TOTAL_SECONDS);
  const [doneCount, setDoneCount] = useState(0);
  const [skipCount, setSkipCount] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  const currentCard = taTargets[index];
  const currentCustomer: Customer | null = currentCard?.customer ?? null;

  // 영업맨 본인 지역 (프로필에 없으면 fallback)
  const myRegion = '판교'; // TODO: 추후 GPS 또는 프로필에서 가져오기

  const script = useMemo(() => {
    if (!currentCustomer) return null;
    const lastDays = daysSince(currentCustomer.updated_at);
    const template = pickTemplate({
      grade: currentCustomer.grade,
      lastMeetingDays: lastDays,
      templates,
    });
    if (!template) return null;
    const body = renderScript(template.body_template, {
      customer_name: currentCustomer.name,
      title: inferTitle(currentCustomer.grade, currentCustomer.memo),
      region: currentCustomer.region_tag ?? myRegion,
      last_meeting_days: lastDays ?? undefined,
    });
    return { template, body };
  }, [currentCustomer, templates, myRegion]);

  // 60초 카운트다운
  useEffect(() => {
    if (phase !== 'calling') return;
    setSecondsLeft(TIMER_TOTAL_SECONDS);
    const start = Date.now();
    let warned = false;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = TIMER_TOTAL_SECONDS - elapsed;
      setSecondsLeft(remaining);
      if (!warned && elapsed >= WARNING_AT_SECONDS) {
        warned = true;
        Vibration.vibrate([200]);
      }
      if (remaining <= 0) {
        Vibration.vibrate([400, 100, 400]);
        clearInterval(id);
        setPhase('result');
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  const advance = useCallback(() => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (index >= taTargets.length - 1) {
        setPhase('done');
        return;
      }
      setIndex(index + 1);
      setPhase('preview');
      fade.setValue(1);
    });
  }, [fade, index, taTargets.length]);

  const handleStartCall = useCallback(() => {
    if (!currentCustomer?.phone) return;
    if (Platform.OS !== 'web') {
      Linking.openURL(`tel:${currentCustomer.phone}`).catch(() => {});
    }
    setPhase('calling');
  }, [currentCustomer]);

  const handleSkip = useCallback(() => {
    setSkipCount((s) => s + 1);
    advance();
  }, [advance]);

  const handleResult = useCallback(
    async (mood: 'good' | 'neutral' | 'bad') => {
      if (!authUser || !profile?.organization_id || !currentCustomer) {
        advance();
        return;
      }
      try {
        await logActivity(supabase, {
          user_id: authUser.id,
          organization_id: profile.organization_id,
          customer_id: currentCustomer.id,
          activity_type: 'ta_call',
          status: 'completed',
          mood,
          duration_seconds: TIMER_TOTAL_SECONDS - secondsLeft,
          source: 'swipe_ta',
          note: script?.body.slice(0, 120) ?? null,
        });
        setDoneCount((d) => d + 1);
      } catch (e) {
        console.warn('[swipe-ta] logActivity failed:', e);
      }
      advance();
    },
    [advance, authUser, profile, currentCustomer, secondsLeft, script],
  );

  if (templatesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 120 }} />
        <Text style={styles.loadingText}>스크립트 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  if (taTargets.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>TA 대상이 없어요</Text>
          <Text style={styles.emptySub}>
            성과 탭에서 이번 달 TA 대상 고객을 먼저 추가해주세요
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.replace('/(tabs)/pipeline')}>
            <Text style={styles.emptyButtonText}>성과로 가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={styles.emptyTitle}>오늘 TA 끝!</Text>
          <Text style={styles.emptySub}>
            완료 {doneCount}건 · 스킵 {skipCount}건{'\n'}수고하셨어요!
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
            <Text style={styles.emptyButtonText}>홈으로</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentCustomer) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 120 }} />
      </SafeAreaView>
    );
  }

  const timerProgress = secondsLeft / TIMER_TOTAL_SECONDS;
  const timerColor =
    secondsLeft <= TIMER_TOTAL_SECONDS - WARNING_AT_SECONDS ? '#EF4444' : '#10B981';

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 진행 표시 */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerProgress}>
          {index + 1} / {taTargets.length}
          <Text style={styles.headerStat}>  · ✅ {doneCount}  · ⏭ {skipCount}</Text>
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <Animated.View style={[styles.body, { opacity: fade }]}>
        {phase === 'preview' && (
          <>
            <View style={styles.previewCard}>
              <View
                style={[
                  styles.gradeBadge,
                  { backgroundColor: GRADE_COLOR[currentCustomer.grade] },
                ]}>
                <Text style={styles.gradeText}>{currentCustomer.grade}</Text>
              </View>
              <Text style={styles.customerName}>{currentCustomer.name}</Text>
              {currentCustomer.company && (
                <Text style={styles.customerCompany}>
                  {currentCustomer.company}
                  {currentCustomer.job_title ? ` · ${currentCustomer.job_title}` : ''}
                </Text>
              )}
              {currentCustomer.region_tag && (
                <View style={styles.regionPill}>
                  <Text style={styles.regionText}>📍 {currentCustomer.region_tag}</Text>
                </View>
              )}
              {currentCustomer.memo && (
                <Text style={styles.memo} numberOfLines={3}>
                  💭 {currentCustomer.memo}
                </Text>
              )}
              {(() => {
                const days = daysSince(currentCustomer.updated_at);
                if (days === null) return null;
                return (
                  <Text style={styles.lastContact}>
                    🕐 마지막 활동 {days === 0 ? '오늘' : `${days}일 전`}
                  </Text>
                );
              })()}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Ionicons name="arrow-back" size={24} color="#94A3B8" />
                <Text style={styles.skipText}>스킵</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.callBtn}
                onPress={handleStartCall}
                disabled={!currentCustomer.phone}>
                <Text style={styles.callBtnEmoji}>📞</Text>
                <Text style={styles.callText}>전화 걸기</Text>
                {!currentCustomer.phone && (
                  <Text style={styles.callBtnHint}>(전화번호 없음)</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {phase === 'calling' && script && (
          <>
            <View style={styles.timerSection}>
              <View style={styles.timerCircle}>
                <Text style={[styles.timerNumber, { color: timerColor }]}>
                  {Math.max(0, secondsLeft)}
                </Text>
                <Text style={styles.timerLabel}>초</Text>
              </View>
              <View style={styles.timerBar}>
                <View
                  style={[
                    styles.timerBarFill,
                    { width: `${Math.max(0, timerProgress) * 100}%`, backgroundColor: timerColor },
                  ]}
                />
              </View>
              {secondsLeft <= TIMER_TOTAL_SECONDS - WARNING_AT_SECONDS && (
                <Text style={styles.warnText}>
                  ⚠️ {TIMER_TOTAL_SECONDS - WARNING_AT_SECONDS}초 경과 — 슬슬 약속 잡고 끊으세요!
                </Text>
              )}
            </View>

            <View style={styles.scriptCard}>
              <Text style={styles.scriptLabel}>📞 {currentCustomer.name} 님 통화 중</Text>
              <Text style={styles.scriptBody}>{script.body}</Text>
            </View>

            <TouchableOpacity
              style={styles.endCallBtn}
              onPress={() => setPhase('result')}>
              <Text style={styles.endCallText}>📵 통화 종료</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === 'result' && (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>통화 어땠어요?</Text>
              <Text style={styles.resultSub}>{currentCustomer.name} 님과의 {TIMER_TOTAL_SECONDS - secondsLeft}초 통화</Text>
            </View>

            <View style={styles.moodRow}>
              <TouchableOpacity
                style={[styles.moodBtn, styles.moodGood]}
                onPress={() => handleResult('good')}>
                <Text style={styles.moodEmoji}>😊</Text>
                <Text style={styles.moodText}>좋음</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moodBtn, styles.moodNeutral]}
                onPress={() => handleResult('neutral')}>
                <Text style={styles.moodEmoji}>😐</Text>
                <Text style={styles.moodText}>보통</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moodBtn, styles.moodBad]}
                onPress={() => handleResult('bad')}>
                <Text style={styles.moodEmoji}>😟</Text>
                <Text style={styles.moodText}>별로</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.resultHint}>
              평가하면 자동으로 활동 기록 저장 + 다음 고객으로 넘어가요
            </Text>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const GRADE_COLOR: Record<string, string> = {
  A: '#EF4444',
  B: '#F59E0B',
  C: '#3B82F6',
  D: '#94A3B8',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingText: { color: '#94A3B8', textAlign: 'center', marginTop: 16 },

  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerProgress: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  headerStat: { color: '#64748B', fontWeight: '500' },

  body: { flex: 1, padding: 20, justifyContent: 'space-between' },

  // Preview
  previewCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  gradeBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  gradeText: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  customerName: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  customerCompany: { color: '#94A3B8', fontSize: 15, marginTop: 6, textAlign: 'center' },
  regionPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 14,
  },
  regionText: { color: '#10B981', fontWeight: '700', fontSize: 13 },
  memo: { color: '#CBD5E1', marginTop: 16, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  lastContact: { color: '#64748B', fontSize: 12, marginTop: 12 },

  actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  skipBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  skipText: { color: '#94A3B8', fontWeight: '700', fontSize: 15 },
  callBtn: {
    flex: 2,
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  callBtnEmoji: { fontSize: 26, marginBottom: 2 },
  callText: { color: '#FFFFFF', fontWeight: '800', fontSize: 17 },
  callBtnHint: { color: '#D1FAE5', fontSize: 11, marginTop: 4 },

  // Calling
  timerSection: { alignItems: 'center', marginBottom: 8 },
  timerCircle: { alignItems: 'center', marginVertical: 8 },
  timerNumber: { fontSize: 88, fontWeight: '800', lineHeight: 100 },
  timerLabel: { color: '#64748B', fontSize: 16, fontWeight: '600' },
  timerBar: {
    height: 6,
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerBarFill: { height: '100%', borderRadius: 3 },
  warnText: {
    color: '#FCA5A5',
    fontSize: 13,
    marginTop: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  scriptCard: {
    backgroundColor: '#FBBF24',
    borderRadius: 20,
    padding: 24,
    marginVertical: 12,
  },
  scriptLabel: { color: '#78350F', fontSize: 12, fontWeight: '800', marginBottom: 12 },
  scriptBody: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 28,
  },

  endCallBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  endCallText: { color: '#FFFFFF', fontWeight: '800', fontSize: 17 },

  // Result
  resultHeader: { alignItems: 'center', marginTop: 20 },
  resultTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  resultSub: { color: '#94A3B8', marginTop: 8, fontSize: 14 },

  moodRow: { flexDirection: 'row', gap: 12, marginVertical: 32 },
  moodBtn: {
    flex: 1,
    paddingVertical: 28,
    borderRadius: 20,
    alignItems: 'center',
  },
  moodGood: { backgroundColor: '#10B981' },
  moodNeutral: { backgroundColor: '#64748B' },
  moodBad: { backgroundColor: '#EF4444' },
  moodEmoji: { fontSize: 40 },
  moodText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, marginTop: 8 },

  resultHint: { color: '#64748B', fontSize: 12, textAlign: 'center' },

  // Empty / Done
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji: { fontSize: 80, marginBottom: 16 },
  emptyTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  emptySub: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginTop: 32,
  },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
