-- Add an optional recruitment opening date.
-- The existing deadline remains the recruitment closing date.

begin;

alter table public.applications
  add column if not exists start_date date;

alter table public.applications
  drop constraint if exists applications_recruitment_period_check;

alter table public.applications
  add constraint applications_recruitment_period_check
  check (start_date is null or start_date <= deadline);

commit;
