import type { SupabaseClient } from "@supabase/supabase-js";

import type { JobPlatform, JobPlatformDraft } from "@/types/job";

type JobPlatformRow = {
  id: string;
  name: string;
  url: string;
  memo: string;
  created_at: string;
};

function toJobPlatform(row: JobPlatformRow): JobPlatform {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    memo: row.memo,
    createdAt: row.created_at,
  };
}

function platformPayload(draft: JobPlatformDraft) {
  return {
    name: draft.name.trim(),
    url: draft.url.trim(),
    memo: draft.memo.trim(),
  };
}

export async function loadJobPlatforms(supabase: SupabaseClient): Promise<JobPlatform[]> {
  const { data, error } = await supabase
    .from("job_platforms")
    .select("id, name, url, memo, created_at")
    .order("name", { ascending: true });

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as JobPlatformRow[]).map(toJobPlatform);
}

export async function createJobPlatform(supabase: SupabaseClient, draft: JobPlatformDraft): Promise<JobPlatform> {
  const { data, error } = await supabase
    .from("job_platforms")
    .insert(platformPayload(draft))
    .select("id, name, url, memo, created_at")
    .single();

  if (error) throw new Error(error.message);
  return toJobPlatform(data as JobPlatformRow);
}

export async function updateJobPlatform(supabase: SupabaseClient, id: string, draft: JobPlatformDraft): Promise<JobPlatform> {
  const { data, error } = await supabase
    .from("job_platforms")
    .update(platformPayload(draft))
    .eq("id", id)
    .select("id, name, url, memo, created_at")
    .single();

  if (error) throw new Error(error.message);
  return toJobPlatform(data as JobPlatformRow);
}

export async function deleteJobPlatform(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("job_platforms").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
