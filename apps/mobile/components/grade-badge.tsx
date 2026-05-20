import { Ionicons } from '@expo/vector-icons';
import type { CustomerGrade } from '@metsystem/shared';
import { StyleSheet, View } from 'react-native';
import { GradeColor, Palette } from '@/constants/theme';

interface Props {
  grade: CustomerGrade;
  /** 크기 — sm / md / lg */
  size?: 'sm' | 'md' | 'lg';
  /** 빈 별을 표시할지 (정렬 유지용) */
  showEmpty?: boolean;
}

const GRADE_TO_STARS: Record<CustomerGrade, number> = {
  A: 4,
  B: 3,
  C: 2,
  D: 1,
};

/**
 * 고객 등급 배지 — 별점으로 시각화.
 * "A급/B급" 같은 직접적 텍스트는 숨기고 별 + 컬러로만 표시.
 * 내부 DB 값(A·B·C·D)는 그대로 유지.
 *
 * 표시 규칙:
 *  A (4★) = 빨강 ★★★★
 *  B (3★) = 오렌지 ★★★
 *  C (2★) = 블루 ★★
 *  D (1★) = 그레이 ★
 */
export function GradeBadge({ grade, size = 'md', showEmpty = false }: Props) {
  const count = GRADE_TO_STARS[grade] ?? 1;
  const color = GradeColor[grade].dot;
  const starSize = size === 'sm' ? 10 : size === 'md' ? 12 : 14;
  const gap = size === 'sm' ? 1 : 1.5;

  return (
    <View style={[styles.row, { gap }]}>
      {Array.from({ length: showEmpty ? 4 : count }).map((_, i) => (
        <Ionicons
          key={i}
          name="star"
          size={starSize}
          color={i < count ? color : Palette.border}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
