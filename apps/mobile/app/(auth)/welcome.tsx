import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, Radius } from '@/constants/theme';

const VALUES = [
  {
    icon: 'flash-outline' as const,
    title: '하루 3명 만나기',
    desc: '활동량으로 승부. 조 CP 영업 원칙 디지털화.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: '내 고객은 내가',
    desc: '센터장은 활동 통계만, 고객 정보는 본인만.',
  },
  {
    icon: 'rocket-outline' as const,
    title: '60초 1분 TA',
    desc: '스와이프로 전화 + 등급별 자동 스크립트.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        {/* 상단: 로고 + 브랜드 */}
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <Logo />
          </View>
          <Text style={styles.brand}>MET System</Text>
          <Text style={styles.tagline}>영업맨을 위한 모바일 비서</Text>
        </View>

        {/* 가치 카드 3개 */}
        <View style={styles.values}>
          {VALUES.map((v) => (
            <View key={v.title} style={styles.valueRow}>
              <View style={styles.valueIcon}>
                <Ionicons name={v.icon} size={20} color={Palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.valueTitle}>{v.title}</Text>
                <Text style={styles.valueDesc}>{v.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctas}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/login?mode=signup')}>
            <Text style={styles.primaryBtnText}>시작하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.secondaryBtnText}>이미 계정이 있어요</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            시작하기를 누르면 서비스 이용약관과 개인정보 처리방침에 동의하는 것으로 간주됩니다.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** 동심원 + 화살표 모티프 — 영업 동선/리치를 시각화 */
function Logo() {
  return (
    <View style={styles.logoInner}>
      <View style={[styles.logoRing, styles.logoRing1]} />
      <View style={[styles.logoRing, styles.logoRing2]} />
      <View style={styles.logoCore}>
        <Ionicons name="navigate" size={22} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.graphite },
  safe: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },

  hero: { alignItems: 'center', marginTop: 40 },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoInner: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoRing: {
    position: 'absolute',
    borderRadius: 999,
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
  },
  logoRing1: { width: 56, height: 56 },
  logoRing2: { width: 40, height: 40 },
  logoCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },

  values: { gap: 14 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  valueIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(13,148,136,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  valueDesc: { color: '#9CA3AF', fontSize: 12, marginTop: 4, lineHeight: 18 },

  ctas: { gap: 10, marginBottom: 8 },
  primaryBtn: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  legal: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },
});
