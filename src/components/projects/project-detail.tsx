"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Flag, ListChecks, Pencil } from "lucide-react";
import { useEffect, useRef } from "react";

import { ProjectForm } from "@/components/projects/kanban-board";
import { QuickAdd } from "@/components/app/quick-add";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { timelineProject } from "@/lib/timeline/date";
import type { ProjectActivityRecord, ProjectRecord, ProjectTemplateRecord } from "@/lib/projects/types";

function displayLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function activityLabel(activity: ProjectActivityRecord) {
  const labels: Record<string, string> = {
    created: "Project created",
    created_from_template: "Project created from template",
    archived: "Project archived",
    restored: "Project restored",
    completed: "Project completed",
    cancelled: "Project cancelled",
    reopened: "Project reopened",
    status_changed: "Status changed",
    deadline_changed: "Deadline changed",
    progress_changed: "Work progress changed",
    reordered: "Project reordered",
    task_created: "Task added",
    task_updated: "Task updated",
    task_deleted: "Task deleted",
    milestone_created: "Milestone added",
    milestone_completed: "Milestone completed",
    milestone_reopened: "Milestone reopened",
    milestone_deleted: "Milestone deleted",
    document_created: "Document created",
    document_updated: "Document updated",
    document_deleted: "Document deleted",
  };
  return labels[activity.type] ?? displayLabel(activity.type);
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <article className="border bg-[var(--card)] p-4"><p className="text-sm text-[var(--muted-foreground)]">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>{detail && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{detail}</p>}</article>;
}

function Progress({ label, value, unavailable = false }: { label: string; value: number | null; unavailable?: boolean }) {
  return <div><div className="flex items-baseline justify-between gap-3"><span className="text-sm font-medium">{label}</span><span className="text-sm tabular-nums text-[var(--muted-foreground)]">{unavailable || value === null ? "No dated plan" : `${value}%`}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--muted)]" aria-hidden="true">{value !== null && <span className="block h-full bg-[var(--accent)]" style={{ width: `${value}%` }} />}</div></div>;
}

export function ProjectDetail({ project, activity, projects, templates }: { project: ProjectRecord; activity: ProjectActivityRecord[]; projects: ProjectRecord[]; templates: ProjectTemplateRecord[] }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timeline = timelineProject(project);
  const doneTasks = project.tasks.filter((task) => task.status === "done").length;
  const completedMilestones = project.milestones.filter((milestone) => milestone.completedAt).length;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"><ArrowLeft className="size-4" aria-hidden="true" /> Back to portfolio</Link><QuickAdd projects={projects} templates={templates} /></div>
    <header className="mt-5 border-b pb-6">
      <p className="text-sm font-medium text-[var(--accent)]">Project workspace</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4"><div><h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-[var(--ring)]">{project.name}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{project.description ?? "No description yet."}</p></div><span className="border px-3 py-1 text-sm font-medium">{displayLabel(project.status)}</span></div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-[var(--muted-foreground)]">Start</dt><dd className="mt-1 font-medium">{project.startDate ?? "Unscheduled"}</dd></div><div><dt className="text-[var(--muted-foreground)]">Deadline</dt><dd className="mt-1 font-medium">{project.deadline ?? "No deadline"}</dd></div><div><dt className="text-[var(--muted-foreground)]">Type</dt><dd className="mt-1 font-medium">{project.type ? displayLabel(project.type) : "Unspecified"}</dd></div><div><dt className="text-[var(--muted-foreground)]">Priority</dt><dd className="mt-1 font-medium">{project.priority ? displayLabel(project.priority) : "Unspecified"}</dd></div></dl>
    </header>

    <section className="mt-7" aria-labelledby="project-overview-title"><div className="flex items-center gap-2"><CalendarDays className="size-4 text-[var(--accent)]" aria-hidden="true" /><h2 id="project-overview-title" className="text-xl font-semibold">Overview</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Work progress" value={`${project.workProgress}%`} /><Metric label="Time progress" value={timeline?.metrics.timeProgress === null || !timeline ? "—" : `${timeline.metrics.timeProgress}%`} detail={timeline?.metrics.label ?? "Add a start and deadline to calculate it."} /><Metric label="Tasks" value={`${doneTasks}/${project.tasks.length}`} detail="Completed" /><Metric label="Milestones" value={`${completedMilestones}/${project.milestones.length}`} detail="Completed" /></div><div className="mt-5 grid gap-4 border bg-[var(--card)] p-5 sm:grid-cols-2"><Progress label="Work Progress" value={project.workProgress} /><Progress label="Time Progress" value={timeline?.metrics.timeProgress ?? null} unavailable={!timeline?.metrics.timeProgress && timeline?.metrics.timeProgress !== 0} /></div></section>

    <section className="mt-8 border p-5" aria-labelledby="project-schedule-title"><div className="flex items-center gap-2"><Flag className="size-4 text-[var(--accent)]" aria-hidden="true" /><h2 id="project-schedule-title" className="text-xl font-semibold">Schedule</h2></div><p className="mt-1 text-sm text-[var(--muted-foreground)]">{timeline ? timeline.metrics.label : "Add a start date to place this Project on the portfolio timeline."}</p><div className="mt-4 grid gap-2">{project.milestones.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No dated milestones yet.</p> : project.milestones.map((milestone) => <div key={milestone.id} className="flex items-center justify-between gap-3 border p-3"><span className={milestone.completedAt ? "text-sm line-through text-[var(--muted-foreground)]" : "text-sm font-medium"}>{milestone.title}</span><time dateTime={milestone.targetDate} className="shrink-0 text-xs text-[var(--muted-foreground)]">{milestone.targetDate}</time></div>)}</div></section>

    <section className="mt-8 border p-5" aria-labelledby="project-links-title"><div className="flex items-center gap-2"><ExternalLink className="size-4 text-[var(--accent)]" aria-hidden="true" /><h2 id="project-links-title" className="text-xl font-semibold">Links</h2></div><div className="mt-4 grid gap-2">{project.links.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No project links yet. Add one in Edit project.</p> : project.links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 border p-3 text-sm font-medium underline-offset-4 hover:underline"><span>{link.title}<span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">{displayLabel(link.type)}</span></span><ExternalLink className="size-4 shrink-0" aria-hidden="true" /></a>)}</div></section>

    <details className="mt-8 border p-5"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold"><Pencil className="size-4 text-[var(--accent)]" aria-hidden="true" /> Edit project</summary><ProjectForm project={project} onSaved={() => undefined} /></details>
    <ProjectWorkspace project={project} />

    <section className="mt-8 border-t pt-6" aria-labelledby="project-activity-title"><div className="flex items-center gap-2"><ListChecks className="size-4 text-[var(--accent)]" aria-hidden="true" /><h2 id="project-activity-title" className="text-xl font-semibold">Activity</h2></div><div className="mt-4 grid gap-2">{activity.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No recorded activity yet.</p> : activity.map((event) => <article key={event.id} className="flex items-center justify-between gap-4 border p-3"><p className="text-sm font-medium">{activityLabel(event)}</p><time dateTime={event.createdAt} className="shrink-0 text-xs text-[var(--muted-foreground)]">{new Date(event.createdAt).toLocaleString()}</time></article>)}</div></section>
    {project.archivedAt && <p className="mt-6 border border-amber-500/50 bg-amber-500/10 p-4 text-sm">This Project is archived. Restore it from a portfolio drawer before editing its workspace.</p>}
  </main>;
}
