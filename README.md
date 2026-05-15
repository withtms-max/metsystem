# MET System

> 영업맨의 아날로그 노가다를 없애주는 AI 모바일 비서 — B2B SaaS

보험 GA, 부동산, 자동차, 제약 등 영업 조직을 위한 버티컬 CRM.
영업맨에겐 친근한 모바일 비서, 관리자(센터장)에겐 활동 통계만 제공하는
프라이버시 분리 구조.

---

## 모노레포 구조

```
metsystem/
├── apps/
│   ├── mobile/          📱 Expo (iOS + Android) — 영업맨 앱
│   └── admin/           🖥️  Next.js — 관리자(센터장) 웹
├── packages/
│   └── shared/          🔗 Supabase 타입, API 함수, 비즈니스 로직
├── supabase/
│   ├── migrations/      🗄️  DB 스키마 (SQL)
│   └── functions/       ⚡ Edge Functions (크론잡, AI)
└── docs/                📄 설계서, 개발 프로세스 문서
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 모바일 | Expo SDK 54 · React Native 0.81 · Expo Router · TypeScript |
| 웹 | Next.js 16 · React 19 · Tailwind v4 · TypeScript |
| 백엔드 | Supabase (PostgreSQL + Auth + RLS + Storage + Edge Functions) |
| 모노레포 | pnpm workspaces · Turborepo |
| AI | OpenAI Whisper(STT) + GPT-4o(요약) — Sprint 3 |
| OCR | Google Cloud Vision — Sprint 3 |
| 지도 | Kakao Map SDK |

## 시작하기

### 1. 의존성 설치
```bash
pnpm install
```

### 2. Supabase 셋업
`supabase/README.md` 가이드 따라:
- 프로젝트 생성
- `migrations/20260515000001_initial_schema.sql` SQL Editor에서 실행
- API 키 발급

### 3. 환경변수 설정
프로젝트 루트에 `.env.local` 생성 (`.env.example` 참고):
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

`.env.local` 파일을 `apps/admin/`, `apps/mobile/`, 루트 3곳에 복사.

### 4. 개발 서버 실행
```bash
# 모바일 (Expo Go 앱으로 QR 스캔)
pnpm dev:mobile

# 관리자 웹 (http://localhost:3000)
pnpm dev:admin

# 둘 다 동시에
pnpm dev
```

### 5. 빌드
```bash
pnpm build           # 전체
pnpm type-check      # 타입 체크
pnpm lint            # 린트
```

## 모바일 앱 실행

### Android (Windows에서 가능)
```bash
cd apps/mobile
pnpm android         # Android 에뮬레이터 또는 USB 연결 폰
```

### iOS (Mac 필요 또는 EAS Build)
```bash
cd apps/mobile
pnpm ios             # Mac에서만
# 또는: eas build --platform ios
```

### 폰에서 즉시 테스트 (개발 중)
1. App Store / Play Store에서 **Expo Go** 설치
2. `pnpm dev:mobile` 실행
3. 터미널에 뜨는 QR 코드를 폰 카메라로 스캔

## 핵심 기능 (Sprint 1)

- [x] 모노레포 셋업
- [ ] 인증 (카카오 소셜로그인) + 역할 분기 (영업맨/센터장)
- [ ] 고객 DB CRUD (등급 ABCD, 지역태그)
- [ ] 디지털 생명수 칸반보드 (월별)
- [ ] 홈 대시보드 (3칸 미팅 위젯, 스트릭)
- [ ] 관리자 활동 통계 대시보드 (통계만! 고객정보 없음)

## 핵심 기능 (Sprint 2~)

- [ ] 스와이프 TA + 60초 타이머
- [ ] 골든타임 자동 알림 (계약 기념일, 명절 등)
- [ ] 반자동 카톡 템플릿
- [ ] 음성일지 (STT + AI 요약)
- [ ] 명함 스캐너 (OCR + 자동 지역태깅)
- [ ] 위치 기반 동선 영업
- [ ] 팀 챌린지 / 게이미피케이션
- [ ] 결제 시스템

## 프라이버시 원칙

⚠️ **고객 상세정보는 영업맨 본인만 접근 가능**

Supabase RLS(Row Level Security)로 DB 레벨에서 강제:
- `customers` 테이블: `owner_id = auth.uid()` 정책
- 관리자는 `manager_activity_stats` VIEW로 **통계만** 접근
- 고객명, 연락처, 메모는 관리자에게 절대 노출 불가

## 문서

- [`docs/MVP_SYSTEM_DESIGN.md`](docs/MVP_SYSTEM_DESIGN.md) — 시스템 설계서
- [`docs/DEVELOPMENT_PROCESS.md`](docs/DEVELOPMENT_PROCESS.md) — Phase별 개발 프로세스
- [`supabase/README.md`](supabase/README.md) — DB 셋업 가이드
