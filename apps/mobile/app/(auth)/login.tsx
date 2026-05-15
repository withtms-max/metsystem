import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from '@/lib/supabase';
import { Palette, Radius } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(
    initialMode === 'signup' ? 'signup' : 'signin',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialMode === 'signup') setMode('signup');
  }, [initialMode]);

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
      setError(translateError(e instanceof Error ? e.message : '오류 발생'));
    } finally {
      setLoading(false);
    }
  };

  const handleKakao = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        '카카오 로그인',
        '모바일 네이티브 카카오 로그인은 Sprint 2 후반 업데이트 예정입니다.',
      );
      return;
    }
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (err) {
        if (err.message.includes('provider is not enabled')) {
          Alert.alert(
            '카카오 로그인 미설정',
            'Supabase 대시보드에서 Authentication → Providers → Kakao 활성화가 필요해요.\n\n1. Kakao Developers에서 앱 생성\n2. REST API 키 발급\n3. Supabase Auth에 등록',
          );
        } else {
          setError(err.message);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '카카오 로그인 실패');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Palette.textMain} />
          </TouchableOpacity>

          <View style={styles.content}>
            <Text style={styles.title}>
              {mode === 'signin' ? '다시 만나서 반가워요' : '시작해볼까요?'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'signin'
                ? '계정으로 로그인하고 오늘의 영업을 이어가세요'
                : '이메일로 가입하거나 카카오로 시작하세요'}
            </Text>

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

            {/* 카카오 로그인 — 한국 사용자 우선 */}
            <TouchableOpacity style={styles.kakaoBtn} onPress={handleKakao}>
              <View style={styles.kakaoBubble}>
                <Text style={styles.kakaoBubbleText}>💬</Text>
              </View>
              <Text style={styles.kakaoText}>카카오로 시작하기</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는 이메일로</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.label}>이메일</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={16} color={Palette.textMuted} />
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={Palette.textMuted}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.label}>비밀번호</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={Palette.textMuted} />
              <TextInput
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="6자 이상"
                placeholderTextColor={Palette.textMuted}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Palette.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submit, loading && styles.submitLoading]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'signin' ? '로그인' : '가입하기'}
                </Text>
              )}
            </TouchableOpacity>

            {mode === 'signin' && (
              <TouchableOpacity style={styles.linkBtn}>
                <Text style={styles.linkText}>비밀번호를 잊으셨어요?</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 틀려요';
  if (msg.includes('User already registered')) return '이미 가입된 이메일이에요';
  if (msg.includes('rate limit')) return '잠시 후 다시 시도해주세요';
  if (msg.includes('Missing EXPO_PUBLIC_SUPABASE'))
    return '⚠️ Supabase 환경변수 미설정 — .env.local 확인 필요';
  return msg;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  safe: { flex: 1 },

  backBtn: {
    width: 40,
    height: 40,
    margin: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },

  title: { fontSize: 24, fontWeight: '800', color: Palette.textMain, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: Palette.textSub, marginTop: 8, lineHeight: 20 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    padding: 3,
    marginTop: 24,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 13, fontWeight: '600', color: Palette.textSub },
  tabTextActive: { color: Palette.textMain },

  kakaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE500',
    height: 50,
    borderRadius: Radius.md,
    gap: 8,
  },
  kakaoBubble: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
  kakaoBubbleText: { fontSize: 14 },
  kakaoText: { color: '#191919', fontWeight: '700', fontSize: 14 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Palette.border },
  dividerText: { fontSize: 11, color: Palette.textMuted, fontWeight: '500' },

  label: { fontSize: 12, fontWeight: '700', color: Palette.textSub, marginBottom: 6, marginTop: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: { flex: 1, fontSize: 14, color: Palette.textMain },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 14,
  },
  errorText: { color: '#991B1B', fontSize: 13, fontWeight: '500', flex: 1 },

  submit: {
    backgroundColor: Palette.primary,
    height: 50,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitLoading: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  linkBtn: { alignSelf: 'center', paddingVertical: 14 },
  linkText: { color: Palette.textSub, fontSize: 13, fontWeight: '500' },
});
