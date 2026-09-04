"use client";

import { ChevronLeft, ChevronRight, Clock3, Flag, Search, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent, type SetStateAction, type WheelEvent } from "react";

import { ProjectDrawer } from "@/components/projects/kanban-board";
import { Button } from "@/components/ui/button";
import { clippedRange, localToday, percentageForDate, timelineProject } from "@/lib/timeline/date";
import {
  TIMELINE_RANGE_BUFFER_DAYS,
  clampPixelsPerDay,
  extendTimelineRange,
  fitTimelineViewport,
  shiftTimelineCenter,
  timelineDateAtOffset,
  timelineDatesInView,
  timelineOffsetForDate,
  timelineRangeForDates,
  timelineRangeWidth,
  timelineTickDates,
  timelineTickMode,
  zoomScrollLeft,
  type TimelineRange,
  type TimelineViewportState,
} from "@/lib/timeline/viewport";
import { PROJECT_STATUSES, PROJECT_TYPES, type ProjectRecord } from "@/lib/projects/types";

const LABEL_WIDTH = 288;
const PAN_THRESHOLD = 4;

type TimelineProps = {
  projects: ProjectRecord[];
  viewport: TimelineViewportState;
  onViewportChange: Dispatch<SetStateAction<TimelineViewportState>>;
};

type PanState = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
} | null;

function displayLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(date: string, mode: ReturnType<typeof timelineTickMode>) {
  const value = new Date(`${date}T00:00:00Z`);
  if (mode === "day") return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", timeZone: "UTC" }).format(value);
  if (mode === "week") return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(value);
  const quarter = Math.floor(value.getUTCMonth() / 3) + 1;
  return value.getUTCMonth() % 3 === 0
    ? `Q${quarter} ${value.getUTCFullYear()}`
    : new Intl.DateTimeFormat(undefined, { month: "short", timeZone: "UTC" }).format(value);
}

function visiblePeriodLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function Timeline({ projects, viewport, onViewportChange }: TimelineProps) {
  const today = localToday();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(1);
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [restoreNonce, setRestoreNonce] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<PanState>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollLeftRef = useRef<number | null>(null);
  const pendingStartExpansionRef = useRef(0);
  const drawerScrollLeftRef = useRef<number | null>(null);
  const restoreViewportRef = useRef(true);
  const skipRestoreRef = useRef(false);
  const edgeExpansionRef = useRef<"start" | "end" | null>(null);

  const scheduledProjectDates = useMemo(() => projects
    .filter((project) => !project.archivedAt)
    .flatMap((project) => {
      const timeline = timelineProject(project, today);
      return timeline ? [timeline.displayStart, timeline.displayEnd] : [];
    }), [projects, today]);
  const [range, setRange] = useState<TimelineRange>(() => timelineRangeForDates(scheduledProjectDates, today));
  const rows = useMemo(() => {
    const lowered = query.trim().toLocaleLowerCase();
    return projects.filter((project) => !project.archivedAt).filter((project) => {
      const haystack = [project.name, project.clientName, project.description, ...project.tags].filter(Boolean).join(" ").toLocaleLowerCase();
      return (!lowered || haystack.includes(lowered)) && (!status || project.status === status) && (!type || project.type === type);
    });
  }, [projects, query, status, type]);
  const scheduled = rows.map((project) => ({ project, timeline: timelineProject(project, today) })).filter((item): item is { project: ProjectRecord; timeline: NonNullable<ReturnType<typeof timelineProject>> } => Boolean(item.timeline));
  const unscheduled = rows.filter((project) => !project.startDate);
  const canvasWidth = timelineRangeWidth(range, viewport.pixelsPerDay);
  const tickMode = timelineTickMode(viewport.pixelsPerDay);
  const visibleDates = useMemo(() => timelineDatesInView(range, scrollLeft, timelineViewportWidth, viewport.pixelsPerDay), [range, scrollLeft, timelineViewportWidth, viewport.pixelsPerDay]);
  const tickDates = useMemo(() => timelineTickDates(visibleDates.start, visibleDates.end, tickMode), [visibleDates, tickMode]);

  useEffect(() => {
    setRange((current) => {
      const next = timelineRangeForDates(scheduledProjectDates, today, 0);
      if (next.start >= current.start && next.end <= current.end) return current;
      const start = next.start < current.start ? timelineRangeForDates([next.start], today, TIMELINE_RANGE_BUFFER_DAYS).start : current.start;
      const end = next.end > current.end ? timelineRangeForDates([next.end], today, TIMELINE_RANGE_BUFFER_DAYS).end : current.end;
      if (start !== current.start) pendingStartExpansionRef.current += timelineOffsetForDate(current.start, start, viewport.pixelsPerDay);
      return { start, end };
    });
  }, [scheduledProjectDates, today, viewport.pixelsPerDay]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => setTimelineViewportWidth(Math.max(1, scroller.clientWidth - LABEL_WIDTH));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    if (scrollCommitTimerRef.current) clearTimeout(scrollCommitTimerRef.current);
  }, []);

  useEffect(() => {
    const releaseSpace = () => setSpacePressed(false);
    window.addEventListener("keyup", releaseSpace);
    return () => window.removeEventListener("keyup", releaseSpace);
  }, []);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || timelineViewportWidth < 2) return;
    if (pendingStartExpansionRef.current > 0) {
      scroller.scrollLeft += pendingStartExpansionRef.current;
      pendingStartExpansionRef.current = 0;
      edgeExpansionRef.current = null;
      return;
    }
    if (edgeExpansionRef.current === "end") {
      edgeExpansionRef.current = null;
    }
    if (pendingScrollLeftRef.current !== null) {
      scroller.scrollLeft = pendingScrollLeftRef.current;
      pendingScrollLeftRef.current = null;
      return;
    }
    if (restoreViewportRef.current && !skipRestoreRef.current) {
      scroller.scrollLeft = Math.max(0, timelineOffsetForDate(viewport.centerDate, range.start, viewport.pixelsPerDay) - timelineViewportWidth / 2);
      restoreViewportRef.current = false;
    }
    skipRestoreRef.current = false;
  }, [range, restoreNonce, timelineViewportWidth, viewport.centerDate, viewport.pixelsPerDay]);

  function setCenteredViewport(next: TimelineViewportState) {
    skipRestoreRef.current = false;
    restoreViewportRef.current = true;
    setRestoreNonce((current) => current + 1);
    onViewportChange(next);
  }

  function commitCenter(nextScrollLeft: number) {
    const centerDate = timelineDateAtOffset(range.start, nextScrollLeft + timelineViewportWidth / 2, viewport.pixelsPerDay);
    skipRestoreRef.current = true;
    onViewportChange((current) => current.centerDate === centerDate ? current : { ...current, centerDate });
  }

  function scheduleScrollState(nextScrollLeft: number) {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      setScrollLeft(nextScrollLeft);
      scrollFrameRef.current = null;
    });
    if (scrollCommitTimerRef.current) clearTimeout(scrollCommitTimerRef.current);
    scrollCommitTimerRef.current = setTimeout(() => commitCenter(nextScrollLeft), 150);
  }

  function maybeExtendRange(nextScrollLeft: number) {
    const edgeThreshold = Math.max(timelineViewportWidth * 0.25, viewport.pixelsPerDay * 30);
    if (nextScrollLeft < edgeThreshold && edgeExpansionRef.current === null) {
      edgeExpansionRef.current = "start";
      pendingStartExpansionRef.current += TIMELINE_RANGE_BUFFER_DAYS * viewport.pixelsPerDay;
      setRange((current) => extendTimelineRange(current, "start"));
      return;
    }
    if (nextScrollLeft + timelineViewportWidth > canvasWidth - edgeThreshold && edgeExpansionRef.current === null) {
      edgeExpansionRef.current = "end";
      setRange((current) => extendTimelineRange(current, "end"));
    }
  }

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const nextScrollLeft = scroller.scrollLeft;
    scheduleScrollState(nextScrollLeft);
    maybeExtendRange(nextScrollLeft);
  }

  function zoomAt(pointerOffset: number, nextPixelsPerDay: number) {
    const next = clampPixelsPerDay(nextPixelsPerDay);
    if (next === viewport.pixelsPerDay) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const nextScrollLeft = zoomScrollLeft({
      start: range.start,
      scrollLeft: scroller.scrollLeft,
      pointerOffset,
      previousPixelsPerDay: viewport.pixelsPerDay,
      nextPixelsPerDay: next,
    });
    pendingScrollLeftRef.current = nextScrollLeft;
    const centerDate = timelineDateAtOffset(range.start, nextScrollLeft + timelineViewportWidth / 2, next);
    onViewportChange({ centerDate, pixelsPerDay: next });
    setScrollLeft(nextScrollLeft);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.deltaY === 0) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    event.preventDefault();
    const pointerOffset = Math.max(0, Math.min(timelineViewportWidth, event.clientX - scroller.getBoundingClientRect().left - LABEL_WIDTH));
    zoomAt(pointerOffset, viewport.pixelsPerDay * Math.exp(-event.deltaY * 0.002));
  }

  function isInteractiveTarget(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest("[data-timeline-interactive]"));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const canPan = event.pointerType === "mouse" && (event.button === 1 || (event.button === 0 && spacePressed));
    if (!canPan || isInteractiveTarget(event.target)) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: event.currentTarget.scrollLeft };
    setIsPanning(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const delta = event.clientX - pan.startX;
    if (Math.abs(delta) < PAN_THRESHOLD) return;
    event.currentTarget.scrollLeft = Math.max(0, pan.startScrollLeft - delta);
  }

  function endPan(event: PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    panRef.current = null;
    setIsPanning(false);
    commitCenter(event.currentTarget.scrollLeft);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.code !== "Space" || event.target !== event.currentTarget) return;
    event.preventDefault();
    setSpacePressed(true);
  }

  function captureDrawerScroll() {
    drawerScrollLeftRef.current = scrollerRef.current?.scrollLeft ?? null;
  }

  function openProject(projectId: string) {
    if (drawerScrollLeftRef.current === null) captureDrawerScroll();
    setEditingId(projectId);
  }

  function closeProjectDrawer() {
    setEditingId(null);
    const savedScrollLeft = drawerScrollLeftRef.current;
    drawerScrollLeftRef.current = null;
    if (savedScrollLeft === null) return;
    requestAnimationFrame(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      scroller.scrollLeft = savedScrollLeft;
      setScrollLeft(savedScrollLeft);
      commitCenter(savedScrollLeft);
    });
  }

  const visibleCenterDate = timelineDateAtOffset(range.start, scrollLeft + timelineViewportWidth / 2, viewport.pixelsPerDay);

  return (
    <section className="mt-8 flex min-h-[calc(100svh-17rem)] flex-col" aria-labelledby="timeline-title">
      <div className="flex flex-col gap-5 border-b pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Portfolio timing</p>
          <h2 id="timeline-title" className="mt-1 text-2xl font-semibold tracking-tight">Timeline</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Scroll to zoom. Pan with the middle button or Space + drag. Project ranges use date-only values.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Timeline navigation">
          <Button size="sm" variant="outline" onClick={() => setCenteredViewport({ ...viewport, centerDate: shiftTimelineCenter(viewport.centerDate, timelineViewportWidth, viewport.pixelsPerDay, -1) })}><ChevronLeft aria-hidden="true" /><span className="sr-only">Previous timeline range</span></Button>
          <Button size="sm" variant="outline" onClick={() => setCenteredViewport({ ...viewport, centerDate: today })}><Clock3 aria-hidden="true" />Today</Button>
          <Button size="sm" variant="outline" onClick={() => setCenteredViewport({ ...viewport, centerDate: shiftTimelineCenter(viewport.centerDate, timelineViewportWidth, viewport.pixelsPerDay, 1) })}><span className="sr-only">Next timeline range</span><ChevronRight aria-hidden="true" /></Button>
          <Button size="sm" variant="outline" aria-label="Zoom out" onClick={() => zoomAt(timelineViewportWidth / 2, viewport.pixelsPerDay / 1.25)}><ZoomOut aria-hidden="true" /></Button>
          <Button size="sm" variant="outline" aria-label="Zoom in" onClick={() => zoomAt(timelineViewportWidth / 2, viewport.pixelsPerDay * 1.25)}><ZoomIn aria-hidden="true" /></Button>
          <Button size="sm" variant="outline" onClick={() => setCenteredViewport(fitTimelineViewport(scheduledProjectDates, today, timelineViewportWidth))}>Fit projects</Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(16rem,1fr)_11rem_11rem]" aria-label="Timeline filters">
        <label className="relative block"><span className="sr-only">Search projects</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" aria-hidden="true" /><input className="field pl-9" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, clients, or tags" /></label>
        <label><span className="sr-only">Filter by status</span><select className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{PROJECT_STATUSES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></label>
        <label><span className="sr-only">Filter by project type</span><select className="field" value={type} onChange={(event) => setType(event.target.value)}><option value="">All types</option>{PROJECT_TYPES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></label>
      </div>

      <div
        ref={scrollerRef}
        className={`mt-6 min-h-0 flex-1 overflow-auto border select-none ${isPanning ? "cursor-grabbing" : spacePressed ? "cursor-grab" : "cursor-default"}`}
        tabIndex={0}
        aria-label={`Interactive ${visiblePeriodLabel(visibleCenterDate)} timeline`}
        onAuxClick={(event) => { if (event.button === 1) event.preventDefault(); }}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onScroll={handleScroll}
        onWheel={handleWheel}
      >
        <div className="grid grid-cols-[18rem_auto]" style={{ width: `${LABEL_WIDTH + canvasWidth}px` }}>
          <div className="sticky top-0 z-30 h-12 border-b border-r bg-[var(--background)] p-3 text-sm font-semibold">{visiblePeriodLabel(visibleCenterDate)}</div>
          <div className="sticky top-0 z-20 relative h-12 border-b bg-[var(--background)]" style={{ width: `${canvasWidth}px` }}>
            {tickDates.map((date) => {
              const left = timelineOffsetForDate(date, range.start, viewport.pixelsPerDay);
              return <time key={date} dateTime={date} className={`absolute inset-y-0 border-l px-1 pt-3 text-[10px] ${date === today ? "font-bold text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`} style={{ left: `${left}px` }}>{formatDate(date, tickMode)}</time>;
            })}
            <TodayLine left={timelineOffsetForDate(today, range.start, viewport.pixelsPerDay)} />
          </div>
          <div className="sticky left-0 z-10 border-r bg-[var(--background)]">
            {scheduled.map(({ project, timeline }) => <ProjectLabel key={project.id} project={project} metric={timeline.metrics.label} onPointerDown={captureDrawerScroll} onOpen={() => openProject(project.id)} />)}
          </div>
          <div className="relative" style={{ width: `${canvasWidth}px` }}>
            <TodayLine left={timelineOffsetForDate(today, range.start, viewport.pixelsPerDay)} />
            {scheduled.map(({ project, timeline }) => <TimelineRow key={project.id} project={project} timeline={timeline} visibleStart={range.start} visibleEnd={range.end} onPointerDown={captureDrawerScroll} onOpen={() => openProject(project.id)} />)}
          </div>
        </div>
      </div>

      {unscheduled.length > 0 && <section className="mt-5 border p-4" aria-labelledby="unscheduled-title"><h3 id="unscheduled-title" className="font-semibold">Unscheduled ({unscheduled.length})</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">These projects need a start date before they receive a timeline range.</p><div className="mt-3 flex flex-wrap gap-2">{unscheduled.map((project) => <Button key={project.id} size="sm" variant="outline" onClick={() => openProject(project.id)}>{project.name}</Button>)}</div></section>}
      {rows.length === 0 && <p className="mt-5 border border-dashed p-5 text-sm text-[var(--muted-foreground)]">No projects match these filters.</p>}
      <ProjectDrawer open={editingId !== null} project={projects.find((project) => project.id === editingId) ?? null} onClose={closeProjectDrawer} />
    </section>
  );
}

function TodayLine({ left }: { left: number }) {
  return <span aria-label="Today" className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-[var(--destructive)]" style={{ left: `${left}px` }} />;
}

function ProjectLabel({ project, metric, onPointerDown, onOpen }: { project: ProjectRecord; metric: string; onPointerDown: () => void; onOpen: () => void }) {
  return <div className="flex h-20 flex-col justify-center border-b px-3"><button data-timeline-interactive type="button" className="truncate text-left text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ring)]" onPointerDown={onPointerDown} onClick={onOpen}>{project.name}</button><span className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{metric} · Work {project.workProgress}%</span></div>;
}

function TimelineRow({ project, timeline, visibleStart, visibleEnd, onPointerDown, onOpen }: { project: ProjectRecord; timeline: NonNullable<ReturnType<typeof timelineProject>>; visibleStart: string; visibleEnd: string; onPointerDown: () => void; onOpen: () => void }) {
  const range = clippedRange(timeline.displayStart, timeline.displayEnd, visibleStart, visibleEnd);
  const overdue = timeline.overdueStart ? clippedRange(timeline.overdueStart, timeline.displayEnd, visibleStart, visibleEnd) : null;
  return <div className="relative h-20 border-b"><div className="absolute inset-x-0 top-1/2 border-t border-dashed" />{range && <button data-timeline-interactive type="button" className={`absolute top-[calc(50%-0.85rem)] h-7 rounded text-left ${timeline.metrics.overdueDays > 0 ? "bg-amber-500" : project.status === "completed" ? "bg-teal-600" : project.status === "cancelled" ? "bg-rose-500" : "bg-emerald-600"}`} style={{ left: `${range.left}%`, width: `${range.width}%` }} title={`${project.name}: ${timeline.metrics.label}`} aria-label={`Open ${project.name}`} onPointerDown={onPointerDown} onClick={onOpen}><span className="block truncate px-2 py-1 text-xs font-medium text-white">{project.name}</span></button>}{overdue && <div className="pointer-events-none absolute top-[calc(50%-0.85rem)] h-7 rounded-r bg-[var(--destructive)]/70" style={{ left: `${overdue.left}%`, width: `${overdue.width}%` }} aria-label={timeline.metrics.label} />}{project.milestones.filter((milestone) => milestone.targetDate >= visibleStart && milestone.targetDate <= visibleEnd).map((milestone) => <span key={milestone.id} title={`${milestone.title} · ${milestone.targetDate}`} className={`pointer-events-none absolute top-2 z-10 grid size-4 -translate-x-1/2 rotate-45 place-items-center border ${milestone.completedAt ? "bg-emerald-600" : "bg-[var(--background)]"}`} style={{ left: `${percentageForDate(milestone.targetDate, visibleStart, visibleEnd)}%` }}><Flag className="size-2 -rotate-45" aria-hidden="true" /><span className="sr-only">Milestone: {milestone.title}</span></span>)}</div>;
}
