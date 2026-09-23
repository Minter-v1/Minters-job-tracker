-- Add user-defined recruitment stages and calendar schedules.
-- Run after 20260924_allow_custom_assessments.sql.

begin;

alter table public.applications
  drop constraint if exists applications_current_step_check;

alter table public.applications
  add constraint applications_current_step_check
  check (
    current_step = btrim(current_step)
    and char_length(current_step) between 1 and 40
  );

create table if not exists public.application_stages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  title text not null check (title = btrim(title) and char_length(title) between 1 and 40),
  scheduled_date date,
  completed boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Give existing applications an editable baseline workflow.
insert into public.application_stages (application_id, title, position)
select application.id, stage.title, stage.position
from public.applications as application
cross join lateral (
  select '지원 준비'::text as title, 0 as position
  union all
  select '서류 심사'::text, 1
  union all
  select assessment, assessment_order::integer + 1
  from unnest(application.assessments) with ordinality
    as selected_assessment(assessment, assessment_order)
  union all
  select '1차 면접'::text, 20
  union all
  select '최종 결과'::text, 21
) as stage
where not exists (
  select 1
  from public.application_stages
  where application_stages.application_id = application.id
);

create index if not exists application_stages_application_position_idx
  on public.application_stages (application_id, position);

create index if not exists application_stages_scheduled_date_idx
  on public.application_stages (scheduled_date)
  where scheduled_date is not null;

drop trigger if exists application_stages_set_updated_at on public.application_stages;
create trigger application_stages_set_updated_at
  before update on public.application_stages
  for each row execute function public.set_updated_at();

alter table public.application_stages enable row level security;

revoke all on public.application_stages from anon;
grant select, insert, update, delete on public.application_stages to authenticated;

drop policy if exists "Users manage stages for their own applications" on public.application_stages;
create policy "Users manage stages for their own applications"
  on public.application_stages
  for all
  to authenticated
  using (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.applications
      where applications.id = application_stages.application_id
        and applications.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.applications
      where applications.id = application_stages.application_id
        and applications.user_id = (select auth.uid())
    )
  );

commit;
