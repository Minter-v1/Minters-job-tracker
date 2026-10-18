-- 사용자별 취업 플랫폼을 관리하고 각 지원 정보와 선택적으로 연결합니다.
-- Supabase Dashboard > SQL Editor에서 한 번 실행하세요.

begin;

create table if not exists public.job_platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 40),
  url text not null check (char_length(url) between 1 and 2048 and url ~* '^https?://'),
  memo text not null default '' check (char_length(memo) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists job_platforms_user_name_lower_idx
  on public.job_platforms (user_id, lower(name));

alter table public.applications
  add column if not exists platform_id uuid;

alter table public.applications
  drop constraint if exists applications_platform_id_fkey;

alter table public.applications
  add constraint applications_platform_id_fkey
  foreign key (platform_id) references public.job_platforms (id) on delete set null;

create index if not exists applications_user_platform_idx
  on public.applications (user_id, platform_id)
  where platform_id is not null;

drop trigger if exists job_platforms_set_updated_at on public.job_platforms;
create trigger job_platforms_set_updated_at
  before update on public.job_platforms
  for each row execute function public.set_updated_at();

alter table public.job_platforms enable row level security;

revoke all on public.job_platforms from anon;
grant select, insert, update, delete on public.job_platforms to authenticated;

drop policy if exists "Users manage their own job platforms" on public.job_platforms;
create policy "Users manage their own job platforms"
  on public.job_platforms
  for all
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

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
    and (
      platform_id is null
      or exists (
        select 1
        from public.job_platforms
        where job_platforms.id = applications.platform_id
          and job_platforms.user_id = (select auth.uid())
      )
    )
  );

commit;

notify pgrst, 'reload schema';
