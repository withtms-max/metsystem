import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Palette, Radius } from '@/constants/theme';
import { useDaumPostcode, type DaumPostcodeResult } from '@/hooks/use-daum-postcode';

interface Props {
  onSelect: (result: DaumPostcodeResult) => void;
  /** 압축 모드 — 인풋 옆에 작게 */
  compact?: boolean;
}

/**
 * 다음(카카오) 우편번호 검색 버튼.
 * - Web: 팝업 열어 도로명/지번/시군구/동 자동 추출 → onSelect 호출
 * - Native: 비활성화 (안내 텍스트로 대체)
 */
export function AddressSearchButton({ onSelect, compact = false }: Props) {
  const { open, loading, error } = useDaumPostcode();

  if (Platform.OS !== 'web') {
    return (
      <Text style={styles.nativeHint}>
        💡 정확한 주소 검색은 웹 버전에서 가능해요 (모바일 곧 지원)
      </Text>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, compact && styles.btnCompact]}
        onPress={() => open(onSelect)}
        disabled={loading}
        activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator size="small" color={Palette.primary} />
        ) : (
          <>
            <Ionicons name="search" size={14} color={Palette.primary} />
            <Text style={styles.btnText}>주소 검색</Text>
          </>
        )}
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 8,
  },
  btnCompact: { paddingVertical: 8, paddingHorizontal: 12 },
  btnText: { color: Palette.primaryDeep, fontWeight: '700', fontSize: 13 },
  errorText: { color: Palette.red, fontSize: 12, marginTop: 6, fontWeight: '500' },
  nativeHint: { fontSize: 12, color: Palette.textMuted, marginTop: 8, fontWeight: '500' },
});
