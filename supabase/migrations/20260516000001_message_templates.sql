-- ============================================
-- MET System - message_templates 테이블 + 등급별 1분 TA 스크립트 시드
-- 2026-05-16
-- ============================================
-- 용도: 스와이프 TA 모드에서 60초 통화 전 화면에 띄울 1분 스크립트.
--      AI 호출 없이 템플릿 변수 치환으로 비용 절감.
-- ============================================

create table if not exists public.message_templates (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade,
    -- NULL = 시스템 기본 (모든 조직 공유)
    category varchar(30) not null,
    -- 'ta_script' (스와이프 TA용), 'kakao_greeting', 'holiday', 'anniversary' 등
    target_grade char(1) check (target_grade in ('A','B','C','D')),
    -- NULL = 모든 등급
    situation varchar(30),
    -- 'nearby_visit' (근처 왔다가), 'long_untouched' (오랜만에), 'cold_call' 등
    title varchar(50),
    body_template text not null,
    -- "{{title}}님! 저 지금 근처 {{region}} 왔다가..."
    tone varchar(20),
    -- 'friendly', 'formal', 'casual'
    is_active boolean default true,
    sort_order int default 0,
    created_at timestamptz default now()
);

create index if not exists idx_templates_lookup
  on public.message_templates(category, target_grade, situation, is_active);

-- RLS: 시스템 기본은 누구나 조회, 조직별은 그 조직 멤버만 조회
alter table public.message_templates enable row level security;

drop policy if exists "templates_read" on public.message_templates;
create policy "templates_read"
    on public.message_templates for select
    using (
      organization_id is null
      or organization_id = public.get_my_organization_id()
    );

-- ============================================
-- 시드 데이터: 등급별 × 상황별 × 3-4 variant (식상함 방지)
-- ============================================

-- A급 + nearby_visit (친근한 톤, VIP)
insert into public.message_templates (category, target_grade, situation, body_template, tone, sort_order) values
('ta_script', 'A', 'nearby_visit',
 '{{title}}! 저 지금 근처 {{region}} 스케줄 왔다가 딱 생각나서 전화했어요. 지금 잠깐 티타임 되세요? 안 되면 다음 주에 올 때 미리 연락할게요!',
 'friendly', 1),
('ta_script', 'A', 'nearby_visit',
 '{{title}} 오랜만이에요! {{region}} 미팅 와있는데 진짜 가까워서 안 전화하면 섭섭하잖아요. 5분만 시간 되시면 커피 한 잔 사드릴게요!',
 'friendly', 2),
('ta_script', 'A', 'nearby_visit',
 '{{title}}! 일정 마치고 {{region}} 카페에서 다음 미팅 기다리는 중인데, {{customer_name}}님 생각이 나서요. 잠깐 짬 되세요?',
 'friendly', 3);

-- B급 + nearby_visit (격식 + 부담 없이)
insert into public.message_templates (category, target_grade, situation, body_template, tone, sort_order) values
('ta_script', 'B', 'nearby_visit',
 '{{title}}, 잘 지내시죠? 저 오늘 {{region}}에 미팅 있어서 왔는데 사무실 근처라 안부차 전화드렸습니다. 오늘 바쁘실 테니, 조만간 이쪽 올 때 식사 한번 하시죠!',
 'formal', 1),
('ta_script', 'B', 'nearby_visit',
 '{{title}}, 안녕하세요! {{region}} 출장 와있다가 생각나서 연락드렸어요. 별일 없으시죠? 다음에 이쪽 오면 미리 연락드리고 차 한 잔 하시죠.',
 'formal', 2);

-- C급 + nearby_visit (정중하게)
insert into public.message_templates (category, target_grade, situation, body_template, tone, sort_order) values
('ta_script', 'C', 'nearby_visit',
 '{{title}}, 안녕하세요. {{customer_name}} 보험 담당입니다. {{region}} 쪽 일정이 있어서 왔다가 생각나서 안부차 연락드렸어요. 별일 없으시죠?',
 'formal', 1);

-- 장기 미터치 (6개월+ 안 만남, 등급 무관)
insert into public.message_templates (category, target_grade, situation, body_template, tone, sort_order) values
('ta_script', null, 'long_untouched',
 '{{title}}, 오랜만입니다! 저 오늘 {{region}} 쪽 외근 나왔다가 예전 {{title}} 명함 보고 생각나서 연락드렸어요. 사업은 잘 되시죠? 근처 올 일 많아졌는데 조만간 커피 한잔하시죠!',
 'formal', 1),
('ta_script', null, 'long_untouched',
 '{{title}}, 너무 오랫동안 연락 못 드렸네요. 저 요즘 {{region}} 쪽 자주 와서, {{title}} 떠올라 전화드렸어요. 어떻게 지내세요?',
 'formal', 2);

-- 콜드콜 fallback (지역 정보 없을 때)
insert into public.message_templates (category, target_grade, situation, body_template, tone, sort_order) values
('ta_script', null, 'cold_call',
 '{{title}}, 안녕하세요. {{customer_name}} 담당자입니다. 오늘 잠시 시간 괜찮으시면 안부 인사 겸 전화드렸어요. 별일 없으시죠?',
 'formal', 1);

-- 카톡 안부 (스와이프 TA 외에도 사용)
insert into public.message_templates (category, target_grade, situation, body_template, tone, sort_order) values
('kakao_greeting', null, 'anniversary',
 '{{title}} 안녕하세요! 오늘 계약 1주년이 되는 날이네요 🎉 지금까지 신뢰해주셔서 감사드리고, 앞으로도 함께 좋은 인연 이어가요!',
 'friendly', 1),
('kakao_greeting', null, 'holiday',
 '{{title}}, 즐거운 명절 보내세요! 가족 분들과 행복한 시간 되시고, 새해 복 많이 받으시길 바랍니다 🙏',
 'formal', 1);

select 'message_templates seeded' as status,
       (select count(*) from public.message_templates) as total_count;
