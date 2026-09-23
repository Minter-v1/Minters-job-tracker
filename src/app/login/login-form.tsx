"use client";

import { useActionState } from "react";

import { login, type LoginState } from "./actions";

const initialLoginState: LoginState = {
  message: "",
};

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    login,
    initialLoginState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={nextPath} />

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-xs font-semibold tracking-wide text-zinc-700"
        >
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="name@example.com"
          className="h-12 w-full rounded-[9px] border border-zinc-300 bg-white px-4 text-sm text-zinc-950 outline-none transition-[border-color,background-color,box-shadow] placeholder:text-zinc-400 hover:border-zinc-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100/80"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-xs font-semibold tracking-wide text-zinc-700"
          >
            비밀번호
          </label>
          <span className="text-[11px] text-zinc-400">관리자 승인 계정 전용</span>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="비밀번호 입력"
          className="h-12 w-full rounded-[9px] border border-zinc-300 bg-white px-4 text-sm text-zinc-950 outline-none transition-[border-color,background-color,box-shadow] placeholder:text-zinc-400 hover:border-zinc-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100/80"
        />
      </div>

      <div aria-live="polite" aria-atomic="true" className="min-h-5">
        {state.message ? (
          <p className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
            {state.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center rounded-[9px] bg-cyan-600 px-4 text-sm font-bold text-white shadow-sm shadow-cyan-900/10 transition-[background-color,box-shadow] hover:bg-cyan-700 hover:shadow-md hover:shadow-cyan-900/15 active:bg-cyan-800 disabled:cursor-wait disabled:bg-cyan-300 disabled:shadow-none"
      >
        {pending ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}
