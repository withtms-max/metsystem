import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createSupabaseClient } from '@metsystem/shared';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[MET] Supabase 환경변수 미설정. .env.local 파일에 EXPO_PUBLIC_SUPABASE_URL과 ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY를 입력해주세요.',
  );
}

// 네이티브(iOS/Android)는 AsyncStorage, 웹은 Supabase 기본(localStorage) 사용
// 웹에서 AsyncStorage를 강제하면 SSR 단계에서 window 참조 에러 발생
const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createSupabaseClient({
  url: url ?? 'https://placeholder.supabase.co',
  anonKey: anonKey ?? 'placeholder-key',
  storage,
  detectSessionInUrl: Platform.OS === 'web',
});
