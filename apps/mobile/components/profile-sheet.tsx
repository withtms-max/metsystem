import { Ionicons } from '@expo/vector-icons';
import {
  cancelTeamJoin,
  deleteTeam,
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
import { ConfirmNameSheet } from '@/components/confirm-name-sheet';
import { TeamCreateSheet } from '@/components/team-create-sheet';
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
  const [createOpen, setCreateOpen] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<MyTeam | null>(null);

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

  const confirmLeave = async () => {
    if (!leaveTarget) return;
    const isOwner = leaveTarget.membership.role === 'owner';
    try {
      if (isOwner) {
        // 오너 → 팀 삭제 (마지막 오너든 아니든)
        await deleteTeam(supabase, leaveTarget.organization.id);
      } else {
        await leaveTeam(supabase, leaveTarget.organization.id);
      }
      await refreshProfile();
      await reloadTeams();
      setLeaveTarget(null);
    } catch (e) {
      const err = e as { message?: string };
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(err.message ?? '처리 실패');
      }
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelTeamJoin(supabase, requestId);
      await reloadTeams();
    } catch (e) {
      const err = e as { message?: string };
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(err.message ?? '취소 실패');
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
                      ? '팀원'
                      : profile.role === 'manager'
                      ? '관리자'
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
              <Text style={styles.teamsLabel}>
                내가 속한 팀{' '}
                <Text style={styles.teamsCountText}>{myTeams.length}/5</Text>
              </Text>
              {myTeams.length < 5 && (
                <View style={styles.teamHeadBtns}>
                  <TouchableOpacity
                    style={styles.teamAddBtn}
                    onPress={() => setCreateOpen(true)}>
                    <Ionicons name="business" size={12} color={Palette.green} />
                    <Text style={[styles.teamAddBtnText, { color: Palette.green }]}>팀 만들기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.teamAddBtn}
                    onPress={() => setJoinOpen(true)}>
                    <Ionicons name="key" size={12} color={Palette.primary} />
                    <Text style={styles.teamAddBtnText}>코드로 참여</Text>
                  </TouchableOpacity>
                </View>
              )}
              {myTeams.length >= 5 && (
                <Text style={styles.teamLimitText}>한도 도달 (탈퇴 후 추가)</Text>
              )}
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
                      onPress={() => setLeaveTarget(t)}
                      hitSlop={6}>
                      <Ionicons name="exit-outline" size={16} color={Palette.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {pendingRequests.length > 0 && (
              <View style={styles.pendingList}>
                <Text style={styles.pendingListLabel}>승인 대기 중</Text>
                {pendingRequests.map((r) => (
                  <View key={r.id} style={styles.pendingItem}>
                    <Ionicons name="time-outline" size={13} color={Palette.orange} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingItemTitle}>
                        코드 {r.invite_code}
                      </Text>
                      <Text style={styles.pendingItemSub}>
                        {new Date(r.requested_at).toLocaleDateString('ko-KR', {
                          month: 'numeric',
                          day: 'numeric',
                        })}{' '}
                        신청 · 관리자 승인 대기 중
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.cancelReqBtn}
                      onPress={() => handleCancelRequest(r.id)}
                      hitSlop={6}>
                      <Text style={styles.cancelReqBtnText}>취소</Text>
                    </TouchableOpacity>
                  </View>
                ))}
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
          <MenuItem
            icon="person-outline"
            label="내 정보 수정"
            onPress={() => {
              onClose();
              router.push('/profile/edit' as never);
            }}
          />
          <MenuItem
            icon="business-outline"
            label="활성 팀 정보 + 초대 코드"
            onPress={() => {
              onClose();
              router.push('/profile/team-info' as never);
            }}
          />

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

      <TeamCreateSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void reloadTeams();
        }}
      />

      {/* 탈퇴/삭제 확인 — 팀명 입력 (오너면 삭제, 아니면 탈퇴) */}
      <ConfirmNameSheet
        visible={leaveTarget !== null}
        confirmName={leaveTarget?.organization.name ?? ''}
        title={
          leaveTarget?.membership.role === 'owner' ? '팀을 삭제할까요?' : '정말 탈퇴할까요?'
        }
        description={
          leaveTarget?.membership.role === 'owner'
            ? '⚠️ 당신은 이 팀의 오너입니다.\n\n팀을 삭제하면 다음이 모두 영구 삭제돼요:\n· 팀원 모두의 멤버십\n· 챌린지·공지·팀 일정\n· 자료실 파일 + 댓글\n· 가입 신청 기록\n\n팀원의 개인 고객 데이터는 그대로 유지돼요.'
            : '탈퇴하면 이 팀의 챌린지·공지·자료실에 더 이상 접근할 수 없어요.\n다시 가입하려면 관리자의 승인이 필요해요.'
        }
        destructiveLabel={leaveTarget?.membership.role === 'owner' ? '팀 영구 삭제' : '탈퇴'}
        inputLabel="확인을 위해 팀 이름을 그대로 입력해주세요"
        onClose={() => setLeaveTarget(null)}
        onConfirm={confirmLeave}
      />
    </Modal>
  );
}

function membershipRoleLabel(role: string): string {
  if (role === 'owner') return '오너';
  if (role === 'manager') return '관리자';
  return '팀원';
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
  teamsCountText: { fontSize: 10, fontWeight: '600', color: Palette.textMuted },
  teamLimitText: { fontSize: 10, fontWeight: '600', color: Palette.orange },
  teamHeadBtns: { flexDirection: 'row', gap: 8 },
  teamAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
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

  pendingList: { marginTop: 8, gap: 6 },
  pendingListLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.orange,
    marginLeft: 4,
    marginBottom: 2,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  pendingItemTitle: { fontSize: 12, fontWeight: '700', color: Palette.orange },
  pendingItemSub: { fontSize: 10, color: '#9A3412', marginTop: 1 },
  cancelReqBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.orange,
  },
  cancelReqBtnText: { fontSize: 11, fontWeight: '700', color: Palette.orange },

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
