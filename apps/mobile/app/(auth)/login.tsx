import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithPassword(email.trim(), password);
      } else {
        await signUpWithPassword(email.trim(), password);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '오류가 발생했어요';
      setError(translateError(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <View style={styles.inner}>
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>M</Text>
            </View>
            <Text style={styles.title}>MET System</Text>
            <Text style={styles.subtitle}>영업맨을 위한 AI 모바일 비서</Text>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'signin' && styles.tabActive]}
              onPress={() => setMode('signin')}>
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                로그인
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => setMode('signup')}>
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                회원가입
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              placeholder="6자 이상"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submit, loading && styles.submitLoading]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'signin' ? '로그인하기' : '가입하기'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              {mode === 'signup'
                ? '가입 후 가입 안내 이메일이 발송될 수 있어요'
                : '비밀번호를 잊으셨나요? 곧 비밀번호 재설정 기능을 추가할게요.'}
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>카카오 로그인은 Sprint 2에 추가됩니다 🟡</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 틀려요';
  if (msg.includes('User already registered')) return '이미 가입된 이메일이에요';
  if (msg.includes('rate limit')) return '잠시 후 다시 시도해주세요';
  if (msg.includes('Missing EXPO_PUBLIC_SUPABASE'))
    return '⚠️ Supabase 환경변수 미설정 — .env.local에 키 입력 필요';
  return msg;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  inner: { flex: 1, padding: 24, justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: 24 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: { color: '#FFFFFF', fontSize: 36, fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },

  tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4, marginVertical: 24 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#2563EB' },
  tabText: { fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },

  form: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 12 },
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
  error: { color: '#DC2626', fontSize: 13, marginTop: 12, fontWeight: '600' },
  submit: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitLoading: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 16 },

  footer: { alignItems: 'center', marginBottom: 12 },
  footerText: { fontSize: 11, color: '#CBD5E1' },
});
