import { Ionicons } from '@expo/vector-icons';
import {
  createTeam,
  INDUSTRIES,
  type IndustryCode,
} from '@metsystem/shared';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

/**
 * 새 팀 만들기 — 본인이 owner 가 되는 새 조직 생성.
 */
export function TeamCreateSheet({ visible, onClose, onCreated }: Props) {
  const { refreshProfile } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [industry, setIndustry] = useState<IndustryCode>('insurance');
  const [setActive, setSetActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTeamName('');
    setIndustry('insurance');
    setSetActive(true);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!teamName.trim()) return setError('팀 이름을 입력해주세요');
    setLoading(true);
    try {
      await createTeam(supabase, teamName.trim(), industry, setActive);
      await refreshProfile();
      reset();
      onCreated?.();
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? '팀 만들기 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />

            <Text style={styles.title}>새 팀 만들기</Text>
            <Text style={styles.subtitle}>
              내가 관리자가 되어 팀원을 초대할 수 있어요
            </Text>

            <Text style={styles.label}>팀 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="강남팀 / 우리 가족 / 광림교회 셀"
              placeholderTextColor={Palette.textMuted}
              value={teamName}
              onChangeText={setTeamName}
              autoFocus
            />

            <Text style={styles.label}>업종</Text>
            <Text style={styles.hint}>고객 등록 화면이 업종에 맞게 달라져요</Text>
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

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setSetActive((v) => !v)}>
              <Ionicons
                name={setActive ? 'checkbox' : 'square-outline'}
                size={20}
                color={setActive ? Palette.primary : Palette.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>만들고 바로 활성 팀으로</Text>
                <Text style={styles.toggleHint}>
                  체크 해제 시 기존 활성 팀이 유지돼요 (팀 스위처로 나중에 전환 가능)
                </Text>
              </View>
            </TouchableOpacity>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={14} color={Palette.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>팀 만들기</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.borderStrong,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: Palette.textSub, marginTop: 4, marginBottom: 14 },

  label: { fontSize: 12, fontWeight: '700', color: Palette.textSub, marginTop: 10, marginBottom: 6 },
  hint: { fontSize: 11, color: Palette.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Palette.textMain,
  },

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

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    backgroundColor: Palette.grayBg,
    padding: 12,
    borderRadius: Radius.md,
  },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  toggleHint: { fontSize: 11, color: Palette.textSub, marginTop: 2, lineHeight: 16 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 12,
  },
  errorText: { fontSize: 12, color: Palette.red, fontWeight: '500', flex: 1 },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  submitBtn: {
    flex: 1.6,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
