import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AssessmentType,
  Job,
  JobDraft,
  JobStage,
  JobStatus,
  JobTask,
  ProcessStep,
} from "@/types/job";

type ApplicationTaskRow = {
  id: string;
  label: string;
  done: boolean;
  position: number;
};

type ApplicationStageRow = {
  id: string;
  title: string;
  scheduled_date: string | null;
  completed: boolean;
  position: number;
};

type ApplicationRow = {
  id: string;
  company: string;
  role: string;
  deadline: string;
  status: JobStatus;
  current_step: ProcessStep;
  assessments: AssessmentType[];
  link: string;
  memo: string;
  created_at: string;
  application_tasks: ApplicationTaskRow[] | null;
  application_stages: ApplicationStageRow[] | null;
};

type ApplicationChanges = Partial<
  Pick<
    Job,
    | "company"
    | "role"
    | "deadline"
    | "status"
    | "currentStep"
    | "assessments"
    | "link"
    | "memo"
  >
>;

const applicationColumns = `
  id,
  company,
  role,
  deadline,
  status,
  current_step,
  assessments,
  link,
  memo,
  created_at
`;

function toJob(row: ApplicationRow): Job {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    deadline: row.deadline,
    status: row.status,
    currentStep: row.current_step,
    assessments: row.assessments ?? [],
    link: row.link,
    memo: row.memo,
    tasks: (row.application_tasks ?? []).map(toJobTask),
    stages: (row.application_stages ?? []).map(toJobStage),
    createdAt: row.created_at,
  };
}

function toJobStage(row: ApplicationStageRow): JobStage {
  return {
    id: row.id,
    title: row.title,
    scheduledDate: row.scheduled_date,
    completed: row.completed,
    position: row.position,
  };
}

function toJobTask(row: ApplicationTaskRow): JobTask {
  return {
    id: row.id,
    label: row.label,
    done: row.done,
  };
}

export async function loadApplications(supabase: SupabaseClient): Promise<Job[]> {
  const { data, error } = await supabase
    .from("applications")
    .select(
      `
        id,
        company,
        role,
        deadline,
        status,
        current_step,
        assessments,
        link,
        memo,
        created_at,
        application_tasks (
          id,
          label,
          done,
          position
        ),
        application_stages (
          id,
          title,
          scheduled_date,
          completed,
          position
        )
      `,
    )
    .order("deadline", { ascending: true })
    .order("position", {
      referencedTable: "application_tasks",
      ascending: true,
    })
    .order("position", {
      referencedTable: "application_stages",
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ApplicationRow[]).map(toJob);
}

export async function createApplication(
  supabase: SupabaseClient,
  draft: JobDraft,
): Promise<Job> {
  const { data, error } = await supabase
    .from("applications")
    .insert({
      company: draft.company,
      role: draft.role,
      deadline: draft.deadline,
      status: "준비 중",
      current_step: draft.currentStep,
      assessments: draft.assessments,
      link: draft.link,
      memo: "",
    })
    .select(applicationColumns)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toJob({
    ...(data as Omit<ApplicationRow, "application_tasks">),
    application_tasks: [],
    application_stages: [],
  });
}

export async function updateApplication(
  supabase: SupabaseClient,
  id: string,
  changes: ApplicationChanges,
): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (changes.company !== undefined) payload.company = changes.company;
  if (changes.role !== undefined) payload.role = changes.role;
  if (changes.deadline !== undefined) payload.deadline = changes.deadline;
  if (changes.status !== undefined) payload.status = changes.status;
  if (changes.currentStep !== undefined) payload.current_step = changes.currentStep;
  if (changes.assessments !== undefined) payload.assessments = changes.assessments;
  if (changes.link !== undefined) payload.link = changes.link;
  if (changes.memo !== undefined) payload.memo = changes.memo;

  if (!Object.keys(payload).length) return;

  const { error } = await supabase
    .from("applications")
    .update(payload)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteApplication(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("applications").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createApplicationTask(
  supabase: SupabaseClient,
  applicationId: string,
  label: string,
): Promise<JobTask> {
  const { data: lastTasks, error: positionError } = await supabase
    .from("application_tasks")
    .select("position")
    .eq("application_id", applicationId)
    .order("position", { ascending: false })
    .limit(1);

  if (positionError) {
    throw new Error(positionError.message);
  }

  const position = (lastTasks?.[0]?.position ?? -1) + 1;
  const { data, error } = await supabase
    .from("application_tasks")
    .insert({
      application_id: applicationId,
      label: label.trim(),
      position,
    })
    .select("id, label, done, position")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toJobTask(data as ApplicationTaskRow);
}

export async function updateApplicationTask(
  supabase: SupabaseClient,
  taskId: string,
  done: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("application_tasks")
    .update({ done })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteApplicationTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<void> {
  const { error } = await supabase
    .from("application_tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createApplicationStage(
  supabase: SupabaseClient,
  applicationId: string,
  title: string,
): Promise<JobStage> {
  const { data: lastStages, error: positionError } = await supabase
    .from("application_stages")
    .select("position")
    .eq("application_id", applicationId)
    .order("position", { ascending: false })
    .limit(1);

  if (positionError) throw new Error(positionError.message);

  const { data, error } = await supabase
    .from("application_stages")
    .insert({
      application_id: applicationId,
      title: title.trim(),
      position: (lastStages?.[0]?.position ?? -1) + 1,
    })
    .select("id, title, scheduled_date, completed, position")
    .single();

  if (error) throw new Error(error.message);
  return toJobStage(data as ApplicationStageRow);
}

export async function updateApplicationStage(
  supabase: SupabaseClient,
  stageId: string,
  changes: Partial<Pick<JobStage, "title" | "scheduledDate" | "completed" | "position">>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (changes.title !== undefined) payload.title = changes.title.trim();
  if (changes.scheduledDate !== undefined) payload.scheduled_date = changes.scheduledDate || null;
  if (changes.completed !== undefined) payload.completed = changes.completed;
  if (changes.position !== undefined) payload.position = changes.position;

  const { error } = await supabase.from("application_stages").update(payload).eq("id", stageId);
  if (error) throw new Error(error.message);
}

export async function deleteApplicationStage(
  supabase: SupabaseClient,
  stageId: string,
): Promise<void> {
  const { error } = await supabase.from("application_stages").delete().eq("id", stageId);
  if (error) throw new Error(error.message);
}
