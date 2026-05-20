import { Ionicons } from '@expo/vector-icons';
import { markAsContacted } from '@metsystem/shared';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Props {
  customerId: string;
  /** 작은 (카드 inline) vs 큰 (배너용) */
  size?: 'sm' | 'md';
  /** 완료 후 콜백 (목록 reload 등) */
  onMarked?: () => void;
}

/**
 * "챙겼어요 ✓" 빠른 마크 버튼.
 * 카톡·문자·만남 등 앱 밖에서 연락한 경우 한 탭으로 활동 로그 생성.
 * → last_contact_at 트리거 자동 갱신 → 무연락 알림 해제.
 */
export function QuickMarkButton({ customerId, size = 'md', onMarked }: Props) {
  const { authUser, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handlePress = async () => {
    if (done || loading) return;
    if (!authUser || !profile?.organization_id) return;
    setLoading(true);
    try {
      await markAsContacted(supabase, {
        userId: authUser.id,
        organizationId: profile.organization_id,
        customerId,
      });
      setDone(true);
      onMarked?.();
    } catch (e) {
      console.warn('[quick mark] failed', e);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <TouchableOpacity
        style={[size === 'sm' ? styles.sm : styles.md, styles.doneState]}
        disabled>
        <Ionicons name="checkmark" size={size === 'sm' ? 12 : 14} color={Palette.green} />
        <Text style={[styles.text, styles.doneText, size === 'sm' && styles.smText]}>
          챙김 완료
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={size === 'sm' ? styles.sm : styles.md}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.75}>
      {loading ? (
        <ActivityIndicator size="small" color={Palette.textSub} />
      ) : (
        <>
          <Ionicons
            name="checkmark"
            size={size === 'sm' ? 12 : 14}
            color={Palette.textSub}
          />
          <Text style={[styles.text, size === 'sm' && styles.smText]}>챙겼어요</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  md: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
  },
  text: { fontSize: 11, fontWeight: '700', color: Palette.textSub },
  smText: { fontSize: 10 },
  doneState: { backgroundColor: '#E6F9F1', borderColor: Palette.green },
  doneText: { color: Palette.green },
});
