import { Ionicons } from '@expo/vector-icons';
import {
  completePersonalSignup,
  createTeam,
  INDUSTRIES,
  requestTeamJoin,
  type IndustryCode,
} from '@metsystem/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Palette, Radius } from '@/constants/theme';

/**
 * 단계:
 *  1) 'personal'  — 이름·연락처 입력 (개인 가입)
 *  2) 'team_pick' — 팀 만들기 / 참여 / 나중에
 *  3) 'team_create' — 팀 만들기 폼
 *  4) 'team_join'   — 초대코드 입력
 */
type Step = 'personal' | 'team_pick' | 'team_create' | 'team_join';

export default function OnboardingScreen() {
  const router = useRouter();
  const { authUser, refreshProfile, signOut } = useAuth();
  const [step, setStep] = useState<Step>('personal');

  // 개인 정보
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  /** 첫 화면에서 받는 초대 코드 (선택) — 있으면 가입과 동시에 팀 신청 */
  const [initialCode, setInitialCode] = useState('');

  // 팀 만들기
  const [teamName, setTeamName] = useState('');
  const [industry, setIndustry] = useState<IndustryCode>('insurance');

  // 팀 참여 (별도 화면)
  const [inviteCode, setInviteCode] = useState('');
  const [joinMessage, setJoinMessage] = useState('');

  /** 가입 완료 안내 (초대 코드 직접 입력한 경우) */
  const [joinSuccess, setJoinSuccess] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSwitchAccount = async () => {
    try {
      await signOut();
      router.replace('/(auth)/welcome');
    } catch (e) {
      console.error('[onboarding signOut] failed', e);
    }
  };

  // ============================================
  // Step 1: 개인 가입 (+ 선택: 초대 코드 동시 입력)
  // ============================================
  const handleSavePersonal = async () => {
    setError(null);
    if (!name.trim()) return setError('이름을 적어주세요');
    if (!authUser) return setError('로그인이 필요해요');
    setLoading(true);
    try {
      // 1) 개인 가입
      await completePersonalSignup(supabase, authUser.id, authUser.email ?? null, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });

      // 2) 초대 코드 있으면 곧바로 팀 가입 신청
      if (initialCode.trim()) {
        try {
          await requestTeamJoin(supabase, initialCode.trim().toUpperCase());
          await refreshProfile();
          setJoinSuccess(true);
          return;
        } catch (e) {
          // 가입은 됐지만 코드가 잘못된 경우 — 팀 선택 단계로 진행
          const err = e as { message?: string };
          await refreshProfile();
          setError(`가입은 완료 · 코드 확인 필요: ${err.message ?? '알 수 없음'}`);
          setStep('team_pick');
          return;
        }
      }

      await refreshProfile();
      setStep('team_pick');
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Step 3: 팀 만들기
  // ============================================
  const handleCreateTeam = async () => {
    setError(null);
    if (!teamName.trim()) return setError('팀 이름을 적어주세요');
    setLoading(true);
    try {
      await createTeam(supabase, teamName.trim(), industry, true);
      await refreshProfile();
      // 가입 완료 → AuthGate 가 자동 라우팅
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? '팀 만들기 실패');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Step 4: 팀 참여
  // ============================================
  const handleJoinTeam = async () => {
    setError(null);
    if (!inviteCode.trim()) return setError('초대 코드를 입력해주세요');
    setLoading(true);
    try {
      await requestTeamJoin(
        supabase,
        inviteCode.trim().toUpperCase(),
        joinMessage.trim() || undefined,
      );
      // 신청만 됨 — 사용자는 일단 개인 상태로 앱 사용
      // 관리자가 승인하면 organization_id 자동 업데이트
      setStep('team_pick');
      // 토스트나 알림이 있으면 좋지만 V1 은 그냥 다시 pick 으로
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? '신청 실패');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 나중에 정할게요 — 개인 모드로 앱 진입
  // ============================================
  const handleSkipTeam = async () => {
    await refreshProfile();
    // AuthGate 가 profile 보고 자동 라우팅
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Step 1: 개인 정보 + 선택: 초대 코드 */}
          {step === 'personal' && !joinSuccess && (
            <View>
              <Text style={styles.title}>안녕하세요!{'\n'}어떻게 부르면 될까요?</Text>
              <Text style={styles.subtitle}>본인 정보를 입력해주세요</Text>

              <View style={styles.form}>
                <Field label="이름">
                  <TextInput
                    style={styles.input}
                    placeholder="홍길동"
                    placeholderTextColor={Palette.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoFocus
                  />
                </Field>

                <Field label="연락처 (선택)">
                  <TextInput
                    style={styles.input}
                    placeholder="010-1234-5678"
                    placeholderTextColor={Palette.textMuted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </Field>

                <Field label="팀 초대 코드 (선택)">
                  <Text style={styles.fieldHint}>
                    이미 받은 6자리 코드가 있으면 입력해주세요. 가입과 동시에 팀 신청까지 됩니다.
                  </Text>
                  <TextInput
                    style={[styles.input, styles.inputCode]}
                    placeholder="ABC123"
                    placeholderTextColor={Palette.textMuted}
                    autoCapitalize="characters"
                    value={initialCode}
                    onChangeText={(t) => setInitialCode(t.toUpperCase())}
                    maxLength={8}
                  />
                </Field>

                {error && <ErrorBox text={error} />}

                <TouchableOpacity
                  style={[styles.submit, loading && styles.submitLoading]}
                  onPress={handleSavePersonal}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>
                      {initialCode.trim() ? '가입 + 팀 신청' : '다음'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleSwitchAccount} style={styles.signOut}>
                <Text style={styles.signOutText}>다른 계정으로 다시</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 가입 + 신청 성공 — 안내 후 앱 진입 */}
          {step === 'personal' && joinSuccess && (
            <View style={styles.successBox}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>가입 완료!</Text>
              <Text style={styles.subtitle}>
                팀 가입 신청이 들어갔어요. 관리자가 승인하면 활성 팀으로 자동 전환돼요.
                {'\n\n'}그동안 개인 모드로 앱을 사용할 수 있어요.
              </Text>
              <TouchableOpacity
                style={styles.submit}
                onPress={handleSkipTeam}
                activeOpacity={0.85}>
                <Text style={styles.submitText}>앱 시작하기</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: 팀 선택 */}
          {step === 'team_pick' && (
            <View>
              <Text style={styles.title}>좋아요!{'\n'}어떻게 시작할까요?</Text>
              <Text style={styles.subtitle}>나중에 언제든 바꿀 수 있어요</Text>

              <View style={styles.cards}>
                <ActionCard
                  emoji="🏢"
                  title="새 팀 만들기"
                  desc="내가 관리자가 되어서 팀원을 초대할게요"
                  onPress={() => setStep('team_create')}
                />
                <ActionCard
                  emoji="🔑"
                  title="초대 코드로 참여"
                  desc="이미 만들어진 팀의 코드를 받았어요"
                  onPress={() => setStep('team_join')}
                />
                <ActionCard
                  emoji="💁"
                  title="혼자 써볼게요"
                  desc="개인 영업 노트로 먼저 사용 — 나중에 팀 만들기 가능"
                  onPress={handleSkipTeam}
                  variant="soft"
                />
              </View>
            </View>
          )}

          {/* Step 3: 팀 만들기 */}
          {step === 'team_create' && (
            <View>
              <BackBtn onPress={() => setStep('team_pick')} />
              <Text style={styles.title}>팀 한번{'\n'}만들어봅시다</Text>
              <Text style={styles.subtitle}>만들면 팀원 초대할 6자리 코드가 나와요</Text>

              <View style={styles.form}>
                <Field label="팀 이름">
                  <TextInput
                    style={styles.input}
                    placeholder="강남팀 / 우리 가족 / 광림교회 셀"
                    placeholderTextColor={Palette.textMuted}
                    value={teamName}
                    onChangeText={setTeamName}
                  />
                </Field>

                <Field label="업종 (필드 노출 결정)">
                  <Text style={styles.industryHint}>
                    업종에 따라 고객 등록 화면이 달라져요
                  </Text>
                  <View style={styles.industryRow}>
                    {INDUSTRIES.map((i) => (
                      <TouchableOpacity
                        key={i.code}
                        activeOpacity={0.75}
                        onPress={() => setIndustry(i.code)}
                        style={[
                          styles.industryChip,
                          industry === i.code && styles.industryChipActive,
                        ]}>
                        <Text
                          style={[
                            styles.industryText,
                            industry === i.code && styles.industryTextActive,
                          ]}>
                          {i.emoji} {i.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>

                {error && <ErrorBox text={error} />}

                <TouchableOpacity
                  style={[styles.submit, loading && styles.submitLoading]}
                  onPress={handleCreateTeam}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>팀 만들기</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 4: 팀 참여 */}
          {step === 'team_join' && (
            <View>
              <BackBtn onPress={() => setStep('team_pick')} />
              <Text style={styles.title}>초대 코드를{'\n'}입력해주세요</Text>
              <Text style={styles.subtitle}>관리자한테 받은 6자리 코드가 필요해요</Text>

              <View style={styles.form}>
                <Field label="초대 코드">
                  <TextInput
                    style={[styles.input, styles.inputCode]}
                    placeholder="ABC123"
                    placeholderTextColor={Palette.textMuted}
                    autoCapitalize="characters"
                    value={inviteCode}
                    onChangeText={(t) => setInviteCode(t.toUpperCase())}
                    maxLength={8}
                  />
                </Field>

                <Field label="인사말 (선택)">
                  <TextInput
                    style={styles.input}
                    placeholder="안녕하세요, OO입니다"
                    placeholderTextColor={Palette.textMuted}
                    value={joinMessage}
                    onChangeText={setJoinMessage}
                  />
                </Field>

                {error && <ErrorBox text={error} />}

                <TouchableOpacity
                  style={[styles.submit, loading && styles.submitLoading]}
                  onPress={handleJoinTeam}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>가입 신청</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.helpText}>
                  신청 후 관리자가 승인하면 팀에 들어가져요. 그동안은 혼자 써도 OK.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{text}</Text>
    </View>
  );
}

function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.back} hitSlop={8}>
      <Ionicons name="arrow-back" size={24} color={Palette.textMain} />
    </TouchableOpacity>
  );
}

function ActionCard({
  emoji,
  title,
  desc,
  onPress,
  variant,
}: {
  emoji: string;
  title: string;
  desc: string;
  onPress: () => void;
  variant?: 'soft';
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.actionCard, variant === 'soft' && styles.actionCardSoft]}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Palette.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  scroll: { padding: 24, paddingBottom: 40 },

  back: { width: 44, height: 44, marginLeft: -12, marginBottom: 4, justifyContent: 'center' },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.textMain,
    letterSpacing: -0.5,
    lineHeight: 38,
    marginTop: 8,
  },
  subtitle: { fontSize: 15, color: Palette.textSub, marginTop: 12, marginBottom: 32 },

  cards: { gap: 10 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    padding: 18,
    borderRadius: Radius.lg,
    gap: 14,
  },
  actionCardSoft: { backgroundColor: Palette.grayBg },
  actionEmoji: { fontSize: 32 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: Palette.textMain },
  actionDesc: { fontSize: 13, color: Palette.textSub, marginTop: 4, lineHeight: 18 },

  form: { gap: 18 },
  label: { fontSize: 13, fontWeight: '700', color: Palette.textSub, marginBottom: 8 },
  fieldHint: { fontSize: 11, color: Palette.textMuted, marginTop: -4, marginBottom: 8, lineHeight: 16 },

  successBox: { alignItems: 'center', paddingTop: 40, gap: 14 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Palette.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Palette.card,
    paddingHorizontal: 16,
    height: 56,
    borderRadius: Radius.md,
    fontSize: 16,
    color: Palette.textMain,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: Palette.borderStrong,
  },
  inputCode: { letterSpacing: 6, fontWeight: '700', textAlign: 'center', fontSize: 20 },

  industryHint: { fontSize: 12, color: Palette.textMuted, marginBottom: 10 },
  industryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  industryChip: {
    paddingHorizontal: 16,
    height: 40,
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
  industryChipActive: { backgroundColor: Palette.primary },
  industryText: { color: Palette.textSub, fontWeight: '600', fontSize: 13 },
  industryTextActive: { color: '#FFFFFF' },

  errorBox: {
    backgroundColor: Palette.redBg,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorText: { color: Palette.red, fontSize: 14, fontWeight: '500' },

  submit: {
    backgroundColor: Palette.primary,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitLoading: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  helpText: {
    fontSize: 12,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 17,
  },

  signOut: { alignItems: 'center', marginTop: 28, padding: 12 },
  signOutText: { color: Palette.textMuted, fontSize: 14, fontWeight: '600' },
});
