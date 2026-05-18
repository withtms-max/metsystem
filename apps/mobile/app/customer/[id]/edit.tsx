import {
  extractRegionTag,
  geocodePostcodeResult,
  shouldShowAddressField,
  type CustomerGrade,
} from '@metsystem/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { AddressSearchButton } from '@/components/address-search-button';
import { useAuth } from '@/lib/auth-context';
import { useCustomers } from '@/hooks/use-customers';

/**
 * 기존 고객 편집 — 명함 입력 후에도 주소 검색으로 좌표 추가 가능.
 * new.tsx 와 거의 동일한 폼이지만 update() 호출.
 */
export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useAuth();
  const { customers, update, remove } = useCustomers();
  const existing = customers.find((c) => c.id === id);

  const industry = organization?.industry ?? null;
  const showHome = shouldShowAddressField(industry, 'home');
  const showContract = shouldShowAddressField(industry, 'contract');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [address, setAddress] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [grade, setGrade] = useState<CustomerGrade>('D');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [homeCoords, setHomeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [contractCoords, setContractCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sigunguFromSearch, setSigunguFromSearch] = useState<string | null>(null);

  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const kakaoRestKey = process.env.EXPO_PUBLIC_KAKAO_REST_KEY ?? '';

  // 기존 값 채우기
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPhone(existing.phone ?? '');
    setCompany(existing.company ?? '');
    setJobTitle(existing.job_title ?? '');
    setAddress(existing.address ?? '');
    setHomeAddress(existing.home_address ?? '');
    setContractAddress(existing.contract_address ?? '');
    setMemo(existing.memo ?? '');
    setGrade(existing.grade);
    if (existing.latitude != null && existing.longitude != null) {
      setCoords({ lat: existing.latitude, lng: existing.longitude });
    }
    if (existing.home_latitude != null && existing.home_longitude != null) {
      setHomeCoords({ lat: existing.home_latitude, lng: existing.home_longitude });
    }
    if (existing.contract_latitude != null && existing.contract_longitude != null) {
      setContractCoords({ lat: existing.contract_latitude, lng: existing.contract_longitude });
    }
  }, [existing]);

  const detectedRegion =
    sigunguFromSearch ?? existing?.region_tag ?? extractRegionTag(address);

  const handleAddressSelect = async (
    target: 'work' | 'home' | 'contract',
    result: { roadAddress: string; jibunAddress: string; sigungu: string },
  ) => {
    const picked = result.roadAddress || result.jibunAddress;
    if (target === 'work') {
      setAddress(picked);
      setSigunguFromSearch(result.sigungu || null);
    } else if (target === 'home') {
      setHomeAddress(picked);
    } else {
      setContractAddress(picked);
    }
    if (kakaoRestKey) {
      setGeocoding(true);
      try {
        const geo = await geocodePostcodeResult(result, kakaoRestKey);
        if (geo) {
          const c = { lat: geo.latitude, lng: geo.longitude };
          if (target === 'work') setCoords(c);
          else if (target === 'home') setHomeCoords(c);
          else setContractCoords(c);
        }
      } finally {
        setGeocoding(false);
      }
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('이름은 필수예요');
      return;
    }
    if (!existing) return;
    setLoading(true);
    try {
      await update(existing.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        job_title: jobTitle.trim() || null,
        address: address.trim() || null,
        home_address: homeAddress.trim() || null,
        contract_address: contractAddress.trim() || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        home_latitude: homeCoords?.lat ?? null,
        home_longitude: homeCoords?.lng ?? null,
        contract_latitude: contractCoords?.lat ?? null,
        contract_longitude: contractCoords?.lng ?? null,
        region_tag: detectedRegion ?? null,
        memo: memo.trim() || null,
        grade,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  if (!existing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancel}>닫기</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>고객 편집</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>고객을 찾을 수 없어요</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancel}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>고객 편집</Text>
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
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>연락처</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.label}>회사</Text>
          <TextInput style={styles.input} value={company} onChangeText={setCompany} />

          <Text style={styles.label}>직함</Text>
          <TextInput style={styles.input} value={jobTitle} onChangeText={setJobTitle} />

          <Text style={styles.label}>🏢 직장 주소 (지도 표시)</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={(t) => {
              setAddress(t);
              if (sigunguFromSearch) setSigunguFromSearch(null);
              if (coords) setCoords(null);
            }}
          />
          <AddressSearchButton onSelect={(r) => handleAddressSelect('work', r)} />
          {detectedRegion && (
            <Text style={styles.detected}>
              📍 지역 {sigunguFromSearch ? '확인' : '자동 감지'}: {detectedRegion}
              {geocoding && '  · 좌표 변환 중...'}
              {coords && !geocoding && '  · 지도 등록 ✓'}
            </Text>
          )}

          {showHome && (
            <>
              <Text style={styles.label}>🏠 자택 주소</Text>
              <TextInput style={styles.input} value={homeAddress} onChangeText={setHomeAddress} />
              <AddressSearchButton onSelect={(r) => handleAddressSelect('home', r)} />
            </>
          )}

          {showContract && (
            <>
              <Text style={styles.label}>📝 계약 장소</Text>
              <TextInput
                style={styles.input}
                value={contractAddress}
                onChangeText={setContractAddress}
              />
              <AddressSearchButton onSelect={(r) => handleAddressSelect('contract', r)} />
            </>
          )}

          <Text style={styles.label}>등급</Text>
          <View style={styles.gradeRow}>
            {(['A', 'B', 'C', 'D'] as CustomerGrade[]).map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setGrade(g)}
                style={[styles.gradeBtn, grade === g && styles.gradeBtnActive]}>
                <Text style={[styles.gradeBtnText, grade === g && styles.gradeBtnTextActive]}>
                  {g}급
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>메모</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={memo}
            onChangeText={setMemo}
            multiline
            textAlignVertical="top"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          {/* 위험 영역 */}
          <View style={styles.dangerBox}>
            <Text style={styles.dangerLabel}>위험 영역</Text>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => {
                const ok =
                  Platform.OS === 'web'
                    ? window.confirm(`${existing.name}님을 정말 삭제할까요? 복구 불가능합니다.`)
                    : true; // 네이티브는 Alert 추가 필요
                if (!ok) return;
                void remove(existing.id).then(() => router.back());
              }}>
              <Text style={styles.dangerBtnText}>고객 삭제</Text>
            </TouchableOpacity>
          </View>

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
  gradeBtnActive: { backgroundColor: '#3182F6', borderColor: '#3182F6' },
  gradeBtnText: { fontWeight: '700', color: '#64748B' },
  gradeBtnTextActive: { color: '#FFFFFF' },
  error: { color: '#DC2626', fontSize: 13, marginTop: 16, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  dangerBox: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  dangerLabel: { fontSize: 11, fontWeight: '700', color: '#DC2626', marginBottom: 8 },
  dangerBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
  },
  dangerBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
});
