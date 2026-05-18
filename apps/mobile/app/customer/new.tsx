import { extractRegionTag, geocodePostcodeResult, type CustomerGrade } from '@metsystem/shared';
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
import { AddressSearchButton } from '@/components/address-search-button';
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
  // 보험 도메인 3개 주소
  const [address, setAddress] = useState('');           // 직장 (지도 표시 1순위)
  const [homeAddress, setHomeAddress] = useState('');   // 자택
  const [contractAddress, setContractAddress] = useState(''); // 계약 장소
  /** 펼침 토글 — 직장만 기본 노출 */
  const [showExtraAddresses, setShowExtraAddresses] = useState(false);

  const [memo, setMemo] = useState('');
  const [grade, setGrade] = useState<CustomerGrade>('D');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** Daum 검색으로 받아온 정확한 시군구 — 우선 사용 */
  const [sigunguFromSearch, setSigunguFromSearch] = useState<string | null>(null);
  /** 검색 + 지오코딩 결과 좌표 — 지도 핀에 사용 */
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const kakaoRestKey = process.env.EXPO_PUBLIC_KAKAO_REST_KEY ?? '';

  // 검색으로 얻은 시군구가 있으면 그것을 우선, 없으면 regex 폴백
  const detectedRegion = sigunguFromSearch ?? extractRegionTag(address);

  /** Daum Postcode 선택 → Kakao Geocoding 자동 호출 → 좌표 저장 */
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

    // 직장 주소 우선으로만 좌표 채움 (자택·계약은 지도 V2에서 별도 핀)
    if (target === 'work' && kakaoRestKey) {
      setGeocoding(true);
      try {
        const geo = await geocodePostcodeResult(result, kakaoRestKey);
        if (geo) setCoords({ lat: geo.latitude, lng: geo.longitude });
      } finally {
        setGeocoding(false);
      }
    }
  };

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
        home_address: homeAddress.trim() || null,
        contract_address: contractAddress.trim() || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
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

          <Text style={styles.label}>🏢 직장 주소 (지도 표시)</Text>
          <TextInput
            style={styles.input}
            placeholder="경기도 성남시 분당구 판교로..."
            placeholderTextColor="#94A3B8"
            value={address}
            onChangeText={(t) => {
              setAddress(t);
              if (sigunguFromSearch) setSigunguFromSearch(null);
              if (coords) setCoords(null); // 수동 편집 시 좌표도 무효화
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

          {!showExtraAddresses ? (
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={() => setShowExtraAddresses(true)}>
              <Text style={styles.expandBtnText}>＋ 자택·계약 장소 추가 (보험 도메인)</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.label}>🏠 자택 주소 (생일·연하장 발송)</Text>
              <TextInput
                style={styles.input}
                placeholder="자택 주소"
                placeholderTextColor="#94A3B8"
                value={homeAddress}
                onChangeText={setHomeAddress}
              />
              <AddressSearchButton onSelect={(r) => handleAddressSelect('home', r)} />

              <Text style={styles.label}>📝 계약 장소 (청약서 작성지)</Text>
              <TextInput
                style={styles.input}
                placeholder="계약 장소"
                placeholderTextColor="#94A3B8"
                value={contractAddress}
                onChangeText={setContractAddress}
              />
              <AddressSearchButton onSelect={(r) => handleAddressSelect('contract', r)} />
            </>
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
  expandBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F2F4F6',
    alignItems: 'center',
  },
  expandBtnText: { fontSize: 13, color: '#4E5968', fontWeight: '600' },

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
