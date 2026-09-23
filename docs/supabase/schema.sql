-- ApplyLog database schema for an owner-managed Supabase project.
-- Run this file in Supabase Dashboard > SQL Editor.

create schema if not exists private;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(trim(email)) > 3),
  name text not null default '',
  reason text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  invited_user_id uuid references auth.users (id) on delete set null
);

create unique index if not exists access_requests_email_lower_idx
  on public.access_requests (lower(email));

create index if not exists access_requests_status_requested_idx
  on public.access_requests (status, requested_at desc);

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

create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

drop trigger if exists on_auth_user_created_set_role on auth.users;
create trigger on_auth_user_created_set_role
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

drop trigger if exists application_tasks_set_updated_at on public.application_tasks;
create trigger application_tasks_set_updated_at
  before update on public.application_tasks
  for each row execute function public.set_updated_at();

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.user_roles enable row level security;
alter table public.access_requests enable row level security;
alter table public.applications enable row level security;
alter table public.application_tasks enable row level security;

revoke all on public.user_roles from anon;
revoke all on public.access_requests from anon;
revoke all on public.applications from anon;
revoke all on public.application_tasks from anon;

grant select on public.user_roles to authenticated;
grant select, update on public.access_requests to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select, insert, update, delete on public.application_tasks to authenticated;

drop policy if exists "Users read their own role" on public.user_roles;
create policy "Users read their own role"
  on public.user_roles
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and ((select auth.uid()) = user_id or (select private.is_admin()))
  );

drop policy if exists "Admins read access requests" on public.access_requests;
create policy "Admins read access requests"
  on public.access_requests
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Admins update access requests" on public.access_requests;
create policy "Admins update access requests"
  on public.access_requests
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Users manage their own applications" on public.applications;
create policy "Users manage their own applications"
  on public.applications
  for all
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
  )
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
  );

drop policy if exists "Users manage tasks for their own applications" on public.application_tasks;
create policy "Users manage tasks for their own applications"
  on public.application_tasks
  for all
  to authenticated
  using (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.applications
      where applications.id = application_tasks.application_id
        and applications.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.applications
      where applications.id = application_tasks.application_id
        and applications.user_id = (select auth.uid())
    )
  );
