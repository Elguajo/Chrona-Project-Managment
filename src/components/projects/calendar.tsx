"use client";

import { CalendarDays, ChevronLeft, ChevronRight, CircleDotDashed, Clock3, Flag, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ProjectDrawer } from "@/components/projects/kanban-board";
import { Button } from "@/components/ui/button";
import {
  CALENDAR_ITEM_KINDS,
  calendarDates,
  calendarDayNumber,
  calendarItems,
  calendarPeriod,
  calendarPeriodLabel,
  filterCalendarItems,
  isSameCalendarMonth,
  shiftCalendarPeriod,
  type CalendarItem,
  type CalendarItemKind,
  type CalendarView,
} from "@/lib/calendar/calendar";
import { PROJECT_STATUSES, type ProjectRecord, type ProjectStatus } from "@/lib/projects/types";
import { localToday } from "@/lib/timeline/date";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function displayLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function itemKindLabel(kind: CalendarItemKind) {
  return kind === "project" ? "Deadline" : displayLabel(kind);
}

export function ProjectCalendar({ projects }: { projects: ProjectRecord[] }) {
  const today = localToday();
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(today);
  const [kind, setKind] = useState<CalendarItemKind | "">("");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | "">("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set());
  const period = calendarPeriod(anchor, view);
  const dates = calendarDates(period);
  const items = useMemo(() => filterCalendarItems(calendarItems(projects), { kind, projectStatus, query }), [kind, projectStatus, projects, query]);
  const itemsByDate = useMemo(() => new Map(dates.map((date) => [date, items.filter((item) => item.date === date)])), [dates, items]);

  function changeView(nextView: CalendarView) {
    setView(nextView);
    setExpandedDates(new Set());
  }

  function move(direction: -1 | 1) {
    setAnchor(shiftCalendarPeriod(anchor, view, direction));
    setExpandedDates(new Set());
  }

  function toggleExpanded(date: string) {
    setExpandedDates((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  return <section className="mt-8" aria-labelledby="calendar-title">
    <div className="flex flex-col gap-5 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--accent)]">Portfolio agenda</p>
        <h2 id="calendar-title" className="mt-1 text-2xl font-semibold tracking-tight">Calendar</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Date-only deadlines, open tasks, and open milestones from their owning Projects.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Calendar navigation">
        <Button size="sm" variant="outline" onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /><span className="sr-only">Previous {view}</span></Button>
        <Button size="sm" variant="outline" onClick={() => { setAnchor(today); setExpandedDates(new Set()); }}><Clock3 aria-hidden="true" />Today</Button>
        <Button size="sm" variant="outline" onClick={() => move(1)}><span className="sr-only">Next {view}</span><ChevronRight aria-hidden="true" /></Button>
        <div className="ml-1 flex rounded border p-0.5" aria-label="Calendar view">
          {(["month", "week"] as const).map((value) => <Button key={value} type="button" size="sm" variant={view === value ? "default" : "ghost"} aria-pressed={view === value} onClick={() => changeView(value)}>{displayLabel(value)}</Button>)}
        </div>
      </div>
    </div>

    <div className="mt-5 grid gap-3 md:grid-cols-[minmax(16rem,1fr)_11rem_11rem]" aria-label="Calendar filters">
      <label className="relative block"><span className="sr-only">Search calendar</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" aria-hidden="true" /><input className="field pl-9" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or entries" /></label>
      <label><span className="sr-only">Filter by record type</span><select className="field" value={kind} onChange={(event) => setKind(event.target.value as CalendarItemKind | "")}><option value="">All record types</option>{CALENDAR_ITEM_KINDS.map((value) => <option key={value} value={value}>{itemKindLabel(value)}</option>)}</select></label>
      <label><span className="sr-only">Filter by project status</span><select className="field" value={projectStatus} onChange={(event) => setProjectStatus(event.target.value as ProjectStatus | "")}><option value="">All project statuses</option>{PROJECT_STATUSES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></label>
    </div>

    <div className="mt-6 overflow-x-auto border" tabIndex={0} aria-label={`${calendarPeriodLabel(anchor, view)} calendar`}>
      <div className="min-w-[52rem]">
        <div className="flex items-center justify-between border-b bg-[var(--muted)] px-4 py-3"><h3 className="font-semibold">{calendarPeriodLabel(anchor, view)}</h3><span className="text-xs text-[var(--muted-foreground)]">{items.length} matching {items.length === 1 ? "entry" : "entries"}</span></div>
        <div className="grid grid-cols-7 border-b bg-[var(--muted)] text-xs font-medium text-[var(--muted-foreground)]">{WEEKDAYS.map((day) => <div key={day} className="border-r px-3 py-2 last:border-r-0">{day}</div>)}</div>
        <div className="grid grid-cols-7">
          {dates.map((date) => <CalendarDay key={date} date={date} anchor={anchor} today={today} view={view} items={itemsByDate.get(date) ?? []} expanded={expandedDates.has(date)} onToggle={() => toggleExpanded(date)} onOpen={setEditingId} />)}
        </div>
      </div>
    </div>
    {items.length === 0 && <p className="mt-5 border border-dashed p-5 text-sm text-[var(--muted-foreground)]">No calendar entries match these filters.</p>}
    <ProjectDrawer open={editingId !== null} project={projects.find((project) => project.id === editingId) ?? null} onClose={() => setEditingId(null)} />
  </section>;
}

function CalendarDay({ date, anchor, today, view, items, expanded, onToggle, onOpen }: { date: string; anchor: string; today: string; view: CalendarView; items: CalendarItem[]; expanded: boolean; onToggle: () => void; onOpen: (projectId: string) => void }) {
  const limit = view === "month" ? 3 : 7;
  const visibleItems = expanded ? items : items.slice(0, limit);
  const muted = view === "month" && !isSameCalendarMonth(date, anchor);
  return <section className={`min-h-40 border-b border-r p-2 last:border-r-0 ${muted ? "bg-[var(--muted)]/50" : "bg-[var(--card)]"}`} aria-label={`${date}, ${items.length} calendar entries`}>
    <div className="flex items-center justify-between"><time dateTime={date} className={`grid size-7 place-items-center rounded-full text-sm font-medium ${date === today ? "bg-[var(--destructive)] text-white" : muted ? "text-[var(--muted-foreground)]" : ""}`}>{calendarDayNumber(date)}</time>{items.length > 0 && <span className="text-xs tabular-nums text-[var(--muted-foreground)]">{items.length}</span>}</div>
    {items.length === 0 ? <p className="mt-5 text-xs text-[var(--muted-foreground)]">No entries</p> : <ol className="mt-2 grid gap-1.5">{visibleItems.map((item) => <li key={item.id}><CalendarEntry item={item} today={today} onOpen={onOpen} /></li>)}</ol>}
    {items.length > limit && <Button type="button" variant="ghost" size="sm" className="mt-2 h-auto px-1 py-0 text-xs" aria-expanded={expanded} onClick={onToggle}>{expanded ? "Show fewer" : `Show ${items.length - limit} more`}</Button>}
  </section>;
}

function CalendarEntry({ item, today, onOpen }: { item: CalendarItem; today: string; onOpen: (projectId: string) => void }) {
  const Icon = item.kind === "project" ? CalendarDays : item.kind === "task" ? CircleDotDashed : Flag;
  const overdue = item.date < today;
  const state = item.kind === "project" ? displayLabel(item.state) : item.kind === "task" ? displayLabel(item.state) : "Open";
  const stateClass = item.kind === "project" && ["completed", "cancelled"].includes(item.state)
    ? "bg-[var(--muted)] text-[var(--muted-foreground)] line-through"
    : item.kind === "task" && item.state === "in_progress"
      ? "bg-violet-100 text-violet-900"
      : item.kind === "milestone"
        ? "bg-amber-100 text-amber-900"
        : "bg-sky-100 text-sky-900";
  return <button type="button" className={`w-full border-l-2 p-1.5 text-left text-xs hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] ${item.kind === "project" ? "border-sky-600" : item.kind === "task" ? "border-violet-600" : "border-amber-600"} ${overdue ? "bg-[var(--destructive)]/10" : ""}`} onClick={() => onOpen(item.projectId)} aria-label={`${itemKindLabel(item.kind)}: ${item.title}, ${item.projectName}, ${state}${overdue ? ", overdue" : ""}`}>
    <span className="flex items-center gap-1 font-medium"><Icon className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{item.title}</span></span>
    <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-[var(--muted-foreground)]"><span className="truncate">{item.projectName} · {itemKindLabel(item.kind)}</span><span className={`shrink-0 rounded px-1 ${stateClass}`}>{state}</span>{overdue && <span className="shrink-0 font-medium text-[var(--destructive)]">Overdue</span>}</span>
  </button>;
}
