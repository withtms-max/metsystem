# Supabase 셋업 가이드

## 처음 한 번만 실행

### 1. Supabase 프로젝트 생성
1. https://supabase.com → New Project
2. 프로젝트 이름: `metsystem`
3. 비밀번호 설정 (안전하게 보관)
4. Region: `Northeast Asia (Seoul) - ap-northeast-2`

### 2. 환경변수 복사
프로젝트 생성 후 Settings → API 에서:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
- `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` (서버에서만 사용, 절대 클라이언트 노출 X)

위 값들을 프로젝트 루트의 `.env.local` 파일에 입력 (`.env.example` 참고)

### 3. 초기 스키마 실행
1. Supabase Dashboard → SQL Editor
2. `migrations/20260515000001_initial_schema.sql` 내용 전체 복사
3. SQL Editor에 붙여넣기 → Run
4. ✅ 9개 테이블 + 1 View + RLS 정책 + Trigger 자동 생성됨

### 4. 카카오 소셜 로그인 설정
1. Authentication → Providers → Kakao 활성화
2. Kakao Developers에서 앱 생성 후 REST API 키 입력
3. Redirect URL 추가:
   - 웹: `https://<project>.supabase.co/auth/v1/callback`
   - 모바일: `metsystem://auth/callback`

### 5. 검증
SQL Editor에서:
```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```
결과: 6개 테이블 + manager_activity_stats 뷰가 보이면 성공

## 디렉토리 구조
```
supabase/
├── migrations/      ← SQL 마이그레이션 (순서대로 실행)
└── functions/       ← Edge Functions (Sprint 2+에서 크론잡/AI용)
```
