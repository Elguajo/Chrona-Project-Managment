"use client";

import { ChevronLeft, ChevronRight, Clock3, Flag, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  clippedRange,
  dateRange,
  localToday,
  percentageForDate,
  periodFor,
  shiftPeriod,
  timelineProject,
  type TimelineScale,
} from "@/lib/timeline/date";
import { PROJECT_STATUSES, PROJECT_TYPES, type ProjectRecord } from "@/lib/projects/types";

function displayLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function periodLabel(start: string, scale: TimelineScale) {
  const date = new Date(`${start}T00:00:00Z`);
  if (scale === "month") return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${date.getUTCFullYear()}`;
}

export function Timeline({ projects }: { projects: ProjectRecord[] }) {
  const today = localToday();
  const [scale, setScale] = useState<TimelineScale>("month");
  const [anchor, setAnchor] = useState(today);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const period = periodFor(anchor, scale);
  const days = dateRange(period.start, period.end);
  const rows = useMemo(() => {
    const lowered = query.trim().toLocaleLowerCase();
    return projects.filter((project) => !project.archivedAt).filter((project) => {
      const haystack = [project.name, project.clientName, project.description, ...project.tags].filter(Boolean).join(" ").toLocaleLowerCase();
      return (!lowered || haystack.includes(lowered)) && (!status || project.status === status) && (!type || project.type === type);
    });
  }, [projects, query, status, type]);
  const scheduled = rows.map((project) => ({ project, timeline: timelineProject(project, today) })).filter((item): item is { project: ProjectRecord; timeline: NonNullable<ReturnType<typeof timelineProject>> } => Boolean(item.timeline));
  const unscheduled = rows.filter((project) => !project.startDate);
  const todayVisible = today >= period.start && today <= period.end;
  const daysWidth = Math.max(800, days.length * (scale === "month" ? 34 : 18));

  return (
    <section className="mt-8" aria-labelledby="timeline-title">
      <div className="flex flex-col gap-5 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Portfolio timing</p>
          <h2 id="timeline-title" className="mt-1 text-2xl font-semibold tracking-tight">Timeline</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Project ranges are calculated from date-only values. Milestones are markers on their owning project.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Timeline navigation">
          <Button size="sm" variant="outline" onClick={() => setAnchor(shiftPeriod(anchor, scale, -1))}><ChevronLeft aria-hidden="true" /><span className="sr-only">Previous {scale}</span></Button>
          <Button size="sm" variant="outline" onClick={() => setAnchor(today)}><Clock3 aria-hidden="true" /> Today</Button>
          <Button size="sm" variant="outline" onClick={() => setAnchor(shiftPeriod(anchor, scale, 1))}><span className="sr-only">Next {scale}</span><ChevronRight aria-hidden="true" /></Button>
          <select aria-label="Timeline scale" className="field w-auto" value={scale} onChange={(event) => setScale(event.target.value as TimelineScale)}><option value="month">Month</option><option value="quarter">Quarter</option></select>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(16rem,1fr)_11rem_11rem]" aria-label="Timeline filters">
        <label className="relative block"><span className="sr-only">Search projects</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" aria-hidden="true" /><input className="field pl-9" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, clients, or tags" /></label>
        <label><span className="sr-only">Filter by status</span><select className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{PROJECT_STATUSES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></label>
        <label><span className="sr-only">Filter by project type</span><select className="field" value={type} onChange={(event) => setType(event.target.value)}><option value="">All types</option>{PROJECT_TYPES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></label>
      </div>

      <div className="mt-6 overflow-x-auto border" tabIndex={0} aria-label={`${periodLabel(period.start, scale)} timeline`}>
        <div className="min-w-[68rem]">
          <div className="sticky top-0 z-10 grid grid-cols-[18rem_minmax(0,1fr)] border-b bg-[var(--background)]">
            <div className="sticky left-0 z-20 border-r bg-[var(--background)] p-3 text-sm font-semibold">{periodLabel(period.start, scale)}</div>
            <div className="relative" style={{ width: daysWidth }}>
              <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>{days.map((day) => <time key={day} className={`border-r px-1 py-3 text-center text-[10px] ${day === today ? "font-bold text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`} dateTime={day}>{new Date(`${day}T00:00:00Z`).getUTCDate()}</time>)}</div>
              {todayVisible && <TodayLine left={percentageForDate(today, period.start, period.end)} />}
            </div>
          </div>
          <div className="grid grid-cols-[18rem_minmax(0,1fr)]">
            <div className="sticky left-0 z-10 border-r bg-[var(--background)]">
              {scheduled.map(({ project, timeline }) => <ProjectLabel key={project.id} project={project} metric={timeline.metrics.label} />)}
            </div>
            <div className="relative" style={{ width: daysWidth }}>
              {todayVisible && <TodayLine left={percentageForDate(today, period.start, period.end)} />}
              {scheduled.map(({ project, timeline }) => <TimelineRow key={project.id} project={project} timeline={timeline} visibleStart={period.start} visibleEnd={period.end} />)}
            </div>
          </div>
        </div>
      </div>

      {unscheduled.length > 0 && <section className="mt-5 border p-4" aria-labelledby="unscheduled-title"><h3 id="unscheduled-title" className="font-semibold">Unscheduled ({unscheduled.length})</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">These projects need a start date before they receive a timeline range.</p><div className="mt-3 flex flex-wrap gap-2">{unscheduled.map((project) => <span key={project.id} className="border bg-[var(--muted)] px-2 py-1 text-sm">{project.name}</span>)}</div></section>}
      {rows.length === 0 && <p className="mt-5 border border-dashed p-5 text-sm text-[var(--muted-foreground)]">No projects match these filters.</p>}
    </section>
  );
}

function TodayLine({ left }: { left: number }) {
  return <span aria-label="Today" className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-[var(--destructive)]" style={{ left: `${left}%` }} />;
}

function ProjectLabel({ project, metric }: { project: ProjectRecord; metric: string }) {
  return <div className="flex h-20 flex-col justify-center border-b px-3"><span className="truncate text-sm font-medium">{project.name}</span><span className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{metric} · Work {project.workProgress}%</span></div>;
}

function TimelineRow({ project, timeline, visibleStart, visibleEnd }: { project: ProjectRecord; timeline: NonNullable<ReturnType<typeof timelineProject>>; visibleStart: string; visibleEnd: string }) {
  const range = clippedRange(timeline.displayStart, timeline.displayEnd, visibleStart, visibleEnd);
  const overdue = timeline.overdueStart ? clippedRange(timeline.overdueStart, timeline.displayEnd, visibleStart, visibleEnd) : null;
  return <div className="relative h-20 border-b"><div className="absolute inset-x-0 top-1/2 border-t border-dashed" />{range && <div className={`absolute top-[calc(50%-0.85rem)] h-7 rounded ${timeline.metrics.overdueDays > 0 ? "bg-amber-500" : project.status === "completed" ? "bg-teal-600" : project.status === "cancelled" ? "bg-rose-500" : "bg-emerald-600"}`} style={{ left: `${range.left}%`, width: `${range.width}%` }} title={`${project.name}: ${timeline.metrics.label}`}><span className="block truncate px-2 py-1 text-xs font-medium text-white">{project.name}</span></div>}{overdue && <div className="absolute top-[calc(50%-0.85rem)] h-7 rounded-r bg-[var(--destructive)]/70" style={{ left: `${overdue.left}%`, width: `${overdue.width}%` }} aria-label={timeline.metrics.label} />}{project.milestones.filter((milestone) => milestone.targetDate >= visibleStart && milestone.targetDate <= visibleEnd).map((milestone) => <span key={milestone.id} title={`${milestone.title} · ${milestone.targetDate}`} className={`absolute top-2 z-10 grid size-4 -translate-x-1/2 rotate-45 place-items-center border ${milestone.completedAt ? "bg-emerald-600" : "bg-[var(--background)]"}`} style={{ left: `${percentageForDate(milestone.targetDate, visibleStart, visibleEnd)}%` }}><Flag className="size-2 -rotate-45" aria-hidden="true" /><span className="sr-only">Milestone: {milestone.title}</span></span>)}</div>;
}
