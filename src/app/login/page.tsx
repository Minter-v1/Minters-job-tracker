import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

function getNextPath(value: string | string[] | undefined) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getNextPath(params.next);

  return (
    <main className="min-h-screen bg-white text-zinc-950 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)]">
      <section className="relative hidden overflow-hidden border-r border-zinc-200 bg-zinc-950 px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:48px_48px]"
        />

        <div className="relative flex items-center gap-3">
          <span className="block size-3 rounded-[3px] bg-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-[0.24em]">
            Minter&apos;s Apply
          </span>
        </div>

        <div className="relative max-w-xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Recruitment workspace
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">
            지원 일정과 전형 단계를
            <br />한곳에서 관리하세요.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-zinc-400">
            마감일, 코딩테스트, 인적성, AI 역량검사와 현재 진행 단계를
            놓치지 않도록 정리합니다.
          </p>
        </div>

        <p className="relative text-xs text-zinc-500">
          Private workspace · Approved access only
        </p>
      </section>

      <section className="flex min-h-screen items-center bg-white px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-12 flex items-center gap-3 lg:hidden">
            <span className="block size-3 rounded-[3px] bg-cyan-500" />
            <span className="text-xs font-bold uppercase tracking-[0.24em]">
              Minter&apos;s Apply
            </span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
            Sign in
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.035em]">
            다시 시작하기
          </h2>
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            관리자가 승인한 이메일 계정으로 로그인해 주세요.
          </p>

          <LoginForm nextPath={nextPath} />

          <div className="mt-8 border-t border-zinc-200 pt-6">
            <p className="text-xs leading-5 text-zinc-500">
              계정이 아직 없다면 서비스 관리자에게 접근 승인을 요청하세요.
              공개 회원가입은 제공하지 않습니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
