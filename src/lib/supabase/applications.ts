import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AssessmentType,
  Job,
  JobStatus,
  ProcessStep,
} from "@/types/job";

type ApplicationTaskRow = {
  id: string;
  label: string;
  done: boolean;
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
};

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
        )
      `,
    )
    .order("deadline", { ascending: true })
    .order("position", {
      referencedTable: "application_tasks",
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ApplicationRow[]).map((row) => ({
    id: row.id,
    company: row.company,
    role: row.role,
    deadline: row.deadline,
    status: row.status,
    currentStep: row.current_step,
    assessments: row.assessments ?? [],
    link: row.link,
    memo: row.memo,
    tasks: (row.application_tasks ?? []).map((task) => ({
      id: task.id,
      label: task.label,
      done: task.done,
    })),
    createdAt: row.created_at,
  }));
}
