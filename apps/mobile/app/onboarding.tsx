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

type Step = 'role' | 'salesperson' | 'manager';

const INDUSTRIES = ['보험 GA', '부동산', '자동차', '제약', 'B2B 영업', '기타'];

export default function OnboardingScreen() {
  const { finishOnboarding, signOut } = useAuth();
  const [step, setStep] = useState<Step>('role');
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
      setError('이름을 입력해주세요');
      return;
    }
    if (role === 'salesperson' && !inviteCode.trim()) {
      setError('센터장이 알려준 초대 코드를 입력해주세요');
      return;
    }
    if (role === 'manager' && !orgName.trim()) {
      setError('센터(조직) 이름을 입력해주세요');
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
            <View style={styles.section}>
              <Text style={styles.title}>환영합니다! 👋</Text>
              <Text style={styles.subtitle}>어떤 역할로 가입하시겠어요?</Text>

              <TouchableOpacity style={styles.roleCard} onPress={() => setStep('salesperson')}>
                <Text style={styles.roleEmoji}>📱</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleTitle}>저는 영업맨이에요</Text>
                  <Text style={styles.roleSub}>
                    고객 관리 · 생명수 · 동선 영업 기능을 사용합니다
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.roleCard} onPress={() => setStep('manager')}>
                <Text style={styles.roleEmoji}>🖥️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleTitle}>저는 센터장이에요</Text>
                  <Text style={styles.roleSub}>
                    팀원 활동 통계를 모니터링하고 초대 코드를 발급합니다
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={signOut} style={styles.signOut}>
                <Text style={styles.signOutText}>다른 계정으로 로그인</Text>
              </TouchableOpacity>
            </View>
          ) : step === 'salesperson' ? (
            <View style={styles.section}>
              <TouchableOpacity onPress={() => setStep('role')} style={styles.back}>
                <Text style={styles.backText}>← 뒤로</Text>
              </TouchableOpacity>

              <Text style={styles.title}>영업맨 가입 📱</Text>
              <Text style={styles.subtitle}>센터장이 알려준 초대 코드가 필요해요</Text>

              <Text style={styles.label}>이름 *</Text>
              <TextInput style={styles.input} placeholder="홍길동" placeholderTextColor="#94A3B8" value={name} onChangeText={setName} />

              <Text style={styles.label}>연락처</Text>
              <TextInput
                style={styles.input}
                placeholder="010-1234-5678"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.label}>초대 코드 *</Text>
              <TextInput
                style={[styles.input, styles.inputCode]}
                placeholder="ABC123"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={inviteCode}
                onChangeText={(t) => setInviteCode(t.toUpperCase())}
                maxLength={6}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.submit, loading && styles.submitLoading]}
                onPress={() => handleFinish('salesperson')}
                disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>가입 완료</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section}>
              <TouchableOpacity onPress={() => setStep('role')} style={styles.back}>
                <Text style={styles.backText}>← 뒤로</Text>
              </TouchableOpacity>

              <Text style={styles.title}>센터장 가입 🖥️</Text>
              <Text style={styles.subtitle}>새 조직을 만들고 팀원을 초대하세요</Text>

              <Text style={styles.label}>이름 *</Text>
              <TextInput style={styles.input} placeholder="박센터장" placeholderTextColor="#94A3B8" value={name} onChangeText={setName} />

              <Text style={styles.label}>센터(조직) 이름 *</Text>
              <TextInput
                style={styles.input}
                placeholder="강남센터"
                placeholderTextColor="#94A3B8"
                value={orgName}
                onChangeText={setOrgName}
              />

              <Text style={styles.label}>업종</Text>
              <View style={styles.industryRow}>
                {INDUSTRIES.map((i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setIndustry(i)}
                    style={[styles.industryChip, industry === i && styles.industryChipActive]}>
                    <Text
                      style={[styles.industryText, industry === i && styles.industryTextActive]}>
                      {i}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.submit, loading && styles.submitLoading]}
                onPress={() => handleFinish('manager')}
                disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>조직 만들기</Text>}
              </TouchableOpacity>

              <Text style={styles.hint}>
                💡 조직 생성 후 초대 코드가 발급되고, 팀원에게 공유하면 가입할 수 있어요.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 24 },
  section: { flex: 1 },
  back: { marginBottom: 12 },
  backText: { color: '#64748B', fontWeight: '600', fontSize: 14 },

  title: { fontSize: 26, fontWeight: '800', color: '#0F172A', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 20 },

  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleEmoji: { fontSize: 36, marginRight: 14 },
  roleTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  roleSub: { fontSize: 13, color: '#64748B', marginTop: 4 },

  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputCode: { letterSpacing: 4, fontWeight: '700', textAlign: 'center', fontSize: 18 },

  error: { color: '#DC2626', fontSize: 13, marginTop: 12, fontWeight: '600' },
  submit: { backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  submitLoading: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, color: '#64748B', marginTop: 16, lineHeight: 18 },

  industryRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  industryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  industryChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  industryText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  industryTextActive: { color: '#FFFFFF' },

  signOut: { alignItems: 'center', marginTop: 24, padding: 12 },
  signOutText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
});
