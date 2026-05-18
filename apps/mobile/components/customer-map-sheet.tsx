import { Ionicons } from '@expo/vector-icons';
import { listActivities, type ActivityLog } from '@metsystem/shared';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { kindLabel, type CustomerPin } from '@/components/customer-map';
import { GradeColor, Palette, Radius, Shadow } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Props {
  pin: CustomerPin | null;
  onClose: () => void;
  onOpenDetail: (id: string) => void;
}

/**
 * 부동산 앱 스타일 슬라이드업 — 핀 클릭 시 표시
 * 최근 활동·등급·전화·길찾기·상세보기
 */
export function CustomerMapSheet({ pin, onClose, onOpenDetail }: Props) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const customer = pin?.customer ?? null;

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    listActivities(supabase, { customerId: customer.id, limit: 3 })
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [customer]);

  if (!pin || !customer) return null;
  const grade = GradeColor[customer.grade];
  const kindAddress =
    pin.kind === 'work'
      ? customer.address
      : pin.kind === 'home'
        ? customer.home_address
        : customer.contract_address;

  const handleCall = () => {
    if (customer.phone) Linking.openURL(`tel:${customer.phone}`).catch(() => {});
  };

  const handleNavigate = () => {
    // 클릭한 핀의 좌표로 길찾기
    const url = `https://map.kakao.com/link/to/${encodeURIComponent(
      `${customer.company ?? customer.name} ${kindLabel(pin.kind)}`,
    )},${pin.lat},${pin.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  const lastContract = activities.find((a) => a.activity_type === 'contract');
  const lastMeeting = activities.find((a) => a.activity_type === 'meeting');

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          {/* 헤더 — 핀 타입 강조 */}
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: grade.bg }]}>
              <Text style={[styles.avatarText, { color: grade.fg }]}>
                {(customer.company ?? customer.name).slice(0, 1)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {customer.company ?? customer.name}
                <Text style={styles.kindBadge}>  · {kindLabel(pin.kind)}</Text>
              </Text>
              <Text style={styles.sub}>
                {customer.name}
                {customer.job_title ? ` · ${customer.job_title}` : ''}
              </Text>
            </View>
            <View style={[styles.gradeChip, { backgroundColor: grade.bg }]}>
              <View style={[styles.gradeDot, { backgroundColor: grade.dot }]} />
              <Text style={[styles.gradeChipText, { color: grade.fg }]}>{customer.grade}급</Text>
            </View>
          </View>

          {/* 클릭한 주소 강조 + 다른 주소 요약 */}
          <View style={styles.infoBox}>
            {kindAddress && (
              <View style={styles.row}>
                <Ionicons
                  name={
                    pin.kind === 'work'
                      ? 'business'
                      : pin.kind === 'home'
                        ? 'home'
                        : 'document-text'
                  }
                  size={14}
                  color={Palette.primary}
                />
                <Text style={[styles.rowText, { color: Palette.textMain, fontWeight: '700' }]} numberOfLines={1}>
                  {kindAddress}
                </Text>
              </View>
            )}
            {pin.kind !== 'work' && customer.address && (
              <View style={styles.row}>
                <Ionicons name="business-outline" size={12} color={Palette.textMuted} />
                <Text style={styles.rowTextSub} numberOfLines={1}>
                  직장 · {customer.address}
                </Text>
              </View>
            )}
            {pin.kind !== 'home' && customer.home_address && (
              <View style={styles.row}>
                <Ionicons name="home-outline" size={12} color={Palette.textMuted} />
                <Text style={styles.rowTextSub} numberOfLines={1}>
                  자택 · {customer.home_address}
                </Text>
              </View>
            )}
            {pin.kind !== 'contract' && customer.contract_address && (
              <View style={styles.row}>
                <Ionicons name="document-text-outline" size={12} color={Palette.textMuted} />
                <Text style={styles.rowTextSub} numberOfLines={1}>
                  계약 · {customer.contract_address}
                </Text>
              </View>
            )}
          </View>

          {/* 최근 활동 요약 */}
          <View style={styles.historyBox}>
            {loading ? (
              <ActivityIndicator size="small" color={Palette.primary} />
            ) : activities.length === 0 ? (
              <Text style={styles.historyEmpty}>아직 활동 이력이 없어요</Text>
            ) : (
              <>
                {lastMeeting && (
                  <View style={styles.historyRow}>
                    <Ionicons name="people-outline" size={14} color={Palette.primary} />
                    <Text style={styles.historyText}>
                      마지막 미팅 · {lastMeeting.activity_date}
                    </Text>
                  </View>
                )}
                {lastContract && (
                  <View style={styles.historyRow}>
                    <Ionicons name="trophy-outline" size={14} color={Palette.green} />
                    <Text style={styles.historyText}>계약 · {lastContract.activity_date}</Text>
                  </View>
                )}
                {!lastMeeting && !lastContract && activities[0] && (
                  <View style={styles.historyRow}>
                    <Ionicons name="time-outline" size={14} color={Palette.textSub} />
                    <Text style={styles.historyText}>최근 활동 · {activities[0].activity_date}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {customer.memo && (
            <View style={styles.memoBox}>
              <Text style={styles.memoText} numberOfLines={2}>
                {customer.memo}
              </Text>
            </View>
          )}

          {/* 액션 버튼 */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, !customer.phone && styles.actionDisabled]}
              onPress={handleCall}
              disabled={!customer.phone}>
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.actionText}>전화</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleNavigate}>
              <Ionicons name="navigate" size={16} color={Palette.primary} />
              <Text style={styles.actionTextSecondary}>길찾기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => onOpenDetail(customer.id)}>
              <Ionicons name="person-circle-outline" size={16} color={Palette.primary} />
              <Text style={styles.actionTextSecondary}>상세</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  sheet: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    paddingBottom: 28,
    ...Shadow.floating,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.borderStrong,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  name: { fontSize: 16, fontWeight: '700', color: Palette.textMain },
  sub: { fontSize: 12, color: Palette.textSub, marginTop: 2 },
  gradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  gradeDot: { width: 6, height: 6, borderRadius: 3 },
  gradeChipText: { fontSize: 11, fontWeight: '700' },

  kindBadge: { color: Palette.primary, fontSize: 13, fontWeight: '700' },
  infoBox: { gap: 6, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowText: { fontSize: 12, color: Palette.textMain, flex: 1 },
  rowTextSub: { fontSize: 11, color: Palette.textMuted, flex: 1 },

  historyBox: {
    backgroundColor: Palette.bg,
    borderRadius: Radius.md,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyText: { fontSize: 12, color: Palette.textSub, fontWeight: '500' },
  historyEmpty: { fontSize: 12, color: Palette.textMuted, textAlign: 'center', paddingVertical: 6 },

  memoBox: {
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 14,
  },
  memoText: { fontSize: 12, color: Palette.primaryDeep, fontWeight: '500', lineHeight: 18 },

  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.green,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  actionDisabled: { backgroundColor: Palette.borderStrong },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.primarySoft,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  actionTextSecondary: { color: Palette.primaryDeep, fontSize: 13, fontWeight: '700' },
});
