-- ApplyLog RLS isolation verification
--
-- Prerequisite:
--   Supabase Dashboard > Authentication > Users must contain two test users.
--
-- Before running:
--   Replace REPLACE_WITH_USER_A_UUID and REPLACE_WITH_USER_B_UUID below.
--
-- Safety:
--   This script runs inside a transaction and finishes with ROLLBACK.
--   The test applications and tasks are not retained.

begin;

select set_config('rls_test.user_a', 'REPLACE_WITH_USER_A_UUID', true);
select set_config('rls_test.user_b', 'REPLACE_WITH_USER_B_UUID', true);
select set_config('rls_test.app_a', '00000000-0000-4000-a000-000000000001', true);
select set_config('rls_test.app_b', '00000000-0000-4000-a000-000000000002', true);

create temp table rls_test_results (
  test_name text not null,
  passed boolean not null
) on commit drop;

grant select, insert on table pg_temp.rls_test_results to authenticated;

delete from public.applications
where id in (
  current_setting('rls_test.app_a')::uuid,
  current_setting('rls_test.app_b')::uuid
);

insert into public.applications (
  id,
  user_id,
  company,
  role,
  deadline,
  status,
  current_step
)
values
  (
    current_setting('rls_test.app_a')::uuid,
    current_setting('rls_test.user_a')::uuid,
    'RLS 테스트 기업 A',
    'Backend Engineer',
    current_date + 30,
    '준비 중',
    '지원 준비'
  ),
  (
    current_setting('rls_test.app_b')::uuid,
    current_setting('rls_test.user_b')::uuid,
    'RLS 테스트 기업 B',
    'Frontend Engineer',
    current_date + 30,
    '준비 중',
    '지원 준비'
  );

insert into public.application_tasks (
  id,
  application_id,
  label,
  position
)
values
  (
    '00000000-0000-4000-b000-000000000001',
    current_setting('rls_test.app_a')::uuid,
    '사용자 A 체크리스트',
    0
  ),
  (
    '00000000-0000-4000-b000-000000000002',
    current_setting('rls_test.app_b')::uuid,
    '사용자 B 체크리스트',
    0
  );

create or replace function pg_temp.task_insert_is_blocked(
  target_application_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.application_tasks (application_id, label, position)
  values (target_application_id, '차단되어야 하는 체크리스트', 999);

  return false;
exception
  when insufficient_privilege then
    return true;
end;
$$;

-- User A session
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('rls_test.user_a'),
    'role', 'authenticated'
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  current_setting('rls_test.user_a'),
  true
);
set local role authenticated;

insert into pg_temp.rls_test_results
values (
  'A: auth.uid()가 사용자 A와 일치',
  (select auth.uid() = current_setting('rls_test.user_a')::uuid)
);

insert into pg_temp.rls_test_results
select
  'A: 본인 applications 한 건만 조회',
  count(*) = 1
from public.applications
where id in (
  current_setting('rls_test.app_a')::uuid,
  current_setting('rls_test.app_b')::uuid
);

with affected as (
  update public.applications
  set company = 'RLS A 수정 성공'
  where id = current_setting('rls_test.app_a')::uuid
  returning 1
)
insert into pg_temp.rls_test_results
select 'A: 본인 application 수정 허용', count(*) = 1 from affected;

with affected as (
  update public.applications
  set company = '침범 시도'
  where id = current_setting('rls_test.app_b')::uuid
  returning 1
)
insert into pg_temp.rls_test_results
select 'A: 사용자 B application 수정 차단', count(*) = 0 from affected;

with affected as (
  delete from public.applications
  where id = current_setting('rls_test.app_b')::uuid
  returning 1
)
insert into pg_temp.rls_test_results
select 'A: 사용자 B application 삭제 차단', count(*) = 0 from affected;

insert into pg_temp.rls_test_results
select
  'A: 본인 application_tasks 한 건만 조회',
  count(*) = 1
from public.application_tasks
where application_id in (
  current_setting('rls_test.app_a')::uuid,
  current_setting('rls_test.app_b')::uuid
);

insert into pg_temp.rls_test_results
values (
  'A: 사용자 B application에 task 생성 차단',
  pg_temp.task_insert_is_blocked(current_setting('rls_test.app_b')::uuid)
);

reset role;

-- User B session
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('rls_test.user_b'),
    'role', 'authenticated'
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  current_setting('rls_test.user_b'),
  true
);
set local role authenticated;

insert into pg_temp.rls_test_results
values (
  'B: auth.uid()가 사용자 B와 일치',
  (select auth.uid() = current_setting('rls_test.user_b')::uuid)
);

insert into pg_temp.rls_test_results
select
  'B: 본인 applications 한 건만 조회',
  count(*) = 1
from public.applications
where id in (
  current_setting('rls_test.app_a')::uuid,
  current_setting('rls_test.app_b')::uuid
);

with affected as (
  update public.applications
  set company = '침범 시도'
  where id = current_setting('rls_test.app_a')::uuid
  returning 1
)
insert into pg_temp.rls_test_results
select 'B: 사용자 A application 수정 차단', count(*) = 0 from affected;

with affected as (
  delete from public.applications
  where id = current_setting('rls_test.app_a')::uuid
  returning 1
)
insert into pg_temp.rls_test_results
select 'B: 사용자 A application 삭제 차단', count(*) = 0 from affected;

insert into pg_temp.rls_test_results
select
  'B: 본인 application_tasks 한 건만 조회',
  count(*) = 1
from public.application_tasks
where application_id in (
  current_setting('rls_test.app_a')::uuid,
  current_setting('rls_test.app_b')::uuid
);

insert into pg_temp.rls_test_results
values (
  'B: 사용자 A application에 task 생성 차단',
  pg_temp.task_insert_is_blocked(current_setting('rls_test.app_a')::uuid)
);

reset role;

select test_name, passed
from pg_temp.rls_test_results
order by test_name;

select bool_and(passed) as all_rls_tests_passed
from pg_temp.rls_test_results;

rollback;
