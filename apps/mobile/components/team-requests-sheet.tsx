import { Ionicons } from '@expo/vector-icons';
import {
  approveTeamJoin,
  listPendingJoinRequests,
  rejectTeamJoin,
  type PendingRequestWithUser,
} from '@metsystem/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Palette, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

/**
 * 가입 신청 승인/거절 — 관리자 전용.
 */
export function TeamRequestsSheet({ visible, onClose, onChanged }: Props) {
  const [requests, setRequests] = useState<PendingRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPendingJoinRequests(supabase);
      setRequests(list);
    } catch (e) {
      console.warn('[team requests] load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void reload();
  }, [visible, reload]);

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      await approveTeamJoin(supabase, id);
      await reload();
      onChanged?.();
    } catch (e) {
      const err = e as { message?: string };
      if (typeof window !== 'undefined' && window.alert) window.alert(err.message ?? '승인 실패');
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason =
      typeof window !== 'undefined' && window.prompt
        ? window.prompt('거절 사유 (선택)') ?? undefined
        : undefined;
    setActing(id);
    try {
      await rejectTeamJoin(supabase, id, reason);
      await reload();
      onChanged?.();
    } catch (e) {
      const err = e as { message?: string };
      if (typeof window !== 'undefined' && window.alert) window.alert(err.message ?? '거절 실패');
    } finally {
      setActing(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>가입 신청 관리</Text>
          <Text style={styles.subtitle}>
            새 멤버 신청을 승인하거나 거절할 수 있어요
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Palette.primary} />
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={36} color={Palette.textMuted} />
              <Text style={styles.emptyText}>대기 중인 신청이 없어요</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 480 }}>
              {requests.map((r) => (
                <View key={r.id} style={styles.requestCard}>
                  <View style={styles.requestHead}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(r.user_name ?? r.user_email ?? '?').slice(0, 1)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestName}>{r.user_name ?? '이름 없음'}</Text>
                      <Text style={styles.requestEmail}>{r.user_email ?? ''}</Text>
                    </View>
                    <Text style={styles.requestDate}>{r.requested_at.slice(5, 10)}</Text>
                  </View>
                  {r.message && (
                    <View style={styles.messageBox}>
                      <Text style={styles.messageText}>"{r.message}"</Text>
                    </View>
                  )}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReject(r.id)}
                      disabled={acting === r.id}>
                      <Text style={styles.rejectBtnText}>거절</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(r.id)}
                      disabled={acting === r.id}>
                      {acting === r.id ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.approveBtnText}>승인</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>닫기</Text>
          </TouchableOpacity>
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
    maxHeight: '90%',
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

  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 13, color: Palette.textMuted },

  requestCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 8,
  },
  requestHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontWeight: '700', fontSize: 14, color: Palette.primaryDeep },
  requestName: { fontSize: 14, fontWeight: '700', color: Palette.textMain },
  requestEmail: { fontSize: 11, color: Palette.textSub, marginTop: 2 },
  requestDate: { fontSize: 10, color: Palette.textMuted, fontWeight: '600' },

  messageBox: {
    marginTop: 10,
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.sm,
    padding: 10,
  },
  messageText: { fontSize: 12, color: Palette.textMain, fontStyle: 'italic' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  rejectBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
    alignItems: 'center',
  },
  rejectBtnText: { fontSize: 12, fontWeight: '700', color: Palette.textSub },
  approveBtn: {
    flex: 1.6,
    paddingVertical: 9,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
  },
  approveBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  closeBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
});
