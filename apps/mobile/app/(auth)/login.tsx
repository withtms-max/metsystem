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
      setError('이메일이랑 비번 둘 다 적어주세요');
      return;
    }
    if (password.length < 6) {
      setError('비번은 6자 넘게요');
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
        '모바일 네이티브 카카오 로그인은 곧 업데이트 예정이에요',
      );
      return;
    }
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (err) {
        if (err.message.includes('provider is not enabled')) {
          Alert.alert('카카오 로그인 미설정', '아직 설정되지 않았어요');
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Palette.textMain} />
          </TouchableOpacity>

          <View style={styles.content}>
            <Text style={styles.title}>
              {mode === 'signin' ? (
                <>왔어요.{'\n'}오늘도 가볼까요?</>
              ) : (
                <>잘 오셨어요.{'\n'}같이 한번 시작해봐요</>
              )}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'signin' ? '오늘 한 명도 못 만났으면 안 되죠' : '이메일이든 카카오든 편한 거로'}
            </Text>

            <View style={styles.form}>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="이메일"
                  placeholderTextColor={Palette.textMuted}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="비번 (6자 넘게)"
                  placeholderTextColor={Palette.textMuted}
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.submit, loading && styles.submitLoading]}
                onPress={handleSubmit}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'signin' ? '들어가기' : '계정 만들고 시작'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>
                {mode === 'signin' ? '아직 계정 없어요?' : '벌써 만들었어요?'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}>
                <Text style={styles.switchLink}>
                  {mode === 'signin' ? '만들러 가기' : '로그인'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는 한 번에</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity activeOpacity={0.85} style={styles.kakaoBtn} onPress={handleKakao}>
              <Text style={styles.kakaoEmoji}>💬</Text>
              <Text style={styles.kakaoText}>카카오로 시작하기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '둘 중 하나가 틀렸어요';
  if (msg.includes('User already registered')) return '이 이메일로 벌써 가입했네요';
  if (msg.includes('rate limit')) return '너무 빨라요. 잠깐 쉬었다 다시';
  if (msg.includes('Missing EXPO_PUBLIC_SUPABASE')) return '키가 안 꽂혀 있어요 (.env.local 확인)';
  return msg;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  safe: { flex: 1 },

  backBtn: {
    width: 44,
    height: 44,
    marginLeft: 12,
    marginTop: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.textMain,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: { fontSize: 15, color: Palette.textSub, marginTop: 12 },

  form: { marginTop: 36, gap: 10 },
  inputWrap: {
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.borderStrong,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'center',
  },
  input: { fontSize: 16, color: Palette.textMain, fontWeight: '500' },

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
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitLoading: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  switchText: { color: Palette.textSub, fontSize: 14 },
  switchLink: { color: Palette.primary, fontSize: 14, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 28, gap: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Palette.borderStrong },
  dividerText: { fontSize: 13, color: Palette.textMuted, fontWeight: '500' },

  kakaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE500',
    height: 56,
    borderRadius: Radius.md,
    gap: 8,
  },
  kakaoEmoji: { fontSize: 16 },
  kakaoText: { color: '#191919', fontWeight: '700', fontSize: 16 },
});
