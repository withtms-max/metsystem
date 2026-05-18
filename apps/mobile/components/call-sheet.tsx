import { Ionicons } from '@expo/vector-icons';
import { completeCall, type Customer } from '@metsystem/shared';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GradeColor, Palette, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Props {
  /** startCall() 가 반환한 activity_log id — 있으면 모달 활성 */
  callLogId: string | null;
  /** 어느 고객한테 전화 걸었는지 (헤더 표시용) */
  customer: Customer | null;
  /** 닫기 — 모달이 닫히기만 함, log 는 그대로 (status=in_progress) */
  onClose: () => void;
  /** 저장 완료 시 호출 — 활동 캐시 reload 트리거 */
  onSaved?: () => void;
}

/**
 * 통화 후 돌아와서 1초 메모 — 빠른 인풋이 핵심.
 */
export function CallSheet({ callLogId, customer, onClose, onSaved }: Props) {
  const [note, setNote] = useState('');
  const [mood, setMood] = useState<'good' | 'neutral' | 'bad' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (callLogId) {
      setNote('');
      setMood(null);
      setError(null);
    }
  }, [callLogId]);

  const handleSubmit = async (status: 'completed' | 'cancelled') => {
    if (!callLogId) return;
    setError(null);
    setLoading(true);
    try {
      await completeCall(supabase, {
        activityLogId: callLogId,
        status,
        note: note.trim() || undefined,
        mood: mood ?? undefined,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  if (!callLogId || !customer) return null;

  const grade = GradeColor[customer.grade];

  return (
    <Modal
      visible={!!callLogId}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <Text style={styles.title}>통화 어땠어요?</Text>
          <Text style={styles.subtitle}>
            {customer.company ?? customer.name}님과의 통화 1초만 기록할게요
          </Text>

          {/* 분위기 */}
          <View style={styles.moodRow}>
            <MoodChip
              label="좋음"
              icon="happy-outline"
              active={mood === 'good'}
              activeColor={Palette.green}
              onPress={() => setMood(mood === 'good' ? null : 'good')}
            />
            <MoodChip
              label="보통"
              icon="remove-outline"
              active={mood === 'neutral'}
              activeColor={Palette.textSub}
              onPress={() => setMood(mood === 'neutral' ? null : 'neutral')}
            />
            <MoodChip
              label="안 받음"
              icon="close-outline"
              active={mood === 'bad'}
              activeColor={Palette.red}
              onPress={() => setMood(mood === 'bad' ? null : 'bad')}
            />
          </View>

          {/* 메모 */}
          <TextInput
            style={styles.noteInput}
            placeholder="한 줄 메모 (선택) — 다음 주 미팅 잡기로 함, 자료 보내기로 함..."
            placeholderTextColor={Palette.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            autoFocus
          />

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color={Palette.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* 액션 */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleSubmit('cancelled')}
              disabled={loading}>
              <Text style={styles.cancelBtnText}>통화 취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: grade.dot }]}
              onPress={() => handleSubmit('completed')}
              disabled={loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>완료 · 기록</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 나중에 적기 */}
          <TouchableOpacity style={styles.laterBtn} onPress={onClose}>
            <Text style={styles.laterBtnText}>나중에 적을게요</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MoodChip({
  label,
  icon,
  active,
  activeColor,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.moodChip, active && { backgroundColor: activeColor }]}
      onPress={onPress}
      activeOpacity={0.75}>
      <Ionicons
        name={icon}
        size={18}
        color={active ? '#FFFFFF' : Palette.textSub}
      />
      <Text style={[styles.moodChipText, active && { color: '#FFFFFF' }]}>
        {label}
      </Text>
    </TouchableOpacity>
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
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.borderStrong,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: Palette.textSub, marginTop: 4, marginBottom: 16 },

  moodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  moodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
  },
  moodChipText: { fontSize: 13, fontWeight: '600', color: Palette.textSub },

  noteInput: {
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Palette.textMain,
    minHeight: 80,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 10,
  },
  errorText: { fontSize: 12, color: Palette.red, fontWeight: '500', flex: 1 },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: Palette.textSub },
  submitBtn: {
    flex: 1.6,
    paddingVertical: 13,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  laterBtn: { marginTop: 10, paddingVertical: 8, alignItems: 'center' },
  laterBtnText: { fontSize: 12, color: Palette.textMuted, fontWeight: '500' },
});
