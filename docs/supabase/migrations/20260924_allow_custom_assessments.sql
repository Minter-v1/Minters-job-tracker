-- Allow user-defined recruitment assessments.
-- Run in Supabase Dashboard > SQL Editor before deploying the matching UI.

begin;

create schema if not exists private;

create or replace function private.are_assessments_valid(
  assessment_values text[]
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    cardinality(assessment_values) <= 10
    and coalesce(
      (
        select bool_and(
          assessment is not null
          and assessment = btrim(assessment)
          and char_length(assessment) between 1 and 40
        )
        from unnest(assessment_values) as assessment
      ),
      true
    );
$$;

alter table public.applications
  drop constraint if exists applications_assessments_check;

alter table public.applications
  add constraint applications_assessments_check
  check (private.are_assessments_valid(assessments))
  not valid;

alter table public.applications
  validate constraint applications_assessments_check;

revoke all on function private.are_assessments_valid(text[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.are_assessments_valid(text[]) to authenticated;

commit;
