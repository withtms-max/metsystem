#!/usr/bin/env node
// Supabase 환경변수 검증 스크립트
// 사용법: node scripts/check-env.mjs

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ENV_LOCATIONS = [
  '.env.local',
  '.env',
  'apps/admin/.env.local',
  'apps/admin/.env',
  'apps/mobile/.env.local',
  'apps/mobile/.env',
];

const REQUIRED = [
  ['NEXT_PUBLIC_SUPABASE_URL', '관리자 웹용 Supabase URL'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', '관리자 웹용 anon key'],
  ['EXPO_PUBLIC_SUPABASE_URL', '모바일용 Supabase URL'],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', '모바일용 anon key'],
];

async function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const raw = await readFile(path, 'utf-8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    out[key] = value;
  }
  return out;
}

async function main() {
  console.log('🔍 MET System — Supabase 환경변수 검증\n');

  const allEnv = {};
  for (const loc of ENV_LOCATIONS) {
    const full = join(ROOT, loc);
    if (existsSync(full)) {
      const env = await loadEnvFile(full);
      Object.assign(allEnv, env);
      console.log(`  ✓ ${loc} 로드됨`);
    }
  }
  console.log('');

  let missing = 0;
  for (const [key, desc] of REQUIRED) {
    const val = allEnv[key] ?? process.env[key];
    if (!val || val === 'placeholder-key' || val.includes('your-')) {
      console.log(`  ❌ ${key} (${desc})`);
      missing++;
    } else {
      const masked = val.length > 20 ? `${val.slice(0, 16)}...${val.slice(-4)}` : val;
      console.log(`  ✅ ${key} = ${masked}`);
    }
  }

  console.log('');
  if (missing > 0) {
    console.log(`⚠️  ${missing}개 환경변수가 비어있어요.\n`);
    console.log('해결 방법:');
    console.log('  1. https://supabase.com 에서 프로젝트 생성');
    console.log('  2. Settings → API 에서 URL과 anon key 복사');
    console.log('  3. 프로젝트 루트에 .env.local 파일 생성 후 입력:');
    console.log('');
    console.log('     NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co');
    console.log('     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...');
    console.log('     EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co');
    console.log('     EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...');
    console.log('');
    console.log('  4. dev 서버 재시작 (Ctrl+C 후 다시 실행)');
    process.exit(1);
  } else {
    console.log('🎉 모든 환경변수가 설정되었어요! 이제 서버를 (재)시작하세요.');
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('스크립트 오류:', e);
  process.exit(1);
});
