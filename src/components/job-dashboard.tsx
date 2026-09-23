"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { logout } from "@/app/auth/actions";
import { CloseIcon, ExternalIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { RichTextEditor } from "@/components/rich-text-editor";
import { loadApplications } from "@/lib/supabase/applications";
import { createClient } from "@/lib/supabase/client";
import { ASSESSMENT_TYPES, AssessmentType, Job, JobDraft, PROCESS_STEPS, ProcessStep } from "@/types/job";

const emptyDraft: JobDraft = { company: "", role: "", deadline: "", currentStep: "지원 준비", assessments: [], link: "" };
type Filter = "전체" | "마감 임박" | "지원 준비" | "전형 진행" | "면접";
const filters: Filter[] = ["전체", "마감 임박", "지원 준비", "전형 진행", "면접"];

function dayDiff(deadline: string) { const today = new Date(); today.setHours(0, 0, 0, 0); return Math.ceil((new Date(`${deadline}T00:00:00`).getTime() - today.getTime()) / 86400000); }
function dday(deadline: string) { const diff = dayDiff(deadline); return diff === 0 ? "D-DAY" : diff < 0 ? `D+${Math.abs(diff)}` : `D-${diff}`; }
function formatDate(deadline: string) { return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit" }).format(new Date(`${deadline}T00:00:00`)); }
function initials(company: string) { return company.replace(/[^a-zA-Z가-힣]/g, "").slice(0, 2).toUpperCase(); }
function normalizeJob(job: Job): Job {
  const legacyStep: Record<string, ProcessStep> = { 관심: "지원 준비", "준비 중": "지원 준비", "지원 완료": "서류 심사", "서류 합격": "1차 면접", 면접: "1차 면접", "최종 합격": "최종 합격", 불합격: "불합격" };
  const sampleSteps: Record<string, ProcessStep> = { "sample-1": "지원 준비", "sample-2": "서류 심사", "sample-3": "코딩테스트", "sample-4": "1차 면접" };
  const sampleAssessments: Record<string, AssessmentType[]> = { "sample-1": ["코딩테스트"], "sample-2": ["코딩테스트", "인적성"], "sample-3": ["코딩테스트", "AI 역량검사"], "sample-4": ["코딩테스트"] };
  return { ...job, currentStep: sampleSteps[job.id] ?? job.currentStep ?? legacyStep[job.status] ?? "지원 준비", assessments: sampleAssessments[job.id] ?? job.assessments ?? [] };
}
function progress(step: ProcessStep) { const index = PROCESS_STEPS.indexOf(step); return step === "불합격" ? 100 : Math.round(((index + 1) / (PROCESS_STEPS.length - 1)) * 100); }

export function JobDashboard({ userEmail }: { userEmail: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<Filter>("전체");
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<JobDraft>(emptyDraft);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      setLoaded(false);
      setLoadError("");

      try {
        const rows = await loadApplications(createClient());
        if (!cancelled) setJobs(rows.map(normalizeJob));
      } catch {
        if (!cancelled) setLoadError("지원 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);
  const selected = jobs.find((job) => job.id === selectedId) ?? null;
  const stats = useMemo(() => ({ urgent: jobs.filter((j) => dayDiff(j.deadline) >= 0 && dayDiff(j.deadline) <= 3).length, tests: jobs.filter((j) => ["코딩테스트", "인적성", "AI 역량검사"].includes(j.currentStep)).length, interviews: jobs.filter((j) => j.currentStep.includes("면접")).length, total: jobs.filter((j) => !["최종 합격", "불합격"].includes(j.currentStep)).length }), [jobs]);
  const visible = useMemo(() => [...jobs].filter((job) => {
    if (!`${job.company} ${job.role}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "마감 임박") return dayDiff(job.deadline) >= 0 && dayDiff(job.deadline) <= 3;
    if (filter === "지원 준비") return job.currentStep === "지원 준비";
    if (filter === "전형 진행") return ["서류 심사", "코딩테스트", "인적성", "AI 역량검사"].includes(job.currentStep);
    if (filter === "면접") return job.currentStep.includes("면접");
    return true;
  }).sort((a, b) => a.deadline.localeCompare(b.deadline)), [filter, jobs, query]);

  function updateJob(id: string, changes: Partial<Job>) { setJobs((items) => items.map((job) => job.id === id ? { ...job, ...changes } : job)); }
  function addJob(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const job: Job = { ...draft, id: crypto.randomUUID(), status: "준비 중", memo: "", tasks: [{ id: crypto.randomUUID(), label: "이력서 확인", done: false }, { id: crypto.randomUUID(), label: "지원서 제출", done: false }], createdAt: new Date().toISOString() }; setJobs((items) => [job, ...items]); setDraft(emptyDraft); setIsAddOpen(false); setSelectedId(job.id); }
  function deleteJob(id: string) { if (confirm("이 지원 정보를 삭제할까요?")) { setJobs((items) => items.filter((job) => job.id !== id)); setSelectedId(null); } }
  function addTask(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected || !newTask.trim()) return; updateJob(selected.id, { tasks: [...selected.tasks, { id: crypto.randomUUID(), label: newTask.trim(), done: false }] }); setNewTask(""); }
  if (!loaded) return <DashboardLoading />;

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f7f9] px-5">
        <div className="w-full max-w-md border border-slate-200 bg-white p-7 text-center">
          <p className="text-sm font-bold text-slate-900">{loadError}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">네트워크 연결과 Supabase 정책을 확인한 뒤 다시 시도해 주세요.</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="solid-button mt-5">다시 시도</button>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 sm:px-8"><div className="flex items-center gap-2.5"><div className="flex size-8 items-center justify-center rounded-[10px] bg-cyan-500 text-sm font-black text-white shadow-sm">A</div><span className="text-[15px] font-bold tracking-[-0.025em]">지원관리</span></div><div className="flex items-center gap-2"><div className="mr-1 hidden text-right lg:block"><p className="text-[9px] font-bold uppercase tracking-[.08em] text-slate-400">Signed in</p><p className="max-w-48 truncate text-xs font-semibold text-slate-600">{userEmail}</p></div><form action={logout}><button type="submit" className="outline-button h-10 px-3">로그아웃</button></form><button onClick={() => setIsAddOpen(true)} className="solid-button"><PlusIcon className="size-4" /><span className="hidden sm:inline">지원 추가</span></button></div></div></header>

    <main className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:py-10">
      <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold tracking-[-0.035em]">지원 현황</h1><p className="mt-1.5 text-sm text-slate-500">마감 일정과 채용 전형을 한곳에서 관리하세요.</p></div><p className="text-xs text-slate-400">Supabase에서 사용자별로 불러옴</p></div>

      <section className="mb-5 flex flex-wrap items-center gap-x-7 gap-y-3 rounded-xl border border-slate-200 bg-white px-5 py-4">{[["진행 중",stats.total],["3일 내 마감",stats.urgent],["검사 진행",stats.tests],["면접 단계",stats.interviews]].map(([label,value], index) => <div key={String(label)} className="flex items-baseline gap-2"><p className="text-xs font-medium text-slate-500">{label}</p><p className={`text-lg font-bold ${index === 1 && Number(value) > 0 ? "text-rose-500" : "text-slate-900"}`}>{value}</p></div>)}</section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 md:flex-row md:items-center md:justify-between"><div className="flex gap-1 overflow-x-auto">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${filter === item ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{item}</button>)}</div><label className="relative md:w-72"><span className="sr-only">검색</span><SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} className="plain-field h-10 pl-9" placeholder="기업명 또는 직무 검색" /></label></div>
        <div className="hidden grid-cols-[minmax(190px,1.25fr)_140px_minmax(230px,1.4fr)_100px_110px_28px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-bold tracking-[.05em] text-slate-400 md:grid"><span>기업 / 직무</span><span>현재 단계</span><span>전형 방식</span><span>마감</span><span>준비율</span><span /></div>
        {visible.length ? <div className="divide-y divide-slate-100">{visible.map((job) => <JobRow key={job.id} job={job} onSelect={() => setSelectedId(job.id)} onStepChange={(step) => updateJob(job.id, { currentStep: step })} />)}</div> : <div className="px-6 py-20 text-center"><p className="font-bold">{jobs.length ? "해당하는 지원이 없습니다." : "아직 등록한 지원이 없습니다."}</p><p className="mt-2 text-sm text-slate-400">{jobs.length ? "검색어나 필터를 바꿔보세요." : "지원 추가 버튼으로 첫 기업을 등록해 보세요."}</p></div>}
      </section>
    </main>
    {isAddOpen && <AddModal draft={draft} setDraft={setDraft} onClose={() => setIsAddOpen(false)} onSubmit={addJob} />}
    {selected && <Detail job={selected} onClose={() => setSelectedId(null)} onUpdate={(changes) => updateJob(selected.id, changes)} onDelete={() => deleteJob(selected.id)} newTask={newTask} setNewTask={setNewTask} onAddTask={addTask} />}
  </div>;
}

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
      <div className="h-16 border-b border-slate-200 bg-white" />
      <main className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:py-10">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-slate-200" />
        <div className="mt-8 h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="mt-5 h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </main>
    </div>
  );
}

function JobRow({ job, onSelect, onStepChange }: { job: Job; onSelect: () => void; onStepChange: (step: ProcessStep) => void }) {
  const complete = job.tasks.length ? Math.round(job.tasks.filter((t) => t.done).length / job.tasks.length * 100) : 0; const urgent = dayDiff(job.deadline) <= 3;
  return <div className="group cursor-pointer p-4 hover:bg-white md:grid md:grid-cols-[minmax(190px,1.25fr)_140px_minmax(230px,1.4fr)_100px_110px_28px] md:items-center md:gap-4 md:px-5" onClick={onSelect} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect()}>
    <div className="flex min-w-0 items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold text-slate-600">{initials(job.company)}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{job.company}</p><p className="mt-0.5 truncate text-xs text-slate-400">{job.role}</p></div></div>
    <div className="mt-4 flex items-center justify-between md:mt-0"><span className="mobile-label">현재 단계</span><select value={job.currentStep} onClick={(e) => e.stopPropagation()} onChange={(e) => onStepChange(e.target.value as ProcessStep)} className="step-select">{PROCESS_STEPS.map((step) => <option key={step}>{step}</option>)}</select></div>
    <div className="mt-4 flex items-start justify-between gap-3 md:mt-0"><span className="mobile-label pt-1">전형</span><div className="flex flex-wrap justify-end gap-1 md:justify-start">{job.assessments.length ? job.assessments.map((type) => <span key={type} className="process-tag">{type === "AI 역량검사" ? "AI 역검" : type}</span>) : <span className="text-[10px] text-slate-300">별도 전형 없음</span>}</div></div>
    <div className="mt-4 flex items-center justify-between md:mt-0 md:block"><span className="mobile-label">마감</span><div><p className={`text-sm font-bold ${urgent ? "text-rose-500" : "text-slate-700"}`}>{dday(job.deadline)}</p><p className="text-[10px] text-slate-400">{formatDate(job.deadline)}</p></div></div>
    <div className="mt-4 flex items-center gap-3 md:mt-0"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${complete}%` }} /></div><span className="w-8 text-[10px] font-semibold text-slate-400">{complete}%</span></div><span className="hidden text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-cyan-500 md:block">›</span>
  </div>;
}

function AssessmentPicker({ value, onChange }: { value: AssessmentType[]; onChange: (value: AssessmentType[]) => void }) {
  return <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{ASSESSMENT_TYPES.map((type) => { const active = value.includes(type); return <label key={type} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold transition ${active ? "border-cyan-500 bg-cyan-50 text-cyan-800 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}><input type="checkbox" className="sr-only" checked={active} onChange={() => onChange(active ? value.filter((item) => item !== type) : [...value, type])}/><span className={`flex size-4 items-center justify-center rounded-md border text-[10px] ${active ? "border-cyan-500 bg-cyan-500 text-white" : "border-slate-300"}`}>{active ? "✓" : ""}</span>{type}</label>; })}</div>;
}

function AddModal({ draft, setDraft, onClose, onSubmit }: { draft: JobDraft; setDraft: React.Dispatch<React.SetStateAction<JobDraft>>; onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,.16)] sm:max-w-2xl sm:rounded-[24px] sm:p-8"><div className="mb-7 flex justify-between"><div><h2 className="text-2xl font-bold tracking-[-.04em]">지원 정보 등록</h2><p className="mt-1 text-sm text-slate-400">기업과 전형 정보를 입력하세요.</p></div><button onClick={onClose} className="square-button" aria-label="닫기"><CloseIcon className="size-5"/></button></div><form onSubmit={onSubmit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="기업명"><input required autoFocus value={draft.company} onChange={(e) => setDraft({...draft, company:e.target.value})} className="plain-field" placeholder="예: 네이버"/></Field><Field label="직무명"><input required value={draft.role} onChange={(e) => setDraft({...draft, role:e.target.value})} className="plain-field" placeholder="예: Backend Engineer"/></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="마감일"><input required type="date" value={draft.deadline} onChange={(e) => setDraft({...draft, deadline:e.target.value})} className="plain-field"/></Field><Field label="현재 단계"><select value={draft.currentStep} onChange={(e) => setDraft({...draft, currentStep:e.target.value as ProcessStep})} className="plain-field">{PROCESS_STEPS.map((step)=><option key={step}>{step}</option>)}</select></Field></div><Field label="포함된 전형 (복수 선택 가능)"><AssessmentPicker value={draft.assessments} onChange={(assessments)=>setDraft({...draft, assessments})}/></Field><Field label="공고 링크" optional><input type="url" value={draft.link} onChange={(e)=>setDraft({...draft,link:e.target.value})} className="plain-field" placeholder="https://"/></Field><div className="flex justify-end gap-2 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="outline-button">취소</button><button className="solid-button">등록하기</button></div></form></div></div>;
}

function Detail({ job, onClose, onUpdate, onDelete, newTask, setNewTask, onAddTask }: { job: Job; onClose:()=>void; onUpdate:(c:Partial<Job>)=>void; onDelete:()=>void; newTask:string; setNewTask:(v:string)=>void; onAddTask:(e:FormEvent<HTMLFormElement>)=>void }) {
  return <div className="fixed inset-0 z-40 bg-black/15" onMouseDown={(e)=>e.target===e.currentTarget&&onClose()}><aside className="absolute inset-y-2 right-2 w-[calc(100%-16px)] overflow-y-auto rounded-[24px] bg-white shadow-[0_20px_70px_rgba(15,23,42,.18)] sm:inset-y-3 sm:right-3 sm:max-w-[520px]"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-7"><p className="text-sm font-bold">지원 상세</p><button onClick={onClose} className="square-button" aria-label="닫기"><CloseIcon className="size-5"/></button></div><div className="p-5 sm:p-7">
    <div className="mb-7 flex gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-50 text-xs font-bold text-cyan-700">{initials(job.company)}</div><div><h2 className="text-2xl font-bold tracking-[-.04em]">{job.company}</h2><p className="mt-1 text-sm text-slate-400">{job.role}</p></div></div>
    <div className="mb-7 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="mini-label">마감일</p><p className={`mt-1 text-xl font-bold ${dayDiff(job.deadline)<=3?"text-rose-500":""}`}>{dday(job.deadline)}</p><p className="text-xs text-slate-400">{formatDate(job.deadline)}</p></div><div className="rounded-2xl bg-cyan-50 p-4"><p className="mini-label">전체 과정</p><p className="mt-1 text-xl font-bold text-cyan-700">{progress(job.currentStep)}%</p><p className="text-xs text-cyan-600/60">현재 단계 기준</p></div></div>
    <Field label="현재 단계"><select value={job.currentStep} onChange={(e)=>onUpdate({currentStep:e.target.value as ProcessStep})} className="plain-field mb-6">{PROCESS_STEPS.map((step)=><option key={step}>{step}</option>)}</select></Field>
    <Field label="포함된 전형"><AssessmentPicker value={job.assessments} onChange={(assessments)=>onUpdate({assessments})}/></Field>
    {job.link&&<a href={job.link} target="_blank" rel="noreferrer" className="my-7 flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-100"><span>채용공고 열기</span><ExternalIcon className="size-4"/></a>}
    <section className="my-7"><div className="mb-3 flex justify-between"><h3 className="text-sm font-bold">준비 체크리스트</h3><span className="text-xs font-semibold text-slate-400">{job.tasks.filter((t)=>t.done).length}/{job.tasks.length}</span></div><div className="space-y-2">{job.tasks.map((task)=><label key={task.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 hover:bg-slate-50"><input type="checkbox" checked={task.done} onChange={()=>onUpdate({tasks:job.tasks.map((t)=>t.id===task.id?{...t,done:!t.done}:t)})} className="size-4 accent-cyan-500"/><span className={`flex-1 text-sm ${task.done?"text-slate-300 line-through":""}`}>{task.label}</span><button type="button" onClick={(e)=>{e.preventDefault();onUpdate({tasks:job.tasks.filter((t)=>t.id!==task.id)})}}><CloseIcon className="size-4 text-slate-300"/></button></label>)}</div><form onSubmit={onAddTask} className="mt-2 flex gap-2"><input value={newTask} onChange={(e)=>setNewTask(e.target.value)} className="plain-field" placeholder="할 일 추가"/><button className="outline-button px-3"><PlusIcon className="size-4"/></button></form></section>
    <section className="mb-8"><p className="mb-2 text-xs font-bold">메모</p><RichTextEditor key={job.id} value={job.memo} onChange={(memo)=>onUpdate({memo})}/></section><button onClick={onDelete} className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-rose-500"><TrashIcon className="size-4"/>지원 정보 삭제</button>
  </div></aside></div>;
}

function Field({label,optional,children}:{label:string;optional?:boolean;children:React.ReactNode}) { return <label className="block"><span className="mb-2 flex gap-2 text-xs font-semibold text-slate-600">{label}{optional&&<em className="font-normal not-italic text-slate-400">선택</em>}</span>{children}</label>; }
