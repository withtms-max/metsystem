import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

export default function ProfileEditScreen() {
  const router = useRouter();
  const { authUser, profile, refreshProfile } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) return setError('이름을 적어주세요');
    if (!authUser) return setError('로그인이 필요해요');
    setLoading(true);
    try {
      const { error: updErr } = await supabase
        .from('users')
        .update({ name: name.trim(), phone: phone.trim() || null })
        .eq('id', authUser.id);
      if (updErr) throw updErr;
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Palette.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내 정보 수정</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.label}>이메일</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.inputDisabledText}>{authUser?.email ?? '—'}</Text>
          </View>
          <Text style={styles.hint}>이메일은 변경할 수 없어요</Text>

          <Text style={styles.label}>이름 *</Text>
          <TextInput
            style={styles.input}
            placeholder="홍길동"
            placeholderTextColor={Palette.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>연락처</Text>
          <TextInput
            style={styles.input}
            placeholder="010-1234-5678"
            placeholderTextColor={Palette.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color={Palette.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {saved && (
            <View style={styles.savedBox}>
              <Ionicons name="checkmark-circle" size={14} color={Palette.green} />
              <Text style={styles.savedText}>저장됐어요</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnLoading]}
            onPress={handleSave}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>저장</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Palette.card,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Palette.textMain, textAlign: 'center' },

  scroll: { padding: 20 },
  label: { fontSize: 12, fontWeight: '700', color: Palette.textSub, marginTop: 14, marginBottom: 6 },
  hint: { fontSize: 11, color: Palette.textMuted, marginTop: 4 },
  input: {
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Palette.textMain,
    borderWidth: 1,
    borderColor: Palette.borderStrong,
  },
  inputDisabled: { backgroundColor: Palette.grayBg },
  inputDisabledText: { fontSize: 14, color: Palette.textSub },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 14,
  },
  errorText: { fontSize: 12, color: Palette.red, fontWeight: '500', flex: 1 },
  savedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 14,
  },
  savedText: { fontSize: 12, color: Palette.green, fontWeight: '600' },

  saveBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
  },
  saveBtnLoading: { opacity: 0.7 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
