"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  message: string;
};

function getSafeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  return value;
}

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";

  if (!email || !password) {
    return { message: "이메일과 비밀번호를 모두 입력해 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const nextPath = getSafeNextPath(formData.get("next"));

  revalidatePath("/", "layout");
  redirect(nextPath);
}
