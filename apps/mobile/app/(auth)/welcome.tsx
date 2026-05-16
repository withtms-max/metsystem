import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, Radius, Shadow } from '@/constants/theme';
import { BrandMark } from '@/components/brand-mark';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          {/* 브랜드 */}
          <View style={{ marginBottom: 28 }}>
            <BrandMark size="md" />
          </View>

          {/* 헤드라인 — 선배가 후배한테 던지듯 */}
          <Text style={styles.headline}>
            수첩 영업,{'\n'}
            <Text style={styles.headlineAccent}>이젠 안 통해요</Text>
          </Text>
          <Text style={styles.tagline}>
            흩어진 고객, 까먹은 약속, 놓친 골든타임.{'\n'}
            가만 두면 이번 달도 그냥 흘러가요.
          </Text>

          {/* Before — 지금 당신의 현실 */}
          <View style={styles.label}>
            <View style={styles.labelDotRed} />
            <Text style={styles.labelText}>지금 영업, 솔직히 이러죠?</Text>
          </View>
          <View style={styles.beforeCard}>
            <ChaosRow icon="help-circle-outline" text="박부장님한테 마지막 전화 언제였더라" />
            <ChaosRow icon="calendar-outline" text="이대표 생일이 지난주였나, 지지난주였나" />
            <ChaosRow icon="document-text-outline" text="메모장 7군데 흩어진 고객 정보" />
            <ChaosRow icon="chatbubble-outline" text="카톡 어디 묻혀버린 미팅 약속" last />
            <View style={styles.beforeStat}>
              <Text style={styles.beforeStatNumber}>월 23건</Text>
              <Text style={styles.beforeStatLabel}>이렇게 날아가는 골든타임</Text>
            </View>
          </View>

          {/* 화살표 */}
          <View style={styles.transitionWrap}>
            <View style={styles.transitionLine} />
            <View style={styles.transitionBadge}>
              <Text style={styles.transitionText}>챙김으로</Text>
              <Ionicons name="arrow-down" size={14} color={Palette.primary} />
            </View>
            <View style={styles.transitionLine} />
          </View>

          {/* After — 챙김 */}
          <View style={styles.label}>
            <View style={styles.labelDotBlue} />
            <Text style={styles.labelText}>챙김 깔고 나면</Text>
          </View>
          <View style={styles.afterCard}>
            <FeatureRow
              color={Palette.primary}
              bg={Palette.primarySoft}
              icon="notifications"
              title="알아서 알려줘요"
              desc="계약 1주년, 생일, 명절 — 안 까먹게 챙겨요"
            />
            <FeatureRow
              color={Palette.orange}
              bg={Palette.orangeBg}
              icon="flash"
              title="1분 안에 한 통"
              desc="고객 등급 보고 멘트까지 자동으로 깔아드려요"
            />
            <FeatureRow
              color={Palette.green}
              bg={Palette.greenBg}
              icon="checkmark-done"
              title="기록은 알아서"
              desc="통화·미팅·메모 끝나면 알아서 정리돼요"
              last
            />
          </View>

          {/* 사회적 증거 */}
          <View style={styles.proof}>
            <Text style={styles.proofText}>
              📈 보험·부동산·자동차 영업맨들이 먼저 쓰고 있어요
            </Text>
          </View>
        </ScrollView>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/login?mode=signup')}>
            <Text style={styles.primaryBtnText}>지금부터 챙기기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.textBtn}
            onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.textBtnLabel}>이미 쓰고 있어요 →</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            시작하면 이용약관, 개인정보 처리방침 본 걸로 할게요
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ChaosRow({
  icon,
  text,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.chaosRow, !last && styles.chaosRowBorder]}>
      <Ionicons name={icon} size={18} color="#9CA3AF" />
      <Text style={styles.chaosText}>{text}</Text>
    </View>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
  color,
  bg,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  color: string;
  bg: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.featureRow, !last && styles.featureRowBorder]}>
      <View style={[styles.featureIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },

  // 브랜드
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  brandWord: { fontSize: 19, fontWeight: '800', color: Palette.textMain, letterSpacing: -0.5 },

  // 헤드라인
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: Palette.textMain,
    lineHeight: 44,
    letterSpacing: -0.8,
  },
  headlineAccent: { color: Palette.red },
  tagline: {
    fontSize: 14,
    color: Palette.textSub,
    marginTop: 14,
    marginBottom: 28,
    fontWeight: '500',
    lineHeight: 22,
  },

  // 라벨
  label: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  labelDotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.red },
  labelDotBlue: { width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.primary },
  labelText: { fontSize: 13, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.2 },

  // Before 카드
  beforeCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: Radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 20,
  },
  chaosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  chaosRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  chaosText: { fontSize: 14, color: '#6B7280', fontWeight: '500', flex: 1 },
  beforeStat: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  beforeStatNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.red,
    letterSpacing: -0.5,
  },
  beforeStatLabel: { fontSize: 12, color: Palette.textSub, fontWeight: '600' },

  // 전환
  transitionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  transitionLine: { flex: 1, height: 1, backgroundColor: Palette.borderStrong },
  transitionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.primarySoft,
  },
  transitionText: { fontSize: 12, fontWeight: '700', color: Palette.primary },

  // After 카드
  afterCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.xl,
    padding: 18,
    marginBottom: 20,
    ...Shadow.floating,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  featureRowBorder: { borderBottomWidth: 1, borderBottomColor: Palette.border },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: { fontSize: 15, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.2 },
  featureDesc: { fontSize: 12, color: Palette.textSub, marginTop: 3, lineHeight: 17 },

  // 사회적 증거
  proof: {
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  proofText: { fontSize: 12, color: Palette.textSub, fontWeight: '600' },

  // CTA
  ctaWrap: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8, gap: 8 },
  primaryBtn: {
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  textBtn: { height: 48, justifyContent: 'center', alignItems: 'center' },
  textBtnLabel: { color: Palette.textSub, fontSize: 14, fontWeight: '600' },
  legal: {
    color: Palette.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
});
