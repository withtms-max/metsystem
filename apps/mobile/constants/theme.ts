/**
 * 챙김 Design Tokens — Toss Style
 * Reference: 토스(Toss) 디자인 시스템 — 블루 #3182F6 + 부드러운 그레이
 */

import { Platform } from 'react-native';

// ============================================
// Palette — Toss tone
// ============================================

export const Palette = {
  // Primary (Toss blue)
  primary: '#3182F6',
  primaryDeep: '#1B64DA',
  primarySoft: '#E8F2FF',
  secondary: '#4DABF7',

  // Text
  graphite: '#191F28',
  textMain: '#191F28',
  textSub: '#4E5968',
  textMuted: '#8B95A1',

  // Surface
  bg: '#F9FAFB',
  card: '#FFFFFF',
  border: '#F2F4F6',
  borderStrong: '#E5E8EB',

  // Semantic
  blue: '#3182F6',
  green: '#00C471',
  orange: '#FF7B00',
  red: '#F04452',
  gray: '#8B95A1',

  // Soft backgrounds
  blueBg: '#E8F2FF',
  greenBg: '#E6F9F1',
  orangeBg: '#FFF4E5',
  redBg: '#FEF2F2',
  grayBg: '#F2F4F6',
} as const;

// 고객 등급 — Toss 톤으로 부드럽게
export const GradeColor = {
  A: { bg: '#FEF2F2', fg: '#D33645', dot: '#F04452' }, // 빨강 (최우선)
  B: { bg: '#FFF4E5', fg: '#D96B00', dot: '#FF7B00' }, // 주황
  C: { bg: '#E8F2FF', fg: '#1B64DA', dot: '#3182F6' }, // 블루
  D: { bg: '#F2F4F6', fg: '#4E5968', dot: '#8B95A1' }, // 그레이
} as const;

// 칸반 스테이지
export const StageStyle = {
  ta_target:         { label: '통화 예정', bg: '#F2F4F6', fg: '#4E5968', accent: '#8B95A1' },
  ta_done:           { label: '통화 완료', bg: '#E8F2FF', fg: '#1B64DA', accent: '#3182F6' },
  meeting_scheduled: { label: '미팅 예정', bg: '#FFF4E5', fg: '#D96B00', accent: '#FF7B00' },
  meeting_done:      { label: '미팅 완료', bg: '#EEF2FF', fg: '#4338CA', accent: '#6366F1' },
  contract:          { label: '계약',      bg: '#E6F9F1', fg: '#008F52', accent: '#00C471' },
  on_hold:           { label: '보류',      bg: '#F2F4F6', fg: '#4E5968', accent: '#8B95A1' },
} as const;

// Toss는 더 큰 라운드를 자주 씀 (12/16/20)
export const Radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

// 매우 부드러운 그림자 — 토스 특유
export const Shadow = {
  card: {
    shadowColor: '#191F28',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#191F28',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
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
    sans: "'Pretendard Variable', Pretendard, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
