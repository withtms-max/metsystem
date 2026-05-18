import { Ionicons } from '@expo/vector-icons';
import {
  listTeamMembers,
  removeTeamMember,
  type TeamMember,
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
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function TeamMembersSheet({ visible, onClose }: Props) {
  const { authUser, profile, organization } = useAuth();
  const isManager = profile?.role === 'manager' || profile?.role === 'owner';

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const list = await listTeamMembers(supabase, organization.id);
      setMembers(list);
    } catch (e) {
      console.warn('[members] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    if (visible) void reload();
  }, [visible, reload]);

  const handleRemove = async (userId: string, name: string) => {
    if (!organization) return;
    const reason =
      typeof window !== 'undefined' && window.prompt
        ? window.prompt(`"${name}" 님을 내보낼까요? 사유 (선택)`) ?? undefined
        : undefined;
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(`정말 "${name}" 님을 내보낼까요?`)) return;
    }
    setActing(userId);
    try {
      await removeTeamMember(supabase, userId, organization.id, reason);
      await reload();
    } catch (e) {
      const err = e as { message?: string };
      if (typeof window !== 'undefined' && window.alert) window.alert(err.message ?? '내보내기 실패');
    } finally {
      setActing(null);
    }
  };

  const inviteCode = organization?.invite_code ?? '';

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
          <Text style={styles.title}>팀원 관리</Text>
          <Text style={styles.subtitle}>{organization?.name ?? '조직'} · {members.length}명</Text>

          {isManager && inviteCode && (
            <View style={styles.inviteBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteLabel}>초대 코드</Text>
                <Text style={styles.inviteCode}>{inviteCode}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    void navigator.clipboard.writeText(inviteCode);
                  }
                }}>
                <Ionicons name="copy-outline" size={14} color={Palette.primary} />
                <Text style={styles.copyBtnText}>복사</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Palette.primary} />
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {members.map((m) => {
                const isMe = m.user.id === authUser?.id;
                const canRemove =
                  isManager && !isMe && m.membership.role !== 'owner';
                return (
                  <View key={m.user.id} style={styles.memberRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(m.user.name ?? '?').slice(0, 1)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.memberHead}>
                        <Text style={styles.memberName}>{m.user.name ?? '이름 없음'}</Text>
                        {isMe && <Text style={styles.meTag}>나</Text>}
                      </View>
                      <Text style={styles.memberMeta}>
                        {roleLabel(m.membership.role)}
                        {m.user.email ? ` · ${m.user.email}` : ''}
                      </Text>
                    </View>
                    {canRemove ? (
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemove(m.user.id, m.user.name ?? '멤버')}
                        disabled={acting === m.user.id}>
                        {acting === m.user.id ? (
                          <ActivityIndicator size="small" color={Palette.red} />
                        ) : (
                          <Ionicons name="person-remove-outline" size={16} color={Palette.red} />
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
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

function roleLabel(role: string): string {
  if (role === 'owner') return '오너';
  if (role === 'manager') return '관리자';
  return '팀원';
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

  inviteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.primarySoft,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  inviteLabel: { fontSize: 10, color: Palette.primaryDeep, fontWeight: '600' },
  inviteCode: { fontSize: 18, fontWeight: '800', color: Palette.primaryDeep, letterSpacing: 4 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
  },
  copyBtnText: { fontSize: 11, fontWeight: '700', color: Palette.primary },

  loadingBox: { paddingVertical: 60, alignItems: 'center' },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 6,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.grayBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontWeight: '700', fontSize: 15, color: Palette.textMain },
  memberHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 13, fontWeight: '700', color: Palette.textMain },
  meTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: Palette.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  memberMeta: { fontSize: 11, color: Palette.textSub, marginTop: 2 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
});
