import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Palette } from '@/constants/theme';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export function BrandMark({ size = 'md', iconOnly = false }: Props) {
  const dim = size === 'sm' ? 32 : size === 'lg' ? 56 : 44;
  const radius = Math.round(dim * 0.3);
  const checkSize = Math.round(dim * 0.58);
  const fontSize = size === 'sm' ? 16 : size === 'lg' ? 26 : 20;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.badge,
          { width: dim, height: dim, borderRadius: radius },
        ]}>
        <Ionicons name="checkmark" size={checkSize} color="#FFFFFF" />
      </View>
      {!iconOnly && (
        <View style={styles.wordmark}>
          <Text style={[styles.word, { fontSize }]}>챙김</Text>
          <Text style={[styles.dot, { fontSize }]}>.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Palette.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  wordmark: { flexDirection: 'row', alignItems: 'flex-end' },
  word: { fontWeight: '800', color: Palette.textMain, letterSpacing: -0.8 },
  dot: { fontWeight: '800', color: Palette.primary, marginLeft: 2 },
});
