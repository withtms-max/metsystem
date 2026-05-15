import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export const supabase = createSupabaseClient({
  url: url ?? 'https://placeholder.supabase.co',
  anonKey: anonKey ?? 'placeholder-key',
  storage: AsyncStorage,
  detectSessionInUrl: false,
});
