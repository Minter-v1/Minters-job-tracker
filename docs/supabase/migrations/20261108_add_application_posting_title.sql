-- Store the source posting title separately from the company and role.
-- Existing applications remain null because their mixed company values cannot be inferred safely.

alter table public.applications
  add column if not exists posting_title text;

alter table public.applications
  drop constraint if exists applications_posting_title_check;

alter table public.applications
  add constraint applications_posting_title_check
  check (
    posting_title is null
    or (posting_title = btrim(posting_title) and char_length(posting_title) between 1 and 160)
  ) not valid;

alter table public.applications
  validate constraint applications_posting_title_check;

comment on column public.applications.posting_title is
  'Original recruitment posting title. Null for legacy applications until the user supplies it.';
