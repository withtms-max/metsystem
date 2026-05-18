import { Ionicons } from '@expo/vector-icons';
import { requestTeamJoin } from '@metsystem/shared';
import { useState } from 'react';
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
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onRequested?: () => void;
}

/**
 * 팀 가입 신청 — 초대 코드 입력 후 관리자 승인 대기.
 */
export function TeamJoinSheet({ visible, onClose, onRequested }: Props) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCode('');
    setMessage('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!code.trim()) return setError('초대 코드를 입력해주세요');
    if (code.trim().length < 4) return setError('초대 코드를 다시 확인해주세요');
    setLoading(true);
    try {
      await requestTeamJoin(supabase, code.trim().toUpperCase(), message.trim() || undefined);
      setSuccess(true);
      onRequested?.();
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? '신청 실패');
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
          <View style={styles.handle} />

          {success ? (
            <View style={styles.successBox}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>가입 신청 완료!</Text>
              <Text style={styles.successText}>
                관리자가 승인하면 팀 목록에 추가돼요.{'\n'}프로필에서 신청 상태를 확인할 수 있어요.
              </Text>
              <TouchableOpacity style={styles.successBtn} onPress={handleClose}>
                <Text style={styles.successBtnText}>닫기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.title}>팀 추가</Text>
              <Text style={styles.subtitle}>
                관리자한테 받은 6자리 초대 코드를 입력하면 가입 신청이 들어가요
              </Text>

              <Text style={styles.label}>초대 코드</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="ABC123"
                placeholderTextColor={Palette.textMuted}
                autoCapitalize="characters"
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                maxLength={8}
                autoFocus
              />

              <Text style={styles.label}>인사말 (선택)</Text>
              <TextInput
                style={[styles.input, styles.msgInput]}
                placeholder="안녕하세요, 신입 김OO 입니다"
                placeholderTextColor={Palette.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
              />

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
                    <Text style={styles.submitBtnText}>가입 신청</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
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
  input: {
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Palette.textMain,
  },
  codeInput: { letterSpacing: 8, fontWeight: '700', textAlign: 'center', fontSize: 18 },
  msgInput: { minHeight: 60 },

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

  successBox: { alignItems: 'center', paddingVertical: 12 },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: { fontSize: 17, fontWeight: '700', color: Palette.textMain, marginBottom: 8 },
  successText: {
    fontSize: 13,
    color: Palette.textSub,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  successBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
  },
  successBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
