import { Ionicons } from '@expo/vector-icons';
import { getIndustry, INDUSTRIES, type IndustryCode } from '@metsystem/shared';
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

export default function TeamInfoScreen() {
  const router = useRouter();
  const { profile, organization, refreshProfile } = useAuth();
  const isManager = profile?.role === 'manager' || profile?.role === 'owner';

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState<IndustryCode>('general');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization) {
      setName(organization.name ?? '');
      setIndustry((organization.industry as IndustryCode) ?? 'general');
    }
  }, [organization]);

  const handleSave = async () => {
    setError(null);
    if (!isManager) return;
    if (!name.trim()) return setError('팀 이름을 입력해주세요');
    if (!organization) return;
    setLoading(true);
    try {
      const { error: updErr } = await supabase
        .from('organizations')
        .update({ name: name.trim(), industry })
        .eq('id', organization.id);
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

  const copyInviteCode = () => {
    const code = organization?.invite_code;
    if (!code) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
    }
  };

  if (!organization) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Palette.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>활성 팀 정보</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={36} color={Palette.textMuted} />
          <Text style={styles.emptyText}>활성 팀이 없어요</Text>
          <Text style={styles.emptySub}>
            팀에 가입하거나 새로 만들어보세요
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const industryDef = getIndustry(organization.industry);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Palette.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>활성 팀 정보</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* 초대 코드 — 모두 볼 수 있음 */}
          <View style={styles.inviteBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteLabel}>초대 코드</Text>
              <Text style={styles.inviteCode}>{organization.invite_code ?? '—'}</Text>
              <Text style={styles.inviteSub}>
                팀원에게 공유하면 가입 신청을 받을 수 있어요
              </Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={copyInviteCode}>
              <Ionicons name="copy-outline" size={14} color={Palette.primary} />
              <Text style={styles.copyBtnText}>복사</Text>
            </TouchableOpacity>
          </View>

          {!isManager && (
            <View style={styles.noticeBox}>
              <Ionicons name="information-circle" size={14} color={Palette.textSub} />
              <Text style={styles.noticeText}>
                팀 이름·업종은 관리자만 변경할 수 있어요
              </Text>
            </View>
          )}

          <Text style={styles.label}>팀 이름</Text>
          <TextInput
            style={[styles.input, !isManager && styles.inputDisabled]}
            value={name}
            onChangeText={setName}
            editable={isManager}
            placeholderTextColor={Palette.textMuted}
          />

          <Text style={styles.label}>업종</Text>
          {!isManager ? (
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.inputDisabledText}>
                {industryDef.emoji} {industryDef.label}
              </Text>
            </View>
          ) : (
            <View style={styles.industryRow}>
              {INDUSTRIES.map((i) => (
                <TouchableOpacity
                  key={i.code}
                  style={[
                    styles.industryChip,
                    industry === i.code && styles.industryChipActive,
                  ]}
                  onPress={() => setIndustry(i.code)}>
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
          )}

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

          {isManager && (
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
          )}
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

  inviteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.primarySoft,
    padding: 14,
    borderRadius: Radius.md,
    marginBottom: 14,
  },
  inviteLabel: { fontSize: 10, color: Palette.primaryDeep, fontWeight: '600' },
  inviteCode: { fontSize: 24, fontWeight: '800', color: Palette.primaryDeep, letterSpacing: 4, marginTop: 4 },
  inviteSub: { fontSize: 11, color: Palette.primary, marginTop: 4 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
  },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: Palette.primary },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.grayBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginBottom: 10,
  },
  noticeText: { fontSize: 11, color: Palette.textSub, fontWeight: '500', flex: 1 },

  label: { fontSize: 12, fontWeight: '700', color: Palette.textSub, marginTop: 12, marginBottom: 6 },
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

  industryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  industryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
  },
  industryChipActive: { backgroundColor: Palette.primary },
  industryText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },
  industryTextActive: { color: '#FFFFFF' },

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

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '700', color: Palette.textMain },
  emptySub: { fontSize: 12, color: Palette.textSub, textAlign: 'center' },
});
