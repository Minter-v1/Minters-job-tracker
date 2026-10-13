-- Add an optional employment type to existing applications.
-- Existing rows remain unclassified until the user selects a value.

alter table public.applications
  add column if not exists employment_type text;

alter table public.applications
  drop constraint if exists applications_employment_type_check;

alter table public.applications
  add constraint applications_employment_type_check
  check (employment_type in ('정규직', '계약직', '인턴'))
  not valid;

alter table public.applications
  validate constraint applications_employment_type_check;
