"use client";

import { AlertTriangle, CalendarDays, CheckCircle2, CircleDotDashed } from "lucide-react";

import { localToday } from "@/lib/timeline/date";
import type { ProjectRecord } from "@/lib/projects/types";

type AgendaItem = { id: string; project: string; title: string; date: string; kind: "Project" | "Task" | "Milestone"; overdue: boolean };

export function ProjectDashboard({ projects }: { projects: ProjectRecord[] }) {
  const today = localToday();
  const active = projects.filter((project) => !project.archivedAt && !["completed", "cancelled"].includes(project.status));
  const overdueProjects = active.filter((project) => project.deadline && project.deadline < today);
  const agenda: AgendaItem[] = active.flatMap((project) => [
    ...(project.deadline ? [{ id: `project-${project.id}`, project: project.name, title: "Project deadline", date: project.deadline, kind: "Project" as const, overdue: project.deadline < today }] : []),
    ...project.tasks.filter((task) => task.status !== "done" && task.dueDate).map((task) => ({ id: `task-${task.id}`, project: project.name, title: task.title, date: task.dueDate!, kind: "Task" as const, overdue: task.dueDate! < today })),
    ...project.milestones.filter((milestone) => !milestone.completedAt).map((milestone) => ({ id: `milestone-${milestone.id}`, project: project.name, title: milestone.title, date: milestone.targetDate, kind: "Milestone" as const, overdue: milestone.targetDate < today })),
  ]).sort((left, right) => left.date.localeCompare(right.date) || left.project.localeCompare(right.project));
  const upcoming = agenda.filter((item) => !item.overdue).slice(0, 8);
  const overdue = agenda.filter((item) => item.overdue).slice(0, 8);
  const completedTasks = projects.flatMap((project) => project.tasks).filter((task) => task.status === "done").length;

  return <section className="mt-8" aria-labelledby="dashboard-title">
    <div className="border-b pb-5"><p className="text-sm font-medium text-[var(--accent)]">Personal workflow</p><h2 id="dashboard-title" className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Local attention signals derived from Projects, Tasks, and Milestones for {today}.</p></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={CircleDotDashed} label="Active projects" value={active.length} /><Metric icon={AlertTriangle} label="Overdue projects" value={overdueProjects.length} danger={overdueProjects.length > 0} /><Metric icon={CalendarDays} label="Open agenda items" value={agenda.length} /><Metric icon={CheckCircle2} label="Completed tasks" value={completedTasks} /></div>
    <div className="mt-7 grid gap-6 lg:grid-cols-2"><Agenda title="Overdue" description="Items that need attention now." items={overdue} empty="Nothing overdue." danger /><Agenda title="Upcoming" description="The next dated commitments across your local portfolio." items={upcoming} empty="No upcoming dated items." /></div>
  </section>;
}

function Metric({ icon: Icon, label, value, danger }: { icon: typeof AlertTriangle; label: string; value: number; danger?: boolean }) {
  return <article className="border bg-[var(--card)] p-4"><div className="flex items-center justify-between"><span className="text-sm text-[var(--muted-foreground)]">{label}</span><Icon className={`size-4 ${danger ? "text-[var(--destructive)]" : "text-[var(--accent)]"}`} aria-hidden="true" /></div><p className={`mt-3 text-3xl font-semibold tabular-nums ${danger ? "text-[var(--destructive)]" : ""}`}>{value}</p></article>;
}

function Agenda({ title, description, items, empty, danger }: { title: string; description: string; items: AgendaItem[]; empty: string; danger?: boolean }) {
  return <section className="border bg-[var(--card)] p-5" aria-labelledby={`${title.toLowerCase()}-title`}><h3 id={`${title.toLowerCase()}-title`} className="font-semibold">{title}</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p><div className="mt-4 grid gap-2">{items.length === 0 ? <p className="border border-dashed p-3 text-sm text-[var(--muted-foreground)]">{empty}</p> : items.map((item) => <article key={item.id} className="flex items-center justify-between gap-3 border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{item.project} · {item.kind}</p></div><time dateTime={item.date} className={`shrink-0 text-xs font-medium ${danger ? "text-[var(--destructive)]" : ""}`}>{item.date}</time></article>)}</div></section>;
}
