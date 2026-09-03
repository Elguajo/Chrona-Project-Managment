import type { ProjectRecord } from "@/lib/projects/types";

export type TimelineScale = "month" | "quarter";

const DAY_MS = 24 * 60 * 60 * 1_000;

function utcDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addCalendarDays(value: string, days: number) {
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

export function daysBetween(start: string, end: string) {
  return Math.round((utcDate(end).getTime() - utcDate(start).getTime()) / DAY_MS);
}

export function periodFor(anchor: string, scale: TimelineScale) {
  const date = utcDate(anchor);
  const month = scale === "month" ? date.getUTCMonth() : Math.floor(date.getUTCMonth() / 3) * 3;
  const start = new Date(Date.UTC(date.getUTCFullYear(), month, 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), month + (scale === "month" ? 1 : 3), 0));
  return { start: dateKey(start), end: dateKey(end) };
}

export function shiftPeriod(anchor: string, scale: TimelineScale, direction: -1 | 1) {
  const date = utcDate(anchor);
  date.setUTCMonth(date.getUTCMonth() + direction * (scale === "month" ? 1 : 3));
  return dateKey(date);
}

export function dateRange(start: string, end: string) {
  const days = daysBetween(start, end);
  return Array.from({ length: days + 1 }, (_, index) => addCalendarDays(start, index));
}

export type TimelineMetrics = {
  elapsedDays: number;
  remainingDays: number | null;
  timeProgress: number | null;
  overdueDays: number;
  label: string;
};

export type TimelineProject = {
  displayStart: string;
  displayEnd: string;
  overdueStart: string | null;
  metrics: TimelineMetrics;
};

function timestampDate(value: string | null) {
  return value ? value.slice(0, 10) : null;
}

/**
 * Produces one visual range for a Project. Calendar dates stay date-only;
 * completion/cancellation timestamps terminate a range but never become an
 * independent time zone conversion source.
 */
export function timelineProject(project: ProjectRecord, today = localToday()): TimelineProject | null {
  if (!project.startDate) return null;
  const terminalDate = project.status === "completed"
    ? timestampDate(project.completedAt)
    : project.status === "cancelled"
      ? timestampDate(project.cancelledAt)
      : null;
  const active = !terminalDate;
  const defaultEnd = terminalDate ?? (project.deadline && project.deadline > today ? project.deadline : today);
  const displayEnd = defaultEnd < project.startDate ? project.startDate : defaultEnd;
  const elapsedEnd = terminalDate ?? today;
  const elapsedDays = Math.max(0, daysBetween(project.startDate, elapsedEnd));
  const plannedDays = project.deadline ? Math.max(0, daysBetween(project.startDate, project.deadline)) : null;
  const overdueDays = active && project.deadline && today > project.deadline ? daysBetween(project.deadline, today) : 0;
  const remainingDays = active && project.deadline && today <= project.deadline ? daysBetween(today, project.deadline) : null;
  const timeProgress = plannedDays && plannedDays > 0 ? Math.min(100, Math.round((elapsedDays / plannedDays) * 100)) : null;
  const label = overdueDays > 0
    ? `Overdue by ${overdueDays}d`
    : terminalDate && project.deadline
      ? terminalDate > project.deadline
        ? `Completed ${daysBetween(project.deadline, terminalDate)}d late`
        : `Completed ${daysBetween(terminalDate, project.deadline)}d early`
      : remainingDays !== null
        ? `${remainingDays}d remaining`
        : `Active for ${elapsedDays}d`;

  return {
    displayStart: project.startDate,
    displayEnd,
    overdueStart: overdueDays > 0 ? project.deadline : null,
    metrics: { elapsedDays, remainingDays, timeProgress, overdueDays, label },
  };
}

export function percentageForDate(date: string, visibleStart: string, visibleEnd: string) {
  const totalDays = Math.max(1, daysBetween(visibleStart, visibleEnd) + 1);
  return (daysBetween(visibleStart, date) / totalDays) * 100;
}

export function clippedRange(start: string, end: string, visibleStart: string, visibleEnd: string) {
  if (end < visibleStart || start > visibleEnd) return null;
  const totalDays = Math.max(1, daysBetween(visibleStart, visibleEnd) + 1);
  const clippedStart = start < visibleStart ? visibleStart : start;
  const clippedEnd = end > visibleEnd ? visibleEnd : end;
  return {
    left: percentageForDate(clippedStart, visibleStart, visibleEnd),
    width: Math.max((daysBetween(clippedStart, clippedEnd) + 1) / totalDays * 100, 0.9),
  };
}
