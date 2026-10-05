-- 지원 접수 기간에 선택적인 시작·마감 시각을 저장합니다.
-- Supabase Dashboard > SQL Editor에서 한 번 실행하세요.

alter table public.applications
  add column if not exists start_time time,
  add column if not exists deadline_time time;

alter table public.applications
  drop constraint if exists applications_recruitment_time_check;

alter table public.applications
  add constraint applications_recruitment_time_check
  check (
    start_date is null
    or start_date <> deadline
    or start_time is null
    or deadline_time is null
    or start_time <= deadline_time
  );

notify pgrst, 'reload schema';
