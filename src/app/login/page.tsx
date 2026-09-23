export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 text-zinc-950">
      <section className="w-full max-w-md border border-zinc-200 bg-white p-8 shadow-[0_20px_60px_rgba(8,145,178,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
          Minter&apos;s Apply
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          로그인이 필요합니다
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          승인된 사용자만 채용 지원 대시보드에 접근할 수 있습니다.
        </p>
        <div className="mt-8 border-l-2 border-cyan-500 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
          로그인 입력 화면은 다음 페이즈에서 연결됩니다.
        </div>
      </section>
    </main>
  );
}
