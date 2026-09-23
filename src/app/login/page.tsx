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
    <main className="min-h-screen bg-[#f5f7f8] px-5 text-zinc-950 sm:px-8">
      <div className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col">
        <header className="flex h-20 items-center justify-between sm:h-24">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-[9px] bg-cyan-500 text-sm font-black text-white shadow-sm shadow-cyan-900/10">
              A
            </span>
            <span className="text-sm font-bold tracking-[-0.02em]">지원관리</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Private workspace
          </span>
        </header>

        <section className="flex flex-1 items-center py-10 sm:py-14">
          <div className="w-full border border-zinc-200 bg-white px-6 py-8 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:px-9 sm:py-10">
            <div className="mb-8">
              <span className="mb-5 block h-1 w-9 bg-cyan-500" />
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-cyan-700">
                Sign in
              </p>
              <h1 className="mt-2.5 text-[30px] font-bold tracking-[-0.04em] text-zinc-950 sm:text-[34px]">
                다시 시작하기
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                등록된 이메일과 비밀번호를 입력해 주세요.
              </p>
            </div>

            <LoginForm nextPath={nextPath} />

            <div className="mt-7 flex gap-2.5 border-t border-zinc-100 pt-5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cyan-500" />
              <p className="text-xs leading-5 text-zinc-500">
                관리자 승인을 받은 계정만 이용할 수 있습니다. 계정이 없다면
                서비스 관리자에게 접근을 요청하세요.
              </p>
            </div>
          </div>
        </section>

        <footer className="pb-7 text-center text-[10px] font-medium tracking-[0.06em] text-zinc-400 sm:pb-9">
          MINTER&apos;S APPLY
        </footer>
      </div>
    </main>
  );
}
