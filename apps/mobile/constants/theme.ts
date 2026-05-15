/**
 * MET System Design Tokens — Field Sales Management 톤
 * Reference: Concept 4 (Deep Teal + Graphite + Light Gray)
 */

import { Platform } from 'react-native';

// ============================================
// Palette
// ============================================

export const Palette = {
  primary: '#0D9488',
  primaryDeep: '#0F766E',
  primarySoft: '#CCFBF1',
  secondary: '#14B8A6',

  graphite: '#111827',
  textMain: '#1F2937',
  textSub: '#64748B',
  textMuted: '#94A3B8',

  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E5E7EB',
  borderStrong: '#CBD5E1',

  blue: '#2563EB',
  green: '#22C55E',
  orange: '#F59E0B',
  red: '#EF4444',
  gray: '#94A3B8',

  blueBg: '#DBEAFE',
  greenBg: '#DCFCE7',
  orangeBg: '#FEF3C7',
  redBg: '#FEE2E2',
  grayBg: '#F1F5F9',
} as const;

export const GradeColor = {
  A: { bg: '#FEE2E2', fg: '#B91C1C', dot: '#EF4444' },
  B: { bg: '#FEF3C7', fg: '#B45309', dot: '#F59E0B' },
  C: { bg: '#DBEAFE', fg: '#1D4ED8', dot: '#3B82F6' },
  D: { bg: '#F1F5F9', fg: '#475569', dot: '#94A3B8' },
} as const;

export const StageStyle = {
  ta_target: { label: 'TA 대상', bg: '#F1F5F9', fg: '#475569', accent: '#94A3B8' },
  ta_done: { label: 'TA 완료', bg: '#DBEAFE', fg: '#1D4ED8', accent: '#2563EB' },
  meeting_scheduled: { label: '미팅 예정', bg: '#CCFBF1', fg: '#0F766E', accent: '#0D9488' },
  meeting_done: { label: '미팅 완료', bg: '#E0E7FF', fg: '#4338CA', accent: '#6366F1' },
  contract: { label: '계약', bg: '#DCFCE7', fg: '#15803D', accent: '#22C55E' },
  on_hold: { label: '보류', bg: '#FEF3C7', fg: '#B45309', accent: '#F59E0B' },
} as const;

export const Radius = { sm: 8, md: 10, lg: 14, xl: 16, pill: 999 } as const;

export const Shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

// ============================================
// Legacy compatibility (Colors / Fonts)
// ============================================

const tintColorLight = Palette.primary;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: Palette.textMain,
    background: Palette.bg,
    tint: tintColorLight,
    icon: Palette.textSub,
    tabIconDefault: Palette.textMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Pretendard, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
