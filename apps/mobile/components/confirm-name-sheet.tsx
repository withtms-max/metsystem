import { Ionicons } from '@expo/vector-icons';
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
import { Palette, Radius } from '@/constants/theme';

interface Props {
  visible: boolean;
  /** 확인 받을 이름 (정확히 입력해야 활성화) */
  confirmName: string;
  title: string;
  description: string;
  /** 위험 버튼 라벨 — 예: "탈퇴", "내보내기", "삭제" */
  destructiveLabel: string;
  /** 입력 보조 라벨 — 예: "팀 이름을 정확히 입력해주세요" */
  inputLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

/**
 * GitHub 스타일 위험 작업 확인 모달.
 * 사용자가 대상 이름을 정확히 입력해야 활성화됨.
 */
export function ConfirmNameSheet({
  visible,
  confirmName,
  title,
  description,
  destructiveLabel,
  inputLabel,
  onClose,
  onConfirm,
}: Props) {
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) setTyped('');
  }, [visible]);

  const matched = typed.trim() === confirmName.trim();

  const handleConfirm = async () => {
    if (!matched || loading) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setTyped('');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerIcon}>
            <Ionicons name="warning" size={28} color={Palette.red} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{description}</Text>

          <View style={styles.echoBox}>
            <Text style={styles.echoLabel}>{inputLabel ?? '확인을 위해 아래 이름을 그대로 입력해주세요'}</Text>
            <Text style={styles.echoTarget}>{confirmName}</Text>
          </View>

          <TextInput
            style={[styles.input, matched && styles.inputMatched]}
            placeholder={confirmName}
            placeholderTextColor={Palette.textMuted}
            value={typed}
            onChangeText={setTyped}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.destructiveBtn, !matched && styles.destructiveBtnDisabled]}
              onPress={handleConfirm}
              disabled={!matched || loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.destructiveBtnText}>{destructiveLabel}</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 22,
    width: '100%',
    maxWidth: 380,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textMain,
    textAlign: 'center',
    marginBottom: 6,
  },
  desc: {
    fontSize: 12,
    color: Palette.textSub,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  echoBox: {
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  echoLabel: {
    fontSize: 11,
    color: Palette.textSub,
    fontWeight: '500',
  },
  echoTarget: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.textMain,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.borderStrong,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: Palette.textMain,
  },
  inputMatched: { borderColor: Palette.green, backgroundColor: '#F0FDF4' },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  destructiveBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.red,
    alignItems: 'center',
  },
  destructiveBtnDisabled: { backgroundColor: Palette.borderStrong },
  destructiveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
