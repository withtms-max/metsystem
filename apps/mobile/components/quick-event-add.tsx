import { Ionicons } from '@expo/vector-icons';
import {
  formatParsedDate,
  logActivity,
  parseNaturalDate,
  type Customer,
} from '@metsystem/shared';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useCustomers } from '@/hooks/use-customers';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

const EXAMPLES = [
  '내일 김철수 미팅',
  '다음주 금요일 박부장',
  '5/25 이영희 통화',
  '모레 신한금융 방문',
];

export function QuickEventAdd({ visible, onClose, onAdded }: Props) {
  const { authUser, profile } = useAuth();
  const { customers } = useCustomers();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseNaturalDate(text), [text]);

  // 입력 라벨에 고객 이름이 포함되면 자동 매칭
  const matchedCustomer: Customer | null = useMemo(() => {
    if (!parsed.label) return null;
    const labelNorm = parsed.label.toLowerCase();
    return (
      customers.find((c) => {
        if (c.name && labelNorm.includes(c.name.toLowerCase())) return true;
        if (c.company && labelNorm.includes(c.company.toLowerCase())) return true;
        return false;
      }) ?? null
    );
  }, [parsed.label, customers]);

  const handleSubmit = async () => {
    setError(null);
    if (!text.trim()) {
      setError('일정 내용을 적어주세요');
      return;
    }
    if (!parsed.date) {
      setError('날짜를 인식하지 못했어요. 예: "내일 김철수 미팅"');
      return;
    }
    if (!authUser || !profile?.organization_id) {
      setError('로그인이 필요해요');
      return;
    }
    setLoading(true);
    try {
      await logActivity(supabase, {
        user_id: authUser.id,
        organization_id: profile.organization_id,
        customer_id: matchedCustomer?.id ?? null,
        activity_type: 'memo',
        status: 'scheduled',
        activity_date: parsed.date,
        note: text.trim(),
        source: 'quick_add',
        duration_seconds: null,
        mood: null,
      });
      setText('');
      onAdded?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '저장 실패';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setText('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <Text style={styles.title}>빠른 일정 추가</Text>
          <Text style={styles.subtitle}>자연스럽게 적으면 날짜와 고객을 자동으로 인식해요</Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="예: 내일 김철수 미팅"
              placeholderTextColor={Palette.textMuted}
              value={text}
              onChangeText={setText}
              autoFocus={Platform.OS === 'web'}
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
            />
          </View>

          {/* 파싱 미리보기 */}
          {text.trim().length > 0 && (
            <View style={styles.preview}>
              {parsed.date ? (
                <>
                  <View style={styles.previewRow}>
                    <Ionicons name="calendar-outline" size={14} color={Palette.primary} />
                    <Text style={styles.previewLabel}>날짜</Text>
                    <Text style={styles.previewValue}>{formatParsedDate(parsed.date)}</Text>
                  </View>
                  {matchedCustomer && (
                    <View style={styles.previewRow}>
                      <Ionicons name="person-outline" size={14} color={Palette.primary} />
                      <Text style={styles.previewLabel}>고객</Text>
                      <Text style={styles.previewValue}>
                        {matchedCustomer.company ?? matchedCustomer.name}
                      </Text>
                    </View>
                  )}
                  <View style={styles.previewRow}>
                    <Ionicons name="document-text-outline" size={14} color={Palette.textSub} />
                    <Text style={styles.previewLabel}>내용</Text>
                    <Text style={styles.previewValue} numberOfLines={2}>
                      {parsed.label || '(없음)'}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.previewHint}>날짜 키워드가 필요해요 (오늘 / 내일 / 5/20 / 다음주 금요일)</Text>
              )}
            </View>
          )}

          {/* 예시 */}
          {!text.trim() && (
            <View style={styles.examples}>
              <Text style={styles.examplesLabel}>예시 입력</Text>
              {EXAMPLES.map((ex) => (
                <TouchableOpacity
                  key={ex}
                  style={styles.exampleChip}
                  onPress={() => setText(ex)}
                  activeOpacity={0.7}>
                  <Text style={styles.exampleText}>{ex}</Text>
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

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, !parsed.date && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!parsed.date || loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>추가</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
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

  inputWrap: {
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { fontSize: 16, color: Palette.textMain },

  preview: {
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 12,
    gap: 6,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSub,
    width: 36,
  },
  previewValue: {
    flex: 1,
    fontSize: 13,
    color: Palette.textMain,
    fontWeight: '600',
  },
  previewHint: {
    fontSize: 12,
    color: Palette.textSub,
    fontStyle: 'italic',
  },

  examples: { marginTop: 16, gap: 6 },
  examplesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textSub,
    marginBottom: 4,
  },
  exampleChip: {
    backgroundColor: Palette.grayBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  exampleText: { fontSize: 13, color: Palette.textMain },

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
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Palette.textMain },
  submitBtn: {
    flex: 1.6,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: Palette.borderStrong },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
