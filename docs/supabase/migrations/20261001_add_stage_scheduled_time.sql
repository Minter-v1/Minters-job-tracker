-- 전형 일정에 선택적인 시각을 저장합니다.
-- Supabase Dashboard > SQL Editor에서 한 번 실행하세요.

alter table public.application_stages
  add column if not exists scheduled_time time;
