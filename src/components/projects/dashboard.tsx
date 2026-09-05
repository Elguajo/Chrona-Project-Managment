"use client";

import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, CircleDotDashed } from "lucide-react";
import { useState } from "react";

import { ProjectDrawer } from "@/components/projects/kanban-board";
import { localToday } from "@/lib/timeline/date";
import type { ProjectRecord } from "@/lib/projects/types";

type AgendaItem = { id: string; projectId: string; project: string; title: string; date: string; kind: "Project" | "Task" | "Milestone"; overdue: boolean };

export function ProjectDashboard({ projects }: { projects: ProjectRecord[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = localToday();
  const active = projects.filter((project) => !project.archivedAt && !["completed", "cancelled"].includes(project.status));
  const overdueProjects = active.filter((project) => project.deadline && project.deadline < today);
  const agenda: AgendaItem[] = active.flatMap((project) => [
    ...(project.deadline ? [{ id: `project-${project.id}`, projectId: project.id, project: project.name, title: "Project deadline", date: project.deadline, kind: "Project" as const, overdue: project.deadline < today }] : []),
    ...project.tasks.filter((task) => task.status !== "done" && task.dueDate).map((task) => ({ id: `task-${task.id}`, projectId: project.id, project: project.name, title: task.title, date: task.dueDate!, kind: "Task" as const, overdue: task.dueDate! < today })),
    ...project.milestones.filter((milestone) => !milestone.completedAt).map((milestone) => ({ id: `milestone-${milestone.id}`, projectId: project.id, project: project.name, title: milestone.title, date: milestone.targetDate, kind: "Milestone" as const, overdue: milestone.targetDate < today })),
  ]).sort((left, right) => left.date.localeCompare(right.date) || left.project.localeCompare(right.project));
  const upcoming = agenda.filter((item) => !item.overdue).slice(0, 8);
  const overdue = agenda.filter((item) => item.overdue).slice(0, 8);
  const completedTasks = projects.flatMap((project) => project.tasks).filter((task) => task.status === "done").length;

  return <section className="mt-8" aria-labelledby="dashboard-title">
    <div className="border-b pb-5"><p className="text-xs font-medium text-[var(--muted-foreground)]">Personal workflow</p><h2 id="dashboard-title" className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">What needs your attention. <time dateTime={today}>{today}</time></p></div>
    <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric icon={CircleDotDashed} label="Active projects" value={active.length} /><Metric icon={AlertTriangle} label="Overdue projects" value={overdueProjects.length} danger={overdueProjects.length > 0} /><Metric icon={CalendarDays} label="Open agenda items" value={agenda.length} /><Metric icon={CheckCircle2} label="Completed tasks" value={completedTasks} /></div>
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-2"><Agenda title="Overdue" description="Items that need attention now." items={overdue} empty="Nothing overdue." danger onOpen={setEditingId} /><Agenda title="Upcoming" description="Your next scheduled commitments." items={upcoming} empty="No upcoming dated items." onOpen={setEditingId} /></div>
    <ProjectDrawer open={editingId !== null} project={projects.find((project) => project.id === editingId) ?? null} onClose={() => setEditingId(null)} />
  </section>;
}

function Metric({ icon: Icon, label, value, danger }: { icon: typeof AlertTriangle; label: string; value: number; danger?: boolean }) {
  return <article className="rounded-lg border bg-[var(--card)] p-4 sm:p-5"><div className="flex min-h-10 items-start justify-between gap-2 sm:min-h-0"><span className="text-sm text-[var(--muted-foreground)]">{label}</span><Icon className={`mt-0.5 size-4 shrink-0 ${danger ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`} aria-hidden="true" /></div><p className={`mt-4 text-4xl font-medium tabular-nums ${danger ? "text-[var(--destructive)]" : ""}`}>{value}</p></article>;
}

function Agenda({ title, description, items, empty, danger, onOpen }: { title: string; description: string; items: AgendaItem[]; empty: string; danger?: boolean; onOpen: (projectId: string) => void }) {
  return <section className="overflow-hidden rounded-lg border bg-[var(--card)]" aria-labelledby={`${title.toLowerCase()}-title`}>
    <div className="px-5 pt-5 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id={`${title.toLowerCase()}-title`} className="font-semibold">{title}</h3>
        <span className={`text-xs tabular-nums ${danger && items.length ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`}>{items.length ? `${items.length} shown` : "All clear"}</span>
      </div>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
    </div>
    {items.length === 0 ? <div className="flex items-center gap-3 border-t px-5 py-6 text-sm text-[var(--muted-foreground)]"><CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />{empty}</div> : <div className="divide-y border-t">
      {items.map((item) => <button key={item.id} type="button" className="group flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--muted)] focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--primary)] motion-reduce:transition-none" onClick={() => onOpen(item.projectId)}>
        <span className="min-w-0">
          <span className="block text-sm font-medium break-words sm:truncate">{item.title}</span>
          <span className="mt-1 block truncate text-xs text-[var(--muted-foreground)]">{item.project} · {item.kind}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <time dateTime={item.date} className={`text-xs tabular-nums ${danger ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`}>{item.date}</time>
          <ChevronRight className="size-3.5 text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]" aria-hidden="true" />
        </span>
      </button>)}
    </div>}
  </section>;
}
