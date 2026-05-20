import { Ionicons } from '@expo/vector-icons';
import {
  listStaleCustomers,
  markBatchAsContacted,
  type Customer,
} from '@metsystem/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GradeBadge } from '@/components/grade-badge';
import { Palette, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const DISMISS_KEY = 'metsystem.weekly_checkin_dismissed_at';
const STALE_DAYS = 14; // 2주 무연락 = 챙겨볼 시간

/**
 * 주간 정리 카드 — 월요일 또는 처음 진입 시 자동 노출.
 *
 * "지난 주 연락 안 한 분 N명" 일괄 체크.
 * 사용자가 "모두 챙김" 누르면 batch 활동 로그 생성 → 무연락 카운트 리셋.
 * "다음에" 누르면 7일간 dedup.
 */
export function WeeklyCheckinCard({ onChanged }: { onChanged?: () => void }) {
  const { authUser, profile } = useAuth();
  const [visible, setVisible] = useState(false);
  const [staleList, setStaleList] = useState<Customer[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const shouldShow = useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    try {
      const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
      if (!dismissedAt) return true;
      const diff = Date.now() - parseInt(dismissedAt, 10);
      return diff > 7 * 24 * 60 * 60 * 1000; // 7일 경과 시 다시 노출
    } catch {
      return true;
    }
  }, []);

  const setDismissed = useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!shouldShow()) return;
    void (async () => {
      try {
        const list = await listStaleCustomers(supabase, STALE_DAYS, ['A', 'B']);
        if (list.length > 0) {
          setStaleList(list.slice(0, 8));
          setChecked(new Set(list.slice(0, 8).map((c) => c.id)));
          setVisible(true);
        }
      } catch (e) {
        console.warn('[weekly checkin] load failed', e);
      }
    })();
  }, [shouldShow]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!authUser || !profile?.organization_id) return;
    const ids = Array.from(checked);
    if (ids.length === 0) {
      handleDismiss();
      return;
    }
    setSubmitting(true);
    try {
      await markBatchAsContacted(supabase, {
        userId: authUser.id,
        organizationId: profile.organization_id,
        customerIds: ids,
      });
      setDismissed();
      setVisible(false);
      onChanged?.();
    } catch (e) {
      console.warn('[weekly checkin] submit failed', e);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('일괄 처리 실패. 다시 시도해주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="refresh" size={16} color={Palette.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>이번 주 정리</Text>
          <Text style={styles.sub}>
            {STALE_DAYS}일 이상 활동 기록 없는 A·B급 {staleList.length}명, 챙기셨나요?
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} hitSlop={6}>
          <Ionicons name="close" size={16} color={Palette.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {staleList.map((c) => {
          const isChecked = checked.has(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={styles.row}
              onPress={() => toggle(c.id)}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.checkbox,
                  isChecked && {
                    backgroundColor: Palette.primary,
                    borderColor: Palette.primary,
                  },
                ]}>
                {isChecked && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
              </View>
              <Text style={styles.rowName} numberOfLines={1}>
                {c.company ?? c.name}
              </Text>
              <GradeBadge grade={c.grade} size="sm" />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleDismiss}>
          <Text style={styles.skipBtnText}>다음에</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmBtnText}>
              {checked.size === staleList.length
                ? '모두 챙김'
                : `${checked.size}명 챙김`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.footnote}>
        앱 기록 기준이라 카톡·전화로 이미 챙긴 분도 포함될 수 있어요
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.primarySoft,
    ...Shadow.card,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: Palette.textMain },
  sub: { fontSize: 11, color: Palette.textSub, marginTop: 2 },

  list: { gap: 4, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Palette.borderStrong,
    backgroundColor: Palette.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeDot: { width: 6, height: 6, borderRadius: 3 },
  rowName: { flex: 1, fontSize: 13, fontWeight: '600', color: Palette.textMain },
  rowSub: { fontSize: 11, color: Palette.textMuted, fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 6 },
  skipBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
    alignItems: 'center',
  },
  skipBtnText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },
  confirmBtn: {
    flex: 1.6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  footnote: {
    fontSize: 10,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
