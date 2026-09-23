import { redirect } from "next/navigation";

import { JobDashboard } from "@/components/job-dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  const userEmail =
    typeof claims.email === "string" ? claims.email : "승인된 사용자";

  return <JobDashboard userEmail={userEmail} />;
}
