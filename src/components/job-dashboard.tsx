"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { logout } from "@/app/auth/actions";
import { CalendarIcon, CheckIcon, ClockIcon, CloseIcon, ExternalIcon, PlusIcon, SearchIcon, SortIcon, TrashIcon } from "@/components/icons";
import { RichTextEditor } from "@/components/rich-text-editor";
import { createApplication, createApplicationStage, createApplicationTask, deleteApplication, deleteApplicationStage, deleteApplicationTask, loadApplications, updateApplication, updateApplicationStage, updateApplicationTask } from "@/lib/supabase/applications";
import { createClient } from "@/lib/supabase/client";
import { ASSESSMENT_TYPES, Job, JobDraft, JobStage, PROCESS_STEPS, ProcessStep } from "@/types/job";

const emptyDraft: JobDraft = { company: "", role: "", startDate: null, deadline: "", currentStep: "지원 준비", assessments: [], link: "" };
type Filter = "전체" | "마감 임박" | "지원 준비" | "전형 진행" | "면접";
type ViewMode = "목록" | "캘린더";
type DateSort = "nearest" | "latest";
const filters: Filter[] = ["전체", "마감 임박", "지원 준비", "전형 진행", "면접"];

function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dayDiff(date: string) { const today = new Date(); today.setHours(0, 0, 0, 0); return Math.ceil((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86400000); }
function dday(date: string) { const diff = dayDiff(date); return diff === 0 ? "D-DAY" : diff < 0 ? `D+${Math.abs(diff)}` : `D-${diff}`; }
function formatDate(date: string) { return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit" }).format(new Date(`${date}T00:00:00`)); }
function formatPeriod(startDate: string | null, endDate: string) { return startDate ? `${formatDate(startDate)} – ${formatDate(endDate)}` : `마감 ${formatDate(endDate)}`; }
function initials(company: string) { return company.replace(/[^a-zA-Z가-힣]/g, "").slice(0, 2).toUpperCase(); }
function progress(job: Job) { if (job.stages.length) return Math.round(job.stages.filter((stage) => stage.completed).length / job.stages.length * 100); const index = PROCESS_STEPS.indexOf(job.currentStep as (typeof PROCESS_STEPS)[number]); return index < 0 ? 0 : Math.round(((index + 1) / PROCESS_STEPS.length) * 100); }
function nextStage(job: Job) {
  const currentPosition = job.stages.find((stage) => stage.title === job.currentStep)?.position ?? -1;
  return job.stages
    .filter((stage) => !stage.completed && stage.position >= currentPosition && stage.scheduledDate && dayDiff(stage.scheduledDate) >= 0)
    .sort((a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? ""))[0] ?? null;
}
function emptyScheduleLabel(job: Job) {
  const current = job.stages.find((stage) => stage.title === job.currentStep);
  return current?.scheduledDate && dayDiff(current.scheduledDate) < 0 && !current.completed ? "결과 대기" : "일정 미등록";
}
function datesInRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cursor <= end && dates.length < 370) { dates.push(localDate(cursor)); cursor.setDate(cursor.getDate() + 1); }
  return dates;
}
function currentStepOptions(job: Job) { return Array.from(new Set([...job.stages.map((stage) => stage.title), ...PROCESS_STEPS])); }
function relevantScheduleDate(job: Job) { return job.currentStep === "지원 준비" ? job.deadline : nextStage(job)?.scheduledDate ?? null; }
function companyColorKey(company: string) { return company.trim().toLocaleLowerCase("ko-KR"); }
function companyColorMap(jobs: Job[]) {
  const companies = Array.from(new Set(jobs.map((job) => companyColorKey(job.company)))).sort((a, b) => a.localeCompare(b, "ko"));
  return new Map(companies.map((company, index) => [company, (192 + index * (360 / companies.length)) % 360]));
}
function calendarColor(hue: number, completed: boolean) {
  return {
    backgroundColor: `hsl(${hue} 72% ${completed ? 93 : 88}%)`,
    color: `hsl(${hue} 62% ${completed ? 39 : 27}%)`,
    opacity: completed ? 0.72 : 1,
  };
}
function applicationState(job: Job) {
  if (job.currentStep === "불합격") return { label: "불합격", className: "border-rose-200 bg-rose-50 text-rose-600" };
  if (job.currentStep === "최종 합격") return { label: "최종 합격", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  return { label: "진행 중", className: "border-cyan-200 bg-cyan-50 text-cyan-700" };
}

export function JobDashboard({ userEmail }: { userEmail: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [pendingWrites, setPendingWrites] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<Filter>("전체");
  const [dateSort, setDateSort] = useState<DateSort>("nearest");
  const [viewMode, setViewMode] = useState<ViewMode>("목록");
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<JobDraft>(emptyDraft);
  const [newTask, setNewTask] = useState("");
  const [newStage, setNewStage] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const memoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function loadJobs() {
      setLoaded(false); setLoadError("");
      try { const rows = await loadApplications(createClient()); if (!cancelled) setJobs(rows); }
      catch { if (!cancelled) setLoadError("지원 정보를 불러오지 못했습니다. 최신 DB 마이그레이션 적용 여부를 확인해 주세요."); }
      finally { if (!cancelled) setLoaded(true); }
    }
    void loadJobs();
    return () => { cancelled = true; };
  }, [reloadKey]);
  useEffect(() => { const timers = memoTimers.current; return () => timers.forEach((timer) => clearTimeout(timer)); }, []);

  const selected = jobs.find((job) => job.id === selectedId) ?? null;
  const stats = useMemo(() => ({
    total: jobs.filter((job) => !["최종 합격", "불합격"].includes(job.currentStep)).length,
    urgent: jobs.filter((job) => job.currentStep === "지원 준비" && dayDiff(job.deadline) >= 0 && dayDiff(job.deadline) <= 3).length,
    tests: jobs.filter((job) => ["코딩테스트", "인적성", "AI 역량검사"].includes(job.currentStep)).length,
    interviews: jobs.filter((job) => job.currentStep.includes("면접")).length,
  }), [jobs]);
  const visible = useMemo(() => [...jobs].filter((job) => {
    if (!`${job.company} ${job.role}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "마감 임박") return job.currentStep === "지원 준비" && dayDiff(job.deadline) >= 0 && dayDiff(job.deadline) <= 3;
    if (filter === "지원 준비") return job.currentStep === "지원 준비";
    if (filter === "전형 진행") return !["지원 준비", "최종 합격", "불합격"].includes(job.currentStep);
    if (filter === "면접") return job.currentStep.includes("면접");
    return true;
  }).sort((a, b) => {
    const aDate = relevantScheduleDate(a); const bDate = relevantScheduleDate(b);
    if (!aDate && !bDate) return a.company.localeCompare(b.company, "ko");
    if (!aDate) return 1;
    if (!bDate) return -1;
    if (dateSort === "latest") return bDate.localeCompare(aDate);
    const aPast = dayDiff(aDate) < 0; const bPast = dayDiff(bDate) < 0;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return aPast ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
  }), [dateSort, filter, jobs, query]);

  async function runWrite<T>(work: () => Promise<T>): Promise<T | null> { setPendingWrites((count) => count + 1); setSaveError(""); try { return await work(); } catch { setSaveError("변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."); return null; } finally { setPendingWrites((count) => Math.max(0, count - 1)); } }
  function persistApplication(id: string, changes: Partial<Job>) { const applicationChanges = { ...changes }; delete applicationChanges.tasks; delete applicationChanges.stages; if (Object.keys(applicationChanges).length) void runWrite(() => updateApplication(createClient(), id, applicationChanges)); }
  function updateJob(id: string, changes: Partial<Job>) { setJobs((items) => items.map((job) => job.id === id ? { ...job, ...changes } : job)); if (changes.memo !== undefined) { const old = memoTimers.current.get(id); if (old) clearTimeout(old); const timer = setTimeout(() => { memoTimers.current.delete(id); persistApplication(id, { memo: changes.memo }); }, 700); memoTimers.current.set(id, timer); return; } persistApplication(id, changes); }

  async function addJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const job = await runWrite(() => createApplication(createClient(), draft)); if (!job) return;
    const titles = Array.from(new Set(["지원 준비", "서류 심사", ...draft.assessments, "1차 면접", "최종 결과"])); const stages: JobStage[] = [];
    for (const title of titles) { const stage = await runWrite(() => createApplicationStage(createClient(), job.id, title)); if (stage) stages.push(stage); }
    const created = { ...job, stages }; setJobs((items) => [created, ...items]); setDraft(emptyDraft); setIsAddOpen(false); setSelectedId(created.id);
  }
  async function deleteJob(id: string) { if (!confirm("이 지원 정보와 전형 일정을 모두 삭제할까요?")) return; const ok = await runWrite(async () => { await deleteApplication(createClient(), id); return true; }); if (ok) { setJobs((items) => items.filter((job) => job.id !== id)); setSelectedId(null); } }
  async function addTask(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected || !newTask.trim()) return; const task = await runWrite(() => createApplicationTask(createClient(), selected.id, newTask)); if (task) { updateJob(selected.id, { tasks: [...selected.tasks, task] }); setNewTask(""); } }
  async function toggleTask(id: string, done: boolean) { if (!selected) return; const ok = await runWrite(async () => { await updateApplicationTask(createClient(), id, done); return true; }); if (ok) updateJob(selected.id, { tasks: selected.tasks.map((task) => task.id === id ? { ...task, done } : task) }); }
  async function removeTask(id: string) { if (!selected) return; const ok = await runWrite(async () => { await deleteApplicationTask(createClient(), id); return true; }); if (ok) updateJob(selected.id, { tasks: selected.tasks.filter((task) => task.id !== id) }); }
  async function addStage(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected || !newStage.trim()) return; const stage = await runWrite(() => createApplicationStage(createClient(), selected.id, newStage)); if (stage) { updateJob(selected.id, { stages: [...selected.stages, stage] }); setNewStage(""); } }
  async function patchStage(id: string, changes: Partial<JobStage>) {
    if (!selected) return;
    const changedStage = selected.stages.find((stage) => stage.id === id);
    const ok = await runWrite(async () => { await updateApplicationStage(createClient(), id, changes); return true; });
    if (!ok || !changedStage) return;

    const stages = selected.stages.map((stage) => stage.id === id ? { ...stage, ...changes } : stage);
    const applicationChanges: Partial<Job> = { stages };

    if (changes.completed === true && changedStage.title === selected.currentStep) {
      const next = stages
        .filter((stage) => stage.position > changedStage.position && !stage.completed)
        .sort((a, b) => a.position - b.position)[0];
      if (next) applicationChanges.currentStep = next.title;
    }

    if (changes.completed === false) {
      const currentPosition = stages.find((stage) => stage.title === selected.currentStep)?.position ?? Number.MAX_SAFE_INTEGER;
      if (changedStage.position <= currentPosition) applicationChanges.currentStep = changedStage.title;
    }

    updateJob(selected.id, applicationChanges);
  }
  async function removeStage(id: string) { if (!selected) return; const removed = selected.stages.find((stage) => stage.id === id); const ok = await runWrite(async () => { await deleteApplicationStage(createClient(), id); return true; }); if (!ok) return; const stages = selected.stages.filter((stage) => stage.id !== id); const changes: Partial<Job> = { stages }; if (removed?.title === selected.currentStep) changes.currentStep = stages.find((stage) => !stage.completed)?.title ?? stages.at(-1)?.title ?? "지원 준비"; updateJob(selected.id, changes); }
  async function moveStage(index: number, direction: -1 | 1) { if (!selected || index + direction < 0 || index + direction >= selected.stages.length) return; const stages = [...selected.stages]; [stages[index], stages[index + direction]] = [stages[index + direction], stages[index]]; stages.forEach((stage, position) => { stage.position = position; }); updateJob(selected.id, { stages }); await Promise.all(stages.map((stage) => runWrite(() => updateApplicationStage(createClient(), stage.id, { position: stage.position })))); }

  if (!loaded) return <DashboardLoading />;
  if (loadError) return <div className="grid min-h-screen place-items-center bg-[#f6f7f9] px-5"><div className="w-full max-w-md border border-slate-200 bg-white p-7 text-center"><p className="text-sm font-bold">{loadError}</p><button onClick={() => setReloadKey((value) => value + 1)} className="solid-button mt-5">다시 시도</button></div></div>;
  return <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 sm:px-8"><div className="flex items-center gap-2.5"><div className="flex size-8 items-center justify-center rounded-[10px] bg-cyan-500 text-sm font-black text-white">A</div><span className="text-[15px] font-bold">지원관리</span></div><div className="flex items-center gap-2"><p className="mr-1 hidden max-w-48 truncate text-xs font-semibold text-slate-500 lg:block">{userEmail}</p><form action={logout}><button className="outline-button">로그아웃</button></form><button onClick={() => setIsAddOpen(true)} className="solid-button"><PlusIcon className="size-4"/><span className="hidden sm:inline">지원 추가</span></button></div></div></header>
    <main className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:py-10"><div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold tracking-[-.035em]">지원 현황</h1><p className="mt-1.5 text-sm text-slate-500">기업별 전형 과정과 일정을 한눈에 관리하세요.</p></div><p className={`text-xs ${saveError ? "text-rose-500" : "text-slate-400"}`}>{saveError || (pendingWrites ? "저장 중..." : "저장됨")}</p></div>
      <section className="mb-5 flex flex-wrap items-center gap-x-7 gap-y-3 rounded-xl border border-slate-200 bg-white px-5 py-4">{[["진행 중", stats.total], ["3일 내 지원 마감", stats.urgent], ["검사 진행", stats.tests], ["면접 단계", stats.interviews]].map(([label, value], index) => <div key={String(label)} className="flex items-baseline gap-2"><p className="text-xs text-slate-500">{label}</p><p className={`text-lg font-bold ${index === 1 && Number(value) ? "text-rose-500" : ""}`}>{value}</p></div>)}</section>
      <ViewToggle value={viewMode} onChange={setViewMode}/>
      {viewMode === "목록" ? <JobList jobs={jobs} visible={visible} filter={filter} setFilter={setFilter} dateSort={dateSort} setDateSort={setDateSort} query={query} setQuery={setQuery} onSelect={setSelectedId} onStepChange={(id, step) => updateJob(id, { currentStep: step })}/> : <CalendarView jobs={jobs} month={calendarMonth} setMonth={setCalendarMonth} onSelect={setSelectedId}/>}
    </main>
    {isAddOpen && <AddModal draft={draft} setDraft={setDraft} onClose={() => setIsAddOpen(false)} onSubmit={addJob} isSaving={pendingWrites > 0}/>}
    {selected && <Detail job={selected} onClose={() => setSelectedId(null)} onUpdate={(changes) => updateJob(selected.id, changes)} onDelete={() => deleteJob(selected.id)} newTask={newTask} setNewTask={setNewTask} onAddTask={addTask} onToggleTask={toggleTask} onDeleteTask={removeTask} newStage={newStage} setNewStage={setNewStage} onAddStage={addStage} onPatchStage={patchStage} onDeleteStage={removeStage} onMoveStage={moveStage} isSaving={pendingWrites > 0}/>}
  </div>;
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  const modes: ViewMode[] = ["목록", "캘린더"];
  return <div className="relative mb-4 grid w-[190px] grid-cols-2 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm" role="radiogroup" aria-label="지원 현황 보기 방식">
    <span aria-hidden="true" className={`absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] rounded-full bg-cyan-700 shadow-[0_4px_12px_rgba(14,116,144,.2)] transition-transform duration-300 ease-out motion-reduce:transition-none ${value === "캘린더" ? "translate-x-full" : "translate-x-0"}`}/>
    {modes.map((mode) => <label key={mode} className={`relative z-10 flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-xs font-bold transition-colors duration-300 ${value === mode ? "text-white" : "text-slate-500 hover:text-cyan-800"}`}>
      <input type="radio" name="dashboard-view" value={mode} checked={value === mode} onChange={() => onChange(mode)} className="sr-only"/>
      {mode === "캘린더" && <CalendarIcon className="size-3.5"/>}{mode}
    </label>)}
  </div>;
}

function JobList({ jobs, visible, filter, setFilter, dateSort, setDateSort, query, setQuery, onSelect, onStepChange }: { jobs: Job[]; visible: Job[]; filter: Filter; setFilter: (filter: Filter) => void; dateSort: DateSort; setDateSort: (sort: DateSort) => void; query: string; setQuery: (query: string) => void; onSelect: (id: string) => void; onStepChange: (id: string, step: string) => void }) { return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-1 overflow-x-auto">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${filter === item ? "bg-cyan-700 text-white shadow-sm" : "text-slate-500 hover:bg-cyan-50 hover:text-cyan-800"}`}>{item}</button>)}</div><div className="flex gap-2"><button type="button" onClick={() => setDateSort(dateSort === "nearest" ? "latest" : "nearest")} className="outline-button shrink-0" aria-label={`일정 ${dateSort === "nearest" ? "최신순" : "임박순"}으로 변경`}><SortIcon className={`size-4 transition-transform ${dateSort === "latest" ? "rotate-180" : ""}`}/>{dateSort === "nearest" ? "일정 임박순" : "일정 최신순"}</button><label className="relative min-w-0 flex-1 lg:w-72"><SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="plain-field pl-9" placeholder="기업명 또는 직무 검색"/></label></div></div><div className="hidden grid-cols-[90px_minmax(170px,1.15fr)_140px_minmax(190px,1.25fr)_140px_110px_28px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-bold text-slate-400 md:grid"><span>지원 상태</span><span>기업 / 직무</span><span>현재 단계</span><span>전형 방식</span><span>예정 일정</span><span>전체 과정</span><span/></div>{visible.length ? <div className="divide-y divide-slate-100">{visible.map((job) => <JobRow key={job.id} job={job} onSelect={() => onSelect(job.id)} onStepChange={(step) => onStepChange(job.id, step)}/>)}</div> : <div className="px-6 py-20 text-center"><p className="font-bold">{jobs.length ? "해당하는 지원이 없습니다." : "아직 등록한 지원이 없습니다."}</p></div>}</section>; }

function JobRow({ job, onSelect, onStepChange }: { job: Job; onSelect: () => void; onStepChange: (step: ProcessStep) => void }) {
  const percent = progress(job); const next = nextStage(job); const preparing = job.currentStep === "지원 준비";
  return <div className="group cursor-pointer p-4 hover:bg-slate-50 md:grid md:grid-cols-[90px_minmax(170px,1.15fr)_140px_minmax(190px,1.25fr)_140px_110px_28px] md:items-center md:gap-4 md:px-5" onClick={onSelect} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onSelect()}><div className="mb-3 md:mb-0"><ApplicationStateBadge job={job}/></div><div className="flex min-w-0 items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold text-slate-600">{initials(job.company)}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{job.company}</p><p className="truncate text-xs text-slate-400">{job.role}</p></div></div><div className="mt-4 flex items-center justify-between md:mt-0"><span className="mobile-label">현재 단계</span><select value={job.currentStep} onClick={(event) => event.stopPropagation()} onChange={(event) => onStepChange(event.target.value)} className="step-select">{currentStepOptions(job).map((step) => <option key={step}>{step}</option>)}</select></div><div className="mt-4 flex items-start justify-between gap-3 md:mt-0"><span className="mobile-label">전형</span><div className="flex flex-wrap justify-end gap-1 md:justify-start">{job.assessments.length ? job.assessments.map((type) => <span key={type} className="process-tag">{type}</span>) : <span className="text-[10px] text-slate-300">별도 전형 없음</span>}</div></div><div className="mt-4 flex items-center justify-between md:mt-0"><span className="mobile-label">예정 일정</span><div>{preparing ? <><p className={`text-xs font-bold ${dayDiff(job.deadline) <= 3 ? "text-rose-500" : "text-slate-700"}`}>지원 마감 {dday(job.deadline)}</p><p className="text-[10px] text-slate-400">{formatDate(job.deadline)}</p></> : next ? next.title === job.currentStep ? <><p className="text-xs font-bold text-slate-700">{formatDate(next.scheduledDate!)}</p><p className="text-[10px] text-slate-400">현재 단계 일정</p></> : <><p className="truncate text-xs font-bold text-slate-700">{next.title}</p><p className="text-[10px] text-slate-400">{formatDate(next.scheduledDate!)}</p></> : <p className="text-xs font-semibold text-slate-400">{emptyScheduleLabel(job)}</p>}</div></div><div className="mt-4 flex items-center gap-3 md:mt-0"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${percent}%` }}/></div><span className="w-8 text-[10px] font-semibold text-slate-400">{percent}%</span></div><span className="hidden text-lg text-slate-300 group-hover:text-cyan-500 md:block">›</span></div>;
}

function ApplicationStateBadge({ job }: { job: Job }) {
  const state = applicationState(job);
  const icon = state.label === "진행 중" ? <ClockIcon className="size-3"/> : state.label === "최종 합격" ? <CheckIcon className="size-3"/> : <CloseIcon className="size-3"/>;
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold ${state.className}`}>{icon}{state.label}</span>;
}

type CalendarEvent = { date: string; title: string; job: Job; completed: boolean; kind: "period" | "deadline" | "stage"; segment?: "start" | "middle" | "end" | "single" };

function CalendarView({ jobs, month, setMonth, onSelect }: { jobs: Job[]; month: Date; setMonth: (date: Date) => void; onSelect: (id: string) => void }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  const events: CalendarEvent[] = jobs.flatMap((job) => {
    const recruitmentEvents: CalendarEvent[] = job.startDate
      ? datesInRange(job.startDate, job.deadline).map((date, index, range) => ({
          date,
          title: "지원 접수",
          job,
          completed: job.currentStep !== "지원 준비",
          kind: "period",
          segment: range.length === 1 ? "single" : index === 0 ? "start" : index === range.length - 1 ? "end" : "middle",
        }))
      : [{ date: job.deadline, title: "지원 마감", job, completed: job.currentStep !== "지원 준비", kind: "deadline" }];
    const stageEvents: CalendarEvent[] = job.stages
      .filter((stage) => stage.title !== "지원 준비" && stage.scheduledDate)
      .map((stage) => ({ date: stage.scheduledDate!, title: stage.title, job, completed: stage.completed, kind: "stage" }));
    return [...recruitmentEvents, ...stageEvents];
  });
  const today = localDate(new Date());
  const colors = companyColorMap(jobs);
  const companies = Array.from(new Map(jobs.map((job) => [companyColorKey(job.company), job.company])).entries())
    .sort(([, a], [, b]) => a.localeCompare(b, "ko"));

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5"><button className="square-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><div className="flex items-center gap-3"><h2 className="text-sm font-bold">{month.getFullYear()}년 {month.getMonth() + 1}월</h2><button className="text-xs font-semibold text-cyan-600" onClick={() => { const date = new Date(); setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }}>오늘</button></div><button className="square-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div>
    {companies.length > 0 && <div className="flex gap-3 overflow-x-auto border-b border-slate-100 px-4 py-2.5 sm:px-5" aria-label="기업별 캘린더 색상"><span className="shrink-0 text-[10px] font-bold text-slate-400">기업 색상</span>{companies.map(([key, company]) => <span key={key} className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-slate-600"><span className="size-2.5 rounded-[3px]" style={{ backgroundColor: `hsl(${colors.get(key) ?? 192} 72% 72%)` }}/>{company}</span>)}</div>}
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">{["일", "월", "화", "수", "목", "금", "토"].map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-bold text-slate-400">{day}</div>)}</div>
        <div className="grid grid-cols-7">{days.map((date) => {
          const key = localDate(date);
          const daily = events.filter((event) => event.date === key).sort((a, b) => Number(b.kind === "period") - Number(a.kind === "period"));
          const outside = date.getMonth() !== month.getMonth();
          return <div key={key} className={`min-h-32 min-w-0 border-b border-r border-slate-100 py-2 ${outside ? "bg-slate-50/60" : ""}`}><div className={`mb-1 ml-2 flex size-6 items-center justify-center rounded-full text-[10px] font-semibold ${key === today ? "bg-cyan-500 text-white" : outside ? "text-slate-300" : "text-slate-500"}`}>{date.getDate()}</div><div className="space-y-1">{daily.slice(0, 3).map((event) => <CalendarEventItem key={`${event.job.id}-${event.kind}-${event.title}-${event.date}`} event={event} weekday={date.getDay()} hue={colors.get(companyColorKey(event.job.company)) ?? 192} onSelect={onSelect}/>)}{daily.length > 3 && <p className="px-2 text-[9px] text-slate-400">+{daily.length - 3}개</p>}</div></div>;
        })}</div>
      </div>
    </div>
  </section>;
}

function CalendarEventItem({ event, weekday, hue, onSelect }: { event: CalendarEvent; weekday: number; hue: number; onSelect: (id: string) => void }) {
  const isPeriod = event.kind === "period";
  const continuesLeft = isPeriod && event.segment !== "start" && event.segment !== "single" && weekday !== 0;
  const continuesRight = isPeriod && event.segment !== "end" && event.segment !== "single" && weekday !== 6;
  const roundLeft = !isPeriod || !continuesLeft;
  const roundRight = !isPeriod || !continuesRight;
  const showPeriodLabel = event.segment === "start" || event.segment === "single" || weekday === 0;

  return <button onClick={() => onSelect(event.job.id)} aria-label={`${event.job.company} ${event.title}`} style={calendarColor(hue, event.completed)} className={`relative z-[1] block min-h-6 truncate px-1.5 py-1 text-left text-[9px] font-semibold transition-[filter,opacity] hover:brightness-95 sm:text-[10px] ${event.completed && !isPeriod ? "line-through" : ""} ${isPeriod ? continuesRight ? "w-[calc(100%+1px)]" : "w-full" : "mx-2 w-[calc(100%-1rem)] rounded-md"} ${roundLeft ? "rounded-l-md" : ""} ${roundRight ? "rounded-r-md" : ""}`}>
    {isPeriod ? showPeriodLabel ? `${event.job.company} · 접수` : "\u00a0" : `${event.job.company} · ${event.title}`}
  </button>;
}

function AssessmentPicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [custom, setCustom] = useState(""); const options = Array.from(new Set([...ASSESSMENT_TYPES, ...value]));
  function addCustom() { const title = custom.trim(); if (!title || value.includes(title) || value.length >= 10) return; onChange([...value, title]); setCustom(""); }
  return <div><div className="flex flex-wrap gap-2">{options.map((type) => { const active = value.includes(type); return <label key={type} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${active ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}><input type="checkbox" className="sr-only" checked={active} onChange={() => onChange(active ? value.filter((item) => item !== type) : [...value, type])}/><span>{active ? "✓" : "+"}</span>{type}</label>; })}</div><div className="mt-2 flex gap-2"><input value={custom} maxLength={40} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustom(); } }} className="plain-field" placeholder="기타 전형 직접 입력"/><button type="button" onClick={addCustom} disabled={!custom.trim() || value.length >= 10} className="outline-button shrink-0 disabled:opacity-40">추가</button></div></div>;
}

function AddModal({ draft, setDraft, onClose, onSubmit, isSaving }: { draft: JobDraft; setDraft: React.Dispatch<React.SetStateAction<JobDraft>>; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; isSaving: boolean }) {
  const invalidPeriod = Boolean(draft.startDate && draft.deadline && draft.startDate > draft.deadline);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && !isSaving && onClose()}><div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-[24px] sm:p-8"><div className="mb-7 flex justify-between"><div><h2 className="text-2xl font-bold">지원 정보 등록</h2><p className="mt-1 text-sm text-slate-400">기업과 기본 전형 정보를 입력하세요.</p></div><button type="button" onClick={onClose} className="square-button"><CloseIcon className="size-5"/></button></div><form onSubmit={onSubmit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="기업명"><input required autoFocus value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} className="plain-field"/></Field><Field label="직무명"><input required value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className="plain-field"/></Field></div><div className="rounded-2xl bg-slate-50 p-4"><p className="mb-3 text-xs font-bold text-slate-700">지원 접수 기간</p><div className="grid gap-4 sm:grid-cols-2"><Field label="접수 시작일" optional><input type="date" value={draft.startDate ?? ""} max={draft.deadline || undefined} onChange={(event) => setDraft({ ...draft, startDate: event.target.value || null })} className="plain-field"/></Field><Field label="지원 마감일"><input required type="date" value={draft.deadline} min={draft.startDate ?? undefined} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} className="plain-field"/></Field></div>{invalidPeriod && <p className="mt-2 text-xs font-semibold text-rose-500">접수 시작일은 마감일보다 늦을 수 없습니다.</p>}</div><Field label="현재 단계"><select value={draft.currentStep} onChange={(event) => setDraft({ ...draft, currentStep: event.target.value })} className="plain-field">{PROCESS_STEPS.map((step) => <option key={step}>{step}</option>)}</select></Field><Field label="포함된 전형"><AssessmentPicker value={draft.assessments} onChange={(assessments) => setDraft({ ...draft, assessments })}/></Field><Field label="공고 링크" optional><input type="url" value={draft.link} onChange={(event) => setDraft({ ...draft, link: event.target.value })} className="plain-field" placeholder="https://"/></Field><div className="flex justify-end gap-2 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="outline-button">취소</button><button disabled={isSaving || invalidPeriod} className="solid-button disabled:opacity-60">{isSaving ? "저장 중..." : "등록하기"}</button></div></form></div></div>;
}

type DetailProps = { job: Job; onClose: () => void; onUpdate: (changes: Partial<Job>) => void; onDelete: () => void; newTask: string; setNewTask: (value: string) => void; onAddTask: (event: FormEvent<HTMLFormElement>) => void; onToggleTask: (id: string, done: boolean) => void; onDeleteTask: (id: string) => void; newStage: string; setNewStage: (value: string) => void; onAddStage: (event: FormEvent<HTMLFormElement>) => void; onPatchStage: (id: string, changes: Partial<JobStage>) => void; onDeleteStage: (id: string) => void; onMoveStage: (index: number, direction: -1 | 1) => void; isSaving: boolean };
function Detail({ job, onClose, onUpdate, onDelete, newTask, setNewTask, onAddTask, onToggleTask, onDeleteTask, newStage, setNewStage, onAddStage, onPatchStage, onDeleteStage, onMoveStage, isSaving }: DetailProps) {
  const percent = progress(job); const preparing = job.currentStep === "지원 준비"; const next = nextStage(job);
  return <div className="fixed inset-0 z-40 bg-black/15" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="absolute inset-y-2 right-2 w-[calc(100%-16px)] overflow-y-auto rounded-[24px] bg-white shadow-2xl sm:inset-y-3 sm:right-3 sm:max-w-[560px]"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-7"><p className="text-sm font-bold">지원 상세</p><button onClick={onClose} className="square-button"><CloseIcon className="size-5"/></button></div><div className="p-5 sm:p-7"><div className="mb-7 flex gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-50 text-xs font-bold text-cyan-700">{initials(job.company)}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold">{job.company}</h2><ApplicationStateBadge job={job}/></div><p className="text-sm text-slate-400">{job.role}</p></div></div><div className="mb-7 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="mini-label">{preparing ? "접수 기간" : next?.title === job.currentStep ? "현재 단계 일정" : "다음 일정"}</p>{preparing ? <><p className="mt-1 text-lg font-bold">지원 마감 {dday(job.deadline)}</p><p className="text-xs text-slate-400">{formatPeriod(job.startDate, job.deadline)}</p></> : next ? next.title === job.currentStep ? <><p className="mt-1 text-lg font-bold">{formatDate(next.scheduledDate!)}</p><p className="text-xs text-slate-400">{job.currentStep} 진행 중</p></> : <><p className="mt-1 truncate text-lg font-bold">{next.title}</p><p className="text-xs text-slate-400">{formatDate(next.scheduledDate!)}</p></> : <p className="mt-1 text-lg font-bold text-slate-500">{emptyScheduleLabel(job)}</p>}</div><div className="rounded-2xl bg-cyan-50 p-4"><p className="mini-label">전체 과정</p><p className="mt-1 text-xl font-bold text-cyan-700">{percent}%</p><p className="text-xs text-cyan-600/60">완료 {job.stages.filter((stage) => stage.completed).length}/{job.stages.length}</p></div></div><Field label="현재 단계"><select value={job.currentStep} onChange={(event) => onUpdate({ currentStep: event.target.value })} className="plain-field mb-6">{currentStepOptions(job).map((step) => <option key={step}>{step}</option>)}</select></Field><section className="mb-6 rounded-2xl bg-slate-50 p-4"><p className="mb-3 text-xs font-bold text-slate-700">지원 접수 기간</p><div className="grid grid-cols-2 gap-3"><Field label="시작일" optional><input type="date" value={job.startDate ?? ""} max={job.deadline} onChange={(event) => onUpdate({ startDate: event.target.value || null })} className="plain-field"/></Field><Field label="마감일"><input type="date" value={job.deadline} min={job.startDate ?? undefined} onChange={(event) => onUpdate({ deadline: event.target.value })} className="plain-field"/></Field></div></section><Field label="포함된 전형"><AssessmentPicker value={job.assessments} onChange={(assessments) => onUpdate({ assessments })}/></Field>
    <section className="my-8 border-t border-slate-100 pt-7"><div className="mb-1 flex items-center justify-between"><h3 className="text-sm font-bold">전형 과정</h3><span className="text-xs font-semibold text-slate-400">완료 체크 시 진행률 자동 계산</span></div><p className="mb-4 text-xs leading-5 text-slate-400">지원 준비는 위 접수 기간으로, 이후 단계는 일정일 또는 마감일로 관리합니다.</p><div className="space-y-2">{job.stages.map((stage, index) => <div key={stage.id} className="grid grid-cols-[auto_minmax(0,1fr)_120px_auto] items-center gap-2 rounded-xl border border-slate-200 p-2.5"><input type="checkbox" checked={stage.completed} onChange={() => onPatchStage(stage.id, { completed: !stage.completed })} className="size-4 accent-cyan-500"/><input value={stage.title} maxLength={40} onChange={(event) => onPatchStage(stage.id, { title: event.target.value })} className={`min-w-0 border-0 bg-transparent text-xs font-semibold outline-none ${stage.completed ? "text-slate-300 line-through" : ""}`}/>{stage.title === "지원 준비" ? <span className="text-center text-[10px] font-semibold text-slate-400">접수 기간 참조</span> : <input type="date" value={stage.scheduledDate ?? ""} onChange={(event) => onPatchStage(stage.id, { scheduledDate: event.target.value || null })} className="min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] text-slate-600"/>}<div className="flex"><button type="button" disabled={index === 0} onClick={() => onMoveStage(index, -1)} className="px-1 text-xs text-slate-400 disabled:opacity-20">↑</button><button type="button" disabled={index === job.stages.length - 1} onClick={() => onMoveStage(index, 1)} className="px-1 text-xs text-slate-400 disabled:opacity-20">↓</button><button type="button" onClick={() => onDeleteStage(stage.id)} className="px-1 text-slate-300 hover:text-rose-500"><CloseIcon className="size-3.5"/></button></div></div>)}</div><form onSubmit={onAddStage} className="mt-2 flex gap-2"><input value={newStage} maxLength={40} onChange={(event) => setNewStage(event.target.value)} className="plain-field" placeholder="예: 과제 전형, 2차 기술 면접"/><button disabled={!newStage.trim() || isSaving} className="outline-button shrink-0"><PlusIcon className="size-4"/>단계 추가</button></form></section>
    {job.link && <a href={job.link} target="_blank" rel="noreferrer" className="my-7 flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-100"><span>채용공고 열기</span><ExternalIcon className="size-4"/></a>}
    <section className="my-7"><div className="mb-3 flex justify-between"><h3 className="text-sm font-bold">준비 체크리스트</h3><span className="text-xs text-slate-400">{job.tasks.filter((task) => task.done).length}/{job.tasks.length}</span></div><div className="space-y-2">{job.tasks.map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3"><input type="checkbox" checked={task.done} onChange={() => onToggleTask(task.id, !task.done)} className="size-4 accent-cyan-500"/><span className={`flex-1 text-sm ${task.done ? "text-slate-300 line-through" : ""}`}>{task.label}</span><button onClick={() => onDeleteTask(task.id)}><CloseIcon className="size-4 text-slate-300"/></button></div>)}</div><form onSubmit={onAddTask} className="mt-2 flex gap-2"><input value={newTask} onChange={(event) => setNewTask(event.target.value)} className="plain-field" placeholder="할 일 추가"/><button disabled={!newTask.trim()} className="outline-button px-3"><PlusIcon className="size-4"/></button></form></section><section className="mb-8"><p className="mb-2 text-xs font-bold">메모</p><RichTextEditor key={job.id} value={job.memo} onChange={(memo) => onUpdate({ memo })}/></section><button onClick={onDelete} className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-rose-500"><TrashIcon className="size-4"/>지원 정보 삭제</button></div></aside></div>;
}

function DashboardLoading() { return <div className="min-h-screen bg-[#f6f7f9]"><div className="h-16 border-b border-slate-200 bg-white"/><main className="mx-auto max-w-[1320px] px-5 py-8"><div className="h-8 w-40 animate-pulse rounded bg-slate-200"/><div className="mt-8 h-96 animate-pulse rounded-xl border border-slate-200 bg-white"/></main></div>; }
function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) { return <label className="block"><span className="mb-2 flex gap-2 text-xs font-semibold text-slate-600">{label}{optional && <em className="font-normal not-italic text-slate-400">선택</em>}</span>{children}</label>; }
