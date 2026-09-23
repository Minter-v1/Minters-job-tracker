-- ApplyLog database schema for Supabase
-- Run this file in Supabase Dashboard > SQL Editor.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company text not null check (char_length(trim(company)) > 0),
  role text not null check (char_length(trim(role)) > 0),
  deadline date not null,
  status text not null default '준비 중'
    check (status in ('관심', '준비 중', '지원 완료', '서류 합격', '면접', '최종 합격', '불합격')),
  current_step text not null default '지원 준비'
    check (current_step in ('지원 준비', '서류 심사', '코딩테스트', '인적성', 'AI 역량검사', '1차 면접', '2차 면접', '처우 협의', '최종 합격', '불합격')),
  assessments text[] not null default '{}'
    check (assessments <@ array['코딩테스트', '인적성', 'AI 역량검사']::text[]),
  link text not null default '',
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_tasks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  label text not null check (char_length(trim(label)) > 0),
  done boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_deadline_idx
  on public.applications (user_id, deadline);

create index if not exists applications_user_step_idx
  on public.applications (user_id, current_step);

create index if not exists application_tasks_application_position_idx
  on public.application_tasks (application_id, position);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

drop trigger if exists application_tasks_set_updated_at on public.application_tasks;
create trigger application_tasks_set_updated_at
  before update on public.application_tasks
  for each row execute function public.set_updated_at();

alter table public.applications enable row level security;
alter table public.application_tasks enable row level security;

drop policy if exists "Users manage their own applications" on public.applications;
create policy "Users manage their own applications"
  on public.applications
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage tasks for their own applications" on public.application_tasks;
create policy "Users manage tasks for their own applications"
  on public.application_tasks
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.applications
      where applications.id = application_tasks.application_id
        and applications.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.applications
      where applications.id = application_tasks.application_id
        and applications.user_id = (select auth.uid())
    )
  );
