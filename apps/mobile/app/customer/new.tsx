import { extractRegionTag, type CustomerGrade } from '@metsystem/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { useCustomers } from '@/hooks/use-customers';

const GRADES: CustomerGrade[] = ['A', 'B', 'C', 'D'];
const GRADE_COLOR: Record<CustomerGrade, string> = {
  A: '#EF4444',
  B: '#F59E0B',
  C: '#3B82F6',
  D: '#94A3B8',
};

export default function NewCustomerScreen() {
  const router = useRouter();
  const { authUser } = useAuth();
  const { create } = useCustomers();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [address, setAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [grade, setGrade] = useState<CustomerGrade>('D');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const detectedRegion = extractRegionTag(address);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('이름은 필수입니다');
      return;
    }
    if (!authUser) {
      setError('로그인이 필요해요');
      return;
    }
    setLoading(true);
    try {
      await create({
        owner_id: authUser.id,
        name: name.trim(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        job_title: jobTitle.trim() || null,
        address: address.trim() || null,
        region_tag: detectedRegion ?? null,
        memo: memo.trim() || null,
        grade,
        source: 'manual',
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancel}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>새 고객 등록</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <Text style={styles.save}>저장</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>이름 *</Text>
          <TextInput
            style={styles.input}
            placeholder="홍길동"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>연락처</Text>
          <TextInput
            style={styles.input}
            placeholder="010-1234-5678"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.label}>회사</Text>
          <TextInput
            style={styles.input}
            placeholder="한빛산업"
            placeholderTextColor="#94A3B8"
            value={company}
            onChangeText={setCompany}
          />

          <Text style={styles.label}>직함</Text>
          <TextInput
            style={styles.input}
            placeholder="대표이사"
            placeholderTextColor="#94A3B8"
            value={jobTitle}
            onChangeText={setJobTitle}
          />

          <Text style={styles.label}>주소</Text>
          <TextInput
            style={styles.input}
            placeholder="경기도 성남시 분당구 판교로..."
            placeholderTextColor="#94A3B8"
            value={address}
            onChangeText={setAddress}
          />
          {detectedRegion && (
            <Text style={styles.detected}>📍 지역 자동 감지: {detectedRegion}</Text>
          )}

          <Text style={styles.label}>등급</Text>
          <View style={styles.gradeRow}>
            {GRADES.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setGrade(g)}
                style={[
                  styles.gradeBtn,
                  grade === g && { backgroundColor: GRADE_COLOR[g], borderColor: GRADE_COLOR[g] },
                ]}>
                <Text
                  style={[styles.gradeBtnText, grade === g && styles.gradeBtnTextActive]}>
                  {g}급
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>메모</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="가지급금 상담중, 지난번 만남 분위기 좋았음..."
            placeholderTextColor="#94A3B8"
            value={memo}
            onChangeText={setMemo}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cancel: { color: '#64748B', fontSize: 15, fontWeight: '600' },
  save: { color: '#2563EB', fontSize: 15, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  scroll: { padding: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textarea: { minHeight: 100 },
  detected: { fontSize: 12, color: '#10B981', marginTop: 4, fontWeight: '600' },

  gradeRow: { flexDirection: 'row', gap: 8 },
  gradeBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gradeBtnText: { fontWeight: '700', color: '#64748B' },
  gradeBtnTextActive: { color: '#FFFFFF' },

  error: { color: '#DC2626', fontSize: 13, marginTop: 16, fontWeight: '600' },
});
