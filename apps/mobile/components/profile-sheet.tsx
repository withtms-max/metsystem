import { Ionicons } from '@expo/vector-icons';
import {
  getIndustry,
  leaveTeam,
  listMyJoinRequests,
  listMyTeams,
  switchActiveTeam,
  type JoinRequest,
  type MyTeam,
} from '@metsystem/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  getNotificationPermission,
  permissionLabel,
  requestNotificationPermission,
  type NotificationPermission,
} from '@/lib/web-notifications';
import { TeamJoinSheet } from '@/components/team-join-sheet';
import { supabase } from '@/lib/supabase';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { Palette, Radius } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ProfileSheet({ visible, onClose }: Props) {
  const { profile, authUser, organization, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const industryDef = getIndustry(organization?.industry);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [myTeams, setMyTeams] = useState<MyTeam[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [joinOpen, setJoinOpen] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const reloadTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const [teams, reqs] = await Promise.all([
        listMyTeams(supabase),
        listMyJoinRequests(supabase),
      ]);
      setMyTeams(teams);
      setPendingRequests(reqs.filter((r) => r.status === 'pending'));
    } catch (e) {
      console.warn('[profile teams] load failed', e);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setNotifPerm(getNotificationPermission());
      void reloadTeams();
    }
  }, [visible, reloadTeams]);

  const handleSwitch = async (orgId: string) => {
    if (orgId === organization?.id) return;
    try {
      await switchActiveTeam(supabase, orgId);
      await refreshProfile();
      onClose();
    } catch (e) {
      console.warn('[switch team] failed', e);
    }
  };

  const handleLeave = async (orgId: string, orgName: string) => {
    const ok =
      typeof window !== 'undefined' && window.confirm
        ? window.confirm(`"${orgName}" 팀에서 탈퇴할까요? 이 팀의 데이터는 더 이상 보이지 않게 돼요.`)
        : true;
    if (!ok) return;
    try {
      await leaveTeam(supabase, orgId);
      await refreshProfile();
      await reloadTeams();
    } catch (e) {
      const err = e as { message?: string };
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(err.message ?? '탈퇴 실패');
      }
    }
  };

  const handleEnableNotif = async () => {
    const result = await requestNotificationPermission();
    setNotifPerm(result);
  };

  const doSignOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
      onClose();
      // 명시적 라우팅 — AuthGate 의 onAuthStateChange 타이밍 의존 안 함
      router.replace('/(auth)/welcome');
    } catch (e) {
      console.error('[signOut] failed', e);
      setLoggingOut(false);
      if (Platform.OS === 'web') {
        window.alert('로그아웃 실패. 새로고침 후 다시 시도해주세요.');
      } else {
        Alert.alert('오류', '로그아웃에 실패했어요. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  const handleSignOut = () => {
    // Alert.alert 는 RN Web 에서 destructive 버튼 콜백이 안 불림 → window.confirm 사용
    if (Platform.OS === 'web') {
      if (window.confirm('정말 로그아웃 할까요?')) {
        void doSignOut();
      }
      return;
    }
    Alert.alert('로그아웃', '정말 로그아웃 할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: doSignOut },
    ]);
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
          {/* 핸들 */}
          <View style={styles.handle} />

          {/* 프로필 헤더 */}
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.name?.slice(0, 1) ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{profile?.name ?? '이름 없음'}</Text>
              <Text style={styles.email}>{authUser?.email ?? ''}</Text>
              {profile?.role && (
                <View style={styles.roleChip}>
                  <Text style={styles.roleChipText}>
                    {profile.role === 'salesperson'
                      ? '영업맨'
                      : profile.role === 'manager'
                      ? '센터장'
                      : '오너'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* 내가 속한 팀 목록 */}
          <View style={styles.teamsBox}>
            <View style={styles.teamsHead}>
              <Text style={styles.teamsLabel}>내가 속한 팀</Text>
              <TouchableOpacity
                style={styles.teamAddBtn}
                onPress={() => setJoinOpen(true)}>
                <Ionicons name="add" size={14} color={Palette.primary} />
                <Text style={styles.teamAddBtnText}>팀 추가</Text>
              </TouchableOpacity>
            </View>
            {teamsLoading && myTeams.length === 0 ? (
              <ActivityIndicator size="small" color={Palette.primary} />
            ) : myTeams.length === 0 ? (
              <Text style={styles.teamsEmpty}>아직 속한 팀이 없어요</Text>
            ) : (
              myTeams.map((t) => {
                const isActive = t.organization.id === organization?.id;
                const def = getIndustry(t.organization.industry);
                return (
                  <View key={t.organization.id} style={styles.teamRow}>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => handleSwitch(t.organization.id)}
                      activeOpacity={0.8}>
                      <View style={styles.teamRowHead}>
                        <Text style={styles.teamName}>{t.organization.name}</Text>
                        {isActive && (
                          <View style={styles.activePill}>
                            <Text style={styles.activePillText}>활성</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.teamIndustry}>
                        {def.emoji} {def.label} · {membershipRoleLabel(t.membership.role)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleLeave(t.organization.id, t.organization.name)}
                      hitSlop={6}>
                      <Ionicons name="exit-outline" size={16} color={Palette.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {pendingRequests.length > 0 && (
              <View style={styles.pendingBox}>
                <Ionicons name="time-outline" size={12} color={Palette.orange} />
                <Text style={styles.pendingText}>
                  가입 신청 {pendingRequests.length}건 · 관리자 승인 대기 중
                </Text>
              </View>
            )}
          </View>

          {/* 활성 조직 업종 표시 */}
          {organization && (
            <View style={styles.orgBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orgName}>{organization.name}</Text>
                <Text style={styles.orgIndustry}>
                  {industryDef.emoji} {industryDef.label} · {industryDef.desc}
                </Text>
              </View>
            </View>
          )}

          {/* 메뉴 */}
          <MenuItem icon="person-outline" label="내 정보 수정" onPress={onClose} />
          <MenuItem icon="business-outline" label="조직 정보" onPress={onClose} />

          {/* 알림 권한 */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={notifPerm === 'granted' ? undefined : handleEnableNotif}
            disabled={notifPerm === 'granted' || notifPerm === 'unavailable'}>
            <Ionicons name="notifications-outline" size={18} color={Palette.textMain} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>브라우저 알림</Text>
              <Text style={styles.menuSub}>{permissionLabel(notifPerm)}</Text>
            </View>
            {notifPerm !== 'granted' && notifPerm !== 'unavailable' && (
              <Text style={styles.menuAction}>허용</Text>
            )}
          </TouchableOpacity>

          <MenuItem icon="help-circle-outline" label="도움말" onPress={onClose} />

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleSignOut}
            disabled={loggingOut}>
            {loggingOut ? (
              <ActivityIndicator color={Palette.red} size="small" />
            ) : (
              <Ionicons name="log-out-outline" size={18} color={Palette.red} />
            )}
            <Text style={styles.logoutText}>
              {loggingOut ? '로그아웃 중...' : '로그아웃'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 8 }} />
        </Pressable>
      </Pressable>

      <TeamJoinSheet
        visible={joinOpen}
        onClose={() => setJoinOpen(false)}
        onRequested={reloadTeams}
      />
    </Modal>
  );
}

function membershipRoleLabel(role: string): string {
  if (role === 'owner') return '오너';
  if (role === 'manager') return '센터장';
  return '영업맨';
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={18} color={Palette.textMain} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Palette.textMuted} />
    </TouchableOpacity>
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
    marginBottom: 20,
  },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 20 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  name: { fontSize: 17, fontWeight: '700', color: Palette.textMain },
  email: { fontSize: 13, color: Palette.textSub, marginTop: 2 },
  roleChip: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginTop: 6,
  },
  roleChipText: { color: Palette.primaryDeep, fontSize: 11, fontWeight: '700' },
  orgBox: {
    flexDirection: 'row',
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 6,
  },
  orgName: { fontSize: 14, fontWeight: '700', color: Palette.textMain },
  orgIndustry: { fontSize: 11, color: Palette.textSub, marginTop: 3 },

  teamsBox: { marginBottom: 10 },
  teamsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  teamsLabel: { fontSize: 11, fontWeight: '700', color: Palette.textSub },
  teamAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  teamAddBtnText: { fontSize: 11, fontWeight: '700', color: Palette.primary },
  teamsEmpty: {
    fontSize: 11,
    color: Palette.textMuted,
    fontStyle: 'italic',
    paddingVertical: 6,
  },

  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 4,
  },
  teamRowHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamName: { fontSize: 13, fontWeight: '700', color: Palette.textMain },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Palette.primary,
  },
  activePillText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  teamIndustry: { fontSize: 10, color: Palette.textMuted, marginTop: 2 },

  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.md,
    marginTop: 6,
  },
  pendingText: { fontSize: 11, color: Palette.orange, fontWeight: '600', flex: 1 },

  divider: { height: 1, backgroundColor: Palette.border, marginVertical: 4 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  menuLabel: { flex: 1, fontSize: 14, color: Palette.textMain, fontWeight: '500' },
  menuSub: { fontSize: 10, color: Palette.textMuted, marginTop: 2 },
  menuAction: { fontSize: 11, color: Palette.primary, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  logoutText: { color: Palette.red, fontSize: 14, fontWeight: '600' },
});
