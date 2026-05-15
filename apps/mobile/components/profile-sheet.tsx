import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Modal,
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
  const { profile, authUser, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃 할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          onClose();
        },
      },
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

          {/* 메뉴 */}
          <MenuItem icon="person-outline" label="내 정보 수정" onPress={onClose} />
          <MenuItem icon="business-outline" label="조직 정보" onPress={onClose} />
          <MenuItem icon="notifications-outline" label="알림 설정" onPress={onClose} />
          <MenuItem icon="help-circle-outline" label="도움말" onPress={onClose} />

          <View style={styles.divider} />

          <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={Palette.red} />
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>

          <View style={{ height: 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
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

  divider: { height: 1, backgroundColor: Palette.border, marginVertical: 4 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  menuLabel: { flex: 1, fontSize: 14, color: Palette.textMain, fontWeight: '500' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  logoutText: { color: Palette.red, fontSize: 14, fontWeight: '600' },
});
