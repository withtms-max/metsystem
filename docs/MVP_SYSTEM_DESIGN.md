# MET System - MVP 시스템 설계서
> 영업맨의 아날로그 노가다를 없애주는 AI 모바일 비서

---

## 1. 기술 스택 (Vibe Coding 최적화)

```
Frontend : Next.js 14 (App Router) + PWA (모바일 웹앱)
UI       : Tailwind CSS + shadcn/ui
Backend  : Next.js API Routes (서버리스)
DB       : Supabase (PostgreSQL + Auth + Realtime + Storage)
AI/STT   : OpenAI Whisper API (음성→텍스트) + GPT-4o (요약/파싱)
OCR      : Google Cloud Vision API (명함 스캐너)
Push     : Firebase Cloud Messaging (FCM)
Deploy   : Vercel
지도/위치 : Kakao Map API (한국 주소 최적화)
```

**왜 이 스택인가?**
- Supabase: Row Level Security(RLS)로 프라이버시 분리를 DB 레벨에서 강제
- PWA: 앱스토어 심사 없이 즉시 배포, 홈화면 위젯 지원
- Next.js: 프론트+백엔드 한 코드베이스로 Vibe Coding 속도 극대화

---

## 2. MVP 화면 구조도

### 2-A. 영업맨(설계사) 앱

```
📱 하단 탭 네비게이션 (4탭)
├── 🏠 [홈] 오늘의 대시보드
│   ├── 오늘의 3칸 미팅 위젯 (🔲🔲🔲 → ✅✅✅)
│   ├── 연속 달성 스트릭 🔥 (3일 연속!)
│   ├── 오늘의 골든타임 알림 카드 (계약 1주년 등)
│   └── 빠른 액션 버튼: [🎙️ 음성일지] [📇 명함스캔]
│
├── 📋 [생명수] 이달의 칸반보드
│   ├── 필터: 월 선택 (2026년 5월 ▼)
│   ├── 칸반 컬럼 (가로 스와이프)
│   │   ├── [TA 대상] → [TA 완료] → [미팅예정] → [미팅완료] → [계약/보류]
│   │   └── 각 카드: 고객명, 등급뱃지, 최근메모 1줄, 스와이프→전화
│   ├── ➕ 이번 달 생명수에 고객 추가
│   └── 스와이프 TA 모드 버튼 (틴더 스타일 진입)
│
├── 👥 [고객DB] 내 고객 관리
│   ├── 검색바 + 필터 (등급 A/B/C/D, 지역태그)
│   ├── 고객 리스트 (이름, 등급뱃지, 지역태그, 최근활동일)
│   ├── 고객 상세 페이지
│   │   ├── 기본정보 (이름/연락처/회사/직함/주소)
│   │   ├── 등급 설정 (A/B/C/D 원터치)
│   │   ├── 지역 태그 (자동+수동)
│   │   ├── 메모 타임라인 (AI 음성일지 자동기록 포함)
│   │   ├── 활동 이력 (전화/미팅/문자 로그)
│   │   ├── 골든타임 설정 (계약일, 생일 등)
│   │   └── 액션 버튼: [📞전화] [💬카톡템플릿] [🎙️음성메모]
│   └── ➕ 고객 추가 (수동입력 / 📇명함스캔 / 📱연락처 임포트)
│
└── 📍 [동선] 위치 기반 영업
    ├── 지역 태그 버튼들 (판교, 강남, 분당, 역삼...)
    ├── 선택 시 → 해당 지역 A/B급 고객 리스트
    ├── 지도 뷰 (고객 위치 핀)
    └── 각 고객 카드에서 바로 전화/카톡 액션
```

### 2-B. 스와이프 TA 모드 (풀스크린 오버레이)

```
📱 스와이프 TA 모드
┌─────────────────────────────┐
│  [오늘 TA: 3/10]            │
│                             │
│  ┌───────────────────────┐  │
│  │   김철수 대표          │  │
│  │   ⭐ A등급 | 📍 판교   │  │
│  │   최근: 3주 전 미팅     │  │
│  │   메모: 가지급금 상담중  │  │
│  └───────────────────────┘  │
│                             │
│  ← 스킵        전화 걸기 → │
│                             │
│  [60초 타이머 대기중]       │
└─────────────────────────────┘

→ 전화 연결 시:
┌─────────────────────────────┐
│  📞 김철수 대표 통화중       │
│                             │
│      ⏱️ 00:47 / 01:00       │
│      ████████████░░  (진행바)│
│                             │
│  [50초 진동 알림 🔔]        │
│                             │
│  통화 후:                    │
│  [😊좋음] [😐보통] [😟별로]   │
│  + 한줄메모 입력 또는 🎙️음성 │
│                             │
│  [다음 고객 →]              │
└─────────────────────────────┘
```

### 2-C. 음성 일지 (바텀시트)

```
📱 음성 일지 바텀시트
┌─────────────────────────────┐
│  🎙️ 음성 영업일지           │
│                             │
│  [●  녹음중... 00:08]       │
│                             │
│  "김철수 대표 만났고         │
│   가지급금 문제로            │
│   다음주 화요일 2차 미팅..." │
│                             │
│  [중지] [완료 ✓]            │
└─────────────────────────────┘

→ AI 처리 후:
┌─────────────────────────────┐
│  ✨ AI 분석 완료             │
│                             │
│  📌 연결 고객: 김철수 대표   │
│  📝 메모: 가지급금 문제 상담,│
│          분위기 좋음         │
│  📅 다음 액션: 5/20(화)     │
│     2차 미팅 예정            │
│  🏷️ 상태: 미팅완료→계약진행  │
│                             │
│  [수정] [저장 ✓]            │
└─────────────────────────────┘
```

### 2-D. 관리자(센터장) 대시보드 — 별도 웹

```
🖥️ 관리자 대시보드 (웹)
├── 📊 [대시보드] 팀 활동 현황
│   ├── 오늘/이번주/이번달 토글
│   ├── 팀원별 활동 카드 (⚠️ 통계만! 고객명 없음!)
│   │   ├── 김사원: 📞 TA 8건 | 🤝 미팅 2건 | ✍️ 계약 0건
│   │   ├── 이사원: 📞 TA 12건 | 🤝 미팅 3건 | ✍️ 계약 1건
│   │   └── ...
│   ├── 팀 평균 vs 목표 달성률 차트
│   └── 주간 트렌드 그래프 (활동량 추이)
│
├── 🏆 [랭킹] 팀 챌린지
│   ├── 이번 주 TA왕 / 미팅왕
│   ├── 연속 3명 달성 스트릭 랭킹
│   └── 팀 전체 달성률
│
├── 👥 [팀원] 팀원 관리
│   ├── 팀원 초대 (초대 링크/코드)
│   ├── 팀원 목록 + 활동 요약
│   └── 팀원별 월간 리포트
│
└── ⚙️ [설정]
    ├── 조직 정보
    ├── 구독/결제 관리
    ├── 목표 설정 (일일 TA 목표, 미팅 목표)
    └── 알림 설정
```

---

## 3. DB 스키마 (Supabase PostgreSQL)

```sql
-- ============================================
-- 1. 조직 & 사용자
-- ============================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    industry VARCHAR(50),            -- 보험/부동산/자동차/B2B/제약
    subscription_plan VARCHAR(20) DEFAULT 'trial',
    subscription_expires_at TIMESTAMPTZ,
    daily_ta_goal INT DEFAULT 10,
    daily_meeting_goal INT DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('salesperson', 'manager', 'owner')),
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 고객 DB (핵심! RLS로 본인만 접근)
-- ============================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id),    -- 이 고객 정보의 주인
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    company VARCHAR(100),
    job_title VARCHAR(50),
    address TEXT,
    grade CHAR(1) DEFAULT 'D' CHECK (grade IN ('A','B','C','D')),
    region_tag VARCHAR(30),          -- 판교, 강남, 분당 등
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    source VARCHAR(20),              -- manual, business_card, contact_import
    profile_image_url TEXT,
    memo TEXT,
    contract_date DATE,              -- 계약일 (골든타임 기준)
    birthday DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔒 RLS: 본인 고객만 조회/수정 가능
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_owner_only" ON customers
    FOR ALL USING (owner_id = auth.uid());

-- ============================================
-- 3. 활동 로그 (TA, 미팅, 메모 등)
-- ============================================

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    customer_id UUID REFERENCES customers(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    activity_type VARCHAR(20) NOT NULL
        CHECK (activity_type IN ('ta_call','meeting','memo','message','contract')),
    status VARCHAR(20),              -- completed, scheduled, cancelled
    duration_seconds INT,            -- 통화 시간
    mood VARCHAR(10),                -- good, neutral, bad (통화 후 분위기)
    note TEXT,                       -- 한줄 메모
    source VARCHAR(20),              -- manual, voice_memo, swipe_ta
    activity_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔒 RLS: 활동 상세는 본인만, 관리자는 별도 뷰로 통계만
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_own" ON activity_logs
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 4. 관리자용 통계 뷰 (고객명 제외! 숫자만!)
-- ============================================

CREATE VIEW manager_activity_stats AS
SELECT
    al.organization_id,
    al.user_id,
    u.name AS salesperson_name,
    al.activity_date,
    al.activity_type,
    COUNT(*) AS count,
    SUM(CASE WHEN al.status = 'completed' THEN 1 ELSE 0 END) AS completed_count
FROM activity_logs al
JOIN users u ON al.user_id = u.id
GROUP BY al.organization_id, al.user_id, u.name, al.activity_date, al.activity_type;

-- 🔒 관리자만 자기 조직 통계 조회
-- (Supabase RLS 함수로 organization_id 매칭)

-- ============================================
-- 5. 생명수 (월간 칸반보드)
-- ============================================

CREATE TABLE pipeline_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    month_key VARCHAR(7) NOT NULL,   -- '2026-05' 형태
    stage VARCHAR(20) DEFAULT 'ta_target'
        CHECK (stage IN ('ta_target','ta_done','meeting_scheduled',
                         'meeting_done','contract','on_hold')),
    sort_order INT DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, customer_id, month_key)
);

ALTER TABLE pipeline_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_owner_only" ON pipeline_cards
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 6. 골든타임 알림 설정
-- ============================================

CREATE TABLE golden_time_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    customer_id UUID REFERENCES customers(id),  -- NULL이면 전체 고객 적용
    rule_type VARCHAR(30) NOT NULL
        CHECK (rule_type IN ('contract_anniversary','birthday',
                             'holiday_greeting','custom','follow_up')),
    trigger_date DATE,               -- 특정 날짜 (custom/follow_up용)
    recurrence VARCHAR(20),          -- yearly, monthly, once
    days_before INT DEFAULT 0,       -- N일 전 알림
    message_template TEXT,           -- 카톡 템플릿 연동
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE golden_time_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "golden_time_owner_only" ON golden_time_rules
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 7. 음성 메모 (STT 원본 보관)
-- ============================================

CREATE TABLE voice_memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    customer_id UUID REFERENCES customers(id),  -- AI가 매칭한 고객
    audio_url TEXT,                  -- Supabase Storage URL
    raw_transcript TEXT,             -- Whisper STT 원문
    ai_summary TEXT,                 -- GPT 요약
    ai_extracted_action JSONB,       -- {"next_meeting": "2026-05-20", "topic": "2차 제안서"}
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voice_memo_owner_only" ON voice_memos
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 8. 메시지 템플릿
-- ============================================

CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id), -- NULL이면 시스템 기본
    category VARCHAR(30),            -- holiday, anniversary, follow_up, greeting
    title VARCHAR(50),
    body_template TEXT,              -- "{{customer_name}} 대표님, {{memo_keyword}}..."
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. 명함 스캔 이력
-- ============================================

CREATE TABLE business_card_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    customer_id UUID REFERENCES customers(id),  -- 생성된 고객 레코드
    image_url TEXT,
    ocr_raw_data JSONB,              -- OCR 원본 결과
    ocr_parsed JSONB,                -- {"name":"","phone":"","company":"","address":""}
    auto_region_tag VARCHAR(30),     -- 주소 기반 자동 태깅된 지역
    status VARCHAR(20) DEFAULT 'pending',  -- pending, confirmed, rejected
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE business_card_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scan_owner_only" ON business_card_scans
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 10. 인덱스
-- ============================================

CREATE INDEX idx_customers_owner_grade ON customers(owner_id, grade);
CREATE INDEX idx_customers_owner_region ON customers(owner_id, region_tag);
CREATE INDEX idx_customers_owner_name ON customers(owner_id, name);
CREATE INDEX idx_activity_user_date ON activity_logs(user_id, activity_date);
CREATE INDEX idx_activity_org_date ON activity_logs(organization_id, activity_date);
CREATE INDEX idx_pipeline_user_month ON pipeline_cards(user_id, month_key);
CREATE INDEX idx_golden_time_trigger ON golden_time_rules(trigger_date, is_active);
```

---

## 4. 프라이버시 분리 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                    Supabase RLS                      │
│                                                      │
│  영업맨 A ──→ customers (WHERE owner_id = A)         │
│             → activity_logs (WHERE user_id = A)      │
│             → 본인 고객 상세정보 전체 열람 ✅          │
│                                                      │
│  센터장 M ──→ manager_activity_stats VIEW             │
│             → WHERE organization_id = M의 조직       │
│             → 고객명/연락처/메모 접근 불가 🚫          │
│             → 보이는 것: "김사원: TA 10건, 미팅 3건"  │
│                                                      │
│  ⚡ DB 레벨에서 강제되므로 API 실수로도 유출 불가      │
└─────────────────────────────────────────────────────┘
```

---

## 5. 스프린트 계획

### 🏃 Sprint 1 (2주) — "일단 쓸 수 있게" ← 여기서 시작!

**목표: 고객 DB + 생명수 칸반 + 기본 활동 기록**

| 일차 | 작업 |
|------|------|
| Day 1-2 | Supabase 프로젝트 셋업, 인증(소셜로그인), DB 스키마, RLS |
| Day 3-4 | 고객 CRUD (등록/수정/삭제/검색), 등급 관리 (ABCD) |
| Day 5-6 | 생명수 칸반보드 (드래그&드롭 스테이지 이동) |
| Day 7-8 | 활동 기록 (전화/미팅 수동 기록), 홈 대시보드 (3칸 위젯) |
| Day 9-10 | 관리자 가입 플로우, 팀원 초대, 관리자 통계 뷰 |
| Day 11-12 | PWA 설정, 모바일 최적화, 기본 테스트 |
| Day 13-14 | 버그 픽스, 내부 테스트, 보험 GA 2-3명에게 베타 배포 |

**Sprint 1 완료 시 검증할 것:**
- 영업맨이 엑셀 대신 이 앱에 고객을 등록하는가?
- 칸반보드를 종이 생명수 대신 사용하는가?
- 센터장이 활동 통계를 보고 만족하는가?

### 🏃 Sprint 2 (2주) — "습관 만들기"

| 기능 | 설명 |
|------|------|
| 스와이프 TA + 60초 타이머 | 틴더식 전화 UX, 자동 활동 기록 |
| 골든타임 알림 | 계약 기념일/생일 Push 알림 |
| 카톡 템플릿 | 반자동 메시지 생성, 카카오톡 딥링크 |
| 스트릭 & 미팅 위젯 강화 | 🔥 연속 달성, 애니메이션 |

### 🏃 Sprint 3 (2주) — "AI 마법"

| 기능 | 설명 |
|------|------|
| 음성 일지 (STT + AI) | Whisper → GPT 요약 → 자동 기록 |
| 명함 스캐너 | OCR → 자동 고객등록 + 지역태깅 |
| 위치 기반 동선 | 지역별 고객 필터 + 지도 뷰 |
| 오늘의 3명 AI 추천 | 만남 우선순위 자동 제안 |

### 🏃 Sprint 4 (2주) — "성장 엔진"

| 기능 | 설명 |
|------|------|
| 팀 챌린지/랭킹 | 게이미피케이션 |
| 주간 리포트 카드 | 자동 Push 성과 요약 |
| 센터장 벤치마킹 | 팀 평균 vs 상위 비교 |
| 결제 시스템 | Stripe/토스페이먼츠 구독 연동 |

---

## 6. 첫 번째 스프린트(Sprint 1) 상세 추천

### 왜 "고객DB + 칸반"부터인가?

```
❌ 음성인식, 명함스캔 → 기술적으로 화려하지만 검증 안 된 가설
❌ 위치 기반 → 고객 데이터가 쌓여야 의미 있음

✅ 고객DB + 칸반 = 영업맨의 "종이 생명수"를 대체하는 것
   → 이것조차 안 쓰면 나머지 기능은 의미 없음
   → 가장 빠르게 PMF(Product-Market Fit)를 검증 가능
   → 2주 만에 실제 영업맨에게 쥐여주고 반응 확인
```

### Sprint 1 핵심 화면 4개만 만들기

```
1. 로그인/가입 (카카오 소셜로그인)
2. 고객 DB 리스트 + 등록/수정
3. 이달의 생명수 칸반보드
4. 홈 대시보드 (오늘의 3칸 + 활동 요약)
+ 관리자: 팀 활동 통계 1페이지
```

---

## 7. 폴더 구조 (Next.js App Router)

```
metsystem/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (salesperson)/           # 영업맨 앱
│   │   │   ├── layout.tsx           # 하단탭 네비게이션
│   │   │   ├── home/page.tsx        # 홈 대시보드
│   │   │   ├── pipeline/page.tsx    # 생명수 칸반
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx         # 고객 리스트
│   │   │   │   ├── [id]/page.tsx    # 고객 상세
│   │   │   │   └── new/page.tsx     # 고객 등록
│   │   │   ├── route-sales/page.tsx # 동선 영업
│   │   │   └── swipe-ta/page.tsx    # 스와이프 TA 모드
│   │   ├── (manager)/               # 관리자 웹
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx   # 팀 활동 통계
│   │   │   ├── team/page.tsx        # 팀원 관리
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── ai/
│   │       │   ├── voice-memo/route.ts   # STT + 요약
│   │       │   └── scan-card/route.ts    # 명함 OCR
│   │       └── webhooks/
│   │           └── golden-time/route.ts  # 크론잡 알림
│   ├── components/
│   │   ├── ui/                      # shadcn 컴포넌트
│   │   ├── kanban/                  # 칸반보드
│   │   ├── swipe-ta/                # 스와이프 TA
│   │   ├── voice-recorder/          # 음성 녹음
│   │   └── business-card-scanner/   # 명함 스캐너
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── types.ts             # DB 타입 자동생성
│   │   ├── ai/
│   │   │   ├── whisper.ts
│   │   │   └── gpt.ts
│   │   └── utils/
│   │       ├── region-tagger.ts     # 주소→지역태그 변환
│   │       └── golden-time.ts       # 골든타임 계산
│   └── hooks/
│       ├── use-customers.ts
│       ├── use-pipeline.ts
│       └── use-activity.ts
├── public/
│   └── manifest.json                # PWA 매니페스트
├── supabase/
│   └── migrations/                  # DB 마이그레이션 SQL
└── docs/
    └── MVP_SYSTEM_DESIGN.md         # 이 파일
```
