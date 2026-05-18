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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { Palette, Radius } from '@/constants/theme';

type Step = 'role' | 'salesperson' | 'manager';

const INDUSTRIES = ['보험 GA', '부동산', '자동차', '제약', 'B2B 영업', '기타'];

export default function OnboardingScreen() {
  const { finishOnboarding, signOut } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>('role');

  const handleSwitchAccount = async () => {
    try {
      await signOut();
      router.replace('/(auth)/welcome');
    } catch (e) {
      console.error('[onboarding signOut] failed', e);
    }
  };
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState<string>('보험 GA');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFinish = async (role: 'salesperson' | 'manager') => {
    setError(null);
    if (!name.trim()) {
      setError('이름은 적어주세요');
      return;
    }
    if (role === 'salesperson' && !inviteCode.trim()) {
      setError('센터장한테 6자리 코드 받아오세요');
      return;
    }
    if (role === 'manager' && !orgName.trim()) {
      setError('센터 이름이 빠졌어요');
      return;
    }
    setLoading(true);
    try {
      await finishOnboarding({
        name: name.trim(),
        phone: phone.trim() || undefined,
        role,
        inviteCode: role === 'salesperson' ? inviteCode.trim() : undefined,
        organizationName: role === 'manager' ? orgName.trim() : undefined,
        industry: role === 'manager' ? industry : undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '오류가 발생했어요';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 'role' ? (
            <View>
              <Text style={styles.title}>잠깐,{'\n'}둘 중 어느 쪽이세요?</Text>
              <Text style={styles.subtitle}>역할에 따라 보이는 화면이 달라요</Text>

              <View style={styles.roleCards}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.roleCard}
                  onPress={() => setStep('salesperson')}>
                  <View style={[styles.roleIcon, { backgroundColor: Palette.primarySoft }]}>
                    <Ionicons name="person-outline" size={26} color={Palette.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleTitle}>저, 영업합니다</Text>
                    <Text style={styles.roleSub}>
                      고객·영업판·동선 — 다 폰에서 처리할게요
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Palette.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.roleCard}
                  onPress={() => setStep('manager')}>
                  <View style={[styles.roleIcon, { backgroundColor: Palette.greenBg }]}>
                    <Ionicons name="people-outline" size={26} color={Palette.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleTitle}>저, 센터장입니다</Text>
                    <Text style={styles.roleSub}>
                      팀 부르고 활동만 봐요 (고객 정보는 안 봐요)
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Palette.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleSwitchAccount} style={styles.signOut}>
                <Text style={styles.signOutText}>다른 계정으로 다시</Text>
              </TouchableOpacity>
            </View>
          ) : step === 'salesperson' ? (
            <View>
              <TouchableOpacity onPress={() => setStep('role')} style={styles.back} hitSlop={8}>
                <Ionicons name="arrow-back" size={24} color={Palette.textMain} />
              </TouchableOpacity>

              <Text style={styles.title}>좋아요,{'\n'}몇 가지만 알려주세요</Text>
              <Text style={styles.subtitle}>센터장한테 받은 6자리 코드가 필요해요</Text>

              <View style={styles.form}>
                <Field label="이름">
                  <TextInput
                    style={styles.input}
                    placeholder="홍길동"
                    placeholderTextColor={Palette.textMuted}
                    value={name}
                    onChangeText={setName}
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

                <Field label="초대 코드">
                  <TextInput
                    style={[styles.input, styles.inputCode]}
                    placeholder="ABC123"
                    placeholderTextColor={Palette.textMuted}
                    autoCapitalize="characters"
                    value={inviteCode}
                    onChangeText={(t) => setInviteCode(t.toUpperCase())}
                    maxLength={6}
                  />
                </Field>

                {error && <ErrorBox text={error} />}

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.submit, loading && styles.submitLoading]}
                  onPress={() => handleFinish('salesperson')}
                  disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>들어가기</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <TouchableOpacity onPress={() => setStep('role')} style={styles.back} hitSlop={8}>
                <Ionicons name="arrow-back" size={24} color={Palette.textMain} />
              </TouchableOpacity>

              <Text style={styles.title}>좋습니다,{'\n'}센터 한번 차려봅시다</Text>
              <Text style={styles.subtitle}>만들면 팀원 부를 6자리 코드 바로 나와요</Text>

              <View style={styles.form}>
                <Field label="이름">
                  <TextInput
                    style={styles.input}
                    placeholder="박센터장"
                    placeholderTextColor={Palette.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </Field>

                <Field label="센터 이름">
                  <TextInput
                    style={styles.input}
                    placeholder="강남센터"
                    placeholderTextColor={Palette.textMuted}
                    value={orgName}
                    onChangeText={setOrgName}
                  />
                </Field>

                <Field label="업종">
                  <View style={styles.industryRow}>
                    {INDUSTRIES.map((i) => (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.75}
                        onPress={() => setIndustry(i)}
                        style={[styles.industryChip, industry === i && styles.industryChipActive]}>
                        <Text
                          style={[styles.industryText, industry === i && styles.industryTextActive]}>
                          {i}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>

                {error && <ErrorBox text={error} />}

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.submit, loading && styles.submitLoading]}
                  onPress={() => handleFinish('manager')}
                  disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>차리기</Text>}
                </TouchableOpacity>
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

  roleCards: { gap: 10 },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    padding: 18,
    borderRadius: Radius.lg,
    gap: 14,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTitle: { fontSize: 16, fontWeight: '700', color: Palette.textMain },
  roleSub: { fontSize: 13, color: Palette.textSub, marginTop: 4, lineHeight: 18 },

  form: { gap: 18 },
  label: { fontSize: 13, fontWeight: '700', color: Palette.textSub, marginBottom: 8 },
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

  signOut: { alignItems: 'center', marginTop: 28, padding: 12 },
  signOutText: { color: Palette.textMuted, fontSize: 14, fontWeight: '600' },
});
