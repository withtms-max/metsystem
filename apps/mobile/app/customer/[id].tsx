import { Ionicons } from '@expo/vector-icons';
import { listActivities, type ActivityLog, type Customer, type CustomerGrade } from '@metsystem/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomers } from '@/hooks/use-customers';
import { supabase } from '@/lib/supabase';

const GRADE_COLOR: Record<CustomerGrade, string> = {
  A: '#EF4444',
  B: '#F59E0B',
  C: '#3B82F6',
  D: '#94A3B8',
};

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { customers, update, remove, isLoading } = useCustomers();
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const customer: Customer | undefined = customers.find((c) => c.id === id);

  useEffect(() => {
    if (!id) return;
    void listActivities(supabase, { customerId: id }).then(setActivities).catch(() => {});
  }, [id]);

  if (isLoading && !customer) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>고객을 찾을 수 없어요</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleCall = () => {
    if (customer.phone) Linking.openURL(`tel:${customer.phone}`).catch(() => {});
  };

  const handleGradeChange = async (g: CustomerGrade) => {
    try {
      await update(customer.id, { grade: g });
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '수정 실패');
    }
  };

  const handleDelete = () => {
    Alert.alert('삭제 확인', `${customer.name}님을 삭제할까요?\n복구 불가능합니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove(customer.id);
            router.back();
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '삭제 실패');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>고객 정보</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 프로필 */}
        <View style={styles.profile}>
          <View
            style={[styles.gradeCircle, { backgroundColor: GRADE_COLOR[customer.grade] }]}>
            <Text style={styles.gradeText}>{customer.grade}</Text>
          </View>
          <Text style={styles.name}>{customer.name}</Text>
          {customer.job_title && (
            <Text style={styles.title}>
              {customer.company ? `${customer.company} · ` : ''}
              {customer.job_title}
            </Text>
          )}
          {customer.region_tag && (
            <View style={styles.regionBadge}>
              <Text style={styles.regionText}>📍 {customer.region_tag}</Text>
            </View>
          )}
        </View>

        {/* 빠른 액션 */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
            onPress={handleCall}
            disabled={!customer.phone}>
            <Text style={styles.actionEmoji}>📞</Text>
            <Text style={styles.actionLabel}>전화</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE500' }]}>
            <Text style={styles.actionEmoji}>💬</Text>
            <Text style={[styles.actionLabel, { color: '#0F172A' }]}>카톡</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}>
            <Text style={styles.actionEmoji}>🎙️</Text>
            <Text style={styles.actionLabel}>음성</Text>
          </TouchableOpacity>
        </View>

        {/* 등급 변경 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>등급</Text>
          <View style={styles.gradeRow}>
            {(['A', 'B', 'C', 'D'] as CustomerGrade[]).map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => handleGradeChange(g)}
                style={[
                  styles.gradeBtn,
                  customer.grade === g && {
                    backgroundColor: GRADE_COLOR[g],
                    borderColor: GRADE_COLOR[g],
                  },
                ]}>
                <Text
                  style={[
                    styles.gradeBtnText,
                    customer.grade === g && styles.gradeBtnTextActive,
                  ]}>
                  {g}급
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 정보 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>기본 정보</Text>
          <InfoRow label="전화" value={customer.phone} />
          <InfoRow label="이메일" value={customer.email} />
          <InfoRow label="회사" value={customer.company} />
          <InfoRow label="직함" value={customer.job_title} />
          <InfoRow label="주소" value={customer.address} />
          <InfoRow label="계약일" value={customer.contract_date} />
          <InfoRow label="생일" value={customer.birthday} />
        </View>

        {/* 메모 */}
        {customer.memo && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>메모</Text>
            <Text style={styles.memo}>{customer.memo}</Text>
          </View>
        )}

        {/* 활동 이력 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>활동 이력 ({activities.length})</Text>
          {activities.length === 0 ? (
            <Text style={styles.emptyMini}>아직 활동 기록이 없어요</Text>
          ) : (
            activities.slice(0, 10).map((a) => (
              <View key={a.id} style={styles.activityRow}>
                <Text style={styles.activityEmoji}>
                  {a.activity_type === 'ta_call'
                    ? '📞'
                    : a.activity_type === 'meeting'
                    ? '🤝'
                    : a.activity_type === 'memo'
                    ? '📝'
                    : a.activity_type === 'message'
                    ? '💬'
                    : '🎉'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityDate}>{a.activity_date}</Text>
                  {a.note && <Text style={styles.activityNote}>{a.note}</Text>}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  scroll: { padding: 16 },

  profile: { alignItems: 'center', paddingVertical: 20 },
  gradeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 32 },
  name: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  title: { fontSize: 14, color: '#64748B', marginTop: 4 },
  regionBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
  },
  regionText: { fontSize: 12, color: '#15803D', fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionEmoji: { fontSize: 22 },
  actionLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, marginTop: 4 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 12 },

  gradeRow: { flexDirection: 'row', gap: 8 },
  gradeBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gradeBtnText: { fontWeight: '700', color: '#64748B', fontSize: 13 },
  gradeBtnTextActive: { color: '#FFFFFF' },

  infoRow: { flexDirection: 'row', paddingVertical: 6 },
  infoLabel: { width: 70, color: '#94A3B8', fontSize: 13 },
  infoValue: { flex: 1, color: '#0F172A', fontSize: 14 },

  memo: { fontSize: 14, color: '#475569', lineHeight: 22 },
  emptyMini: { color: '#94A3B8', fontSize: 13, paddingVertical: 8 },

  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  activityEmoji: { fontSize: 20, marginRight: 12, width: 28 },
  activityDate: { fontSize: 13, fontWeight: '600', color: '#475569' },
  activityNote: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, color: '#64748B', fontWeight: '600' },
});
