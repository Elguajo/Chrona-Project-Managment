import type { ProjectRecord, ProjectStatus, TaskStatus } from "@/lib/projects/types";
import { addCalendarDays } from "@/lib/timeline/date";

export const CALENDAR_ITEM_KINDS = ["project", "task", "milestone"] as const;

export type CalendarItemKind = (typeof CALENDAR_ITEM_KINDS)[number];
export type CalendarView = "month" | "week";

export type CalendarItem = {
  id: string;
  kind: CalendarItemKind;
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  date: string;
  title: string;
  state: ProjectStatus | TaskStatus | "open";
};

export type CalendarFilters = {
  kind: CalendarItemKind | "";
  projectStatus: ProjectStatus | "";
  query: string;
};

type CalendarPeriod = { start: string; end: string };

function utcDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function weekdayIndex(date: string) {
  return (utcDate(date).getUTCDay() + 6) % 7;
}

function itemSortOrder(kind: CalendarItemKind) {
  return CALENDAR_ITEM_KINDS.indexOf(kind);
}

/**
 * Produces a portfolio agenda directly from durable Project relations. The
 * returned date strings are copied date-only values; no date is parsed in a
 * local timezone or persisted as a view-specific record.
 */
export function calendarItems(projects: ProjectRecord[]): CalendarItem[] {
  return projects
    .filter((project) => !project.archivedAt)
    .flatMap((project) => [
      ...(project.deadline ? [{
        id: `project-${project.id}`,
        kind: "project" as const,
        projectId: project.id,
        projectName: project.name,
        projectStatus: project.status as ProjectStatus,
        date: project.deadline,
        title: "Project deadline",
        state: project.status as ProjectStatus,
      }] : []),
      ...project.tasks
        .filter((task) => task.status !== "done" && task.dueDate)
        .map((task) => ({
          id: `task-${task.id}`,
          kind: "task" as const,
          projectId: project.id,
          projectName: project.name,
          projectStatus: project.status as ProjectStatus,
          date: task.dueDate!,
          title: task.title,
          state: task.status,
        })),
      ...project.milestones
        .filter((milestone) => !milestone.completedAt)
        .map((milestone) => ({
          id: `milestone-${milestone.id}`,
          kind: "milestone" as const,
          projectId: project.id,
          projectName: project.name,
          projectStatus: project.status as ProjectStatus,
          date: milestone.targetDate,
          title: milestone.title,
          state: "open" as const,
        })),
    ])
    .sort((left, right) => left.date.localeCompare(right.date)
      || itemSortOrder(left.kind) - itemSortOrder(right.kind)
      || left.projectName.localeCompare(right.projectName)
      || left.title.localeCompare(right.title));
}

export function filterCalendarItems(items: CalendarItem[], filters: CalendarFilters) {
  const query = filters.query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const haystack = [item.title, item.projectName, item.kind, item.projectStatus, item.state]
      .join(" ")
      .toLocaleLowerCase();
    return (!filters.kind || item.kind === filters.kind)
      && (!filters.projectStatus || item.projectStatus === filters.projectStatus)
      && (!query || haystack.includes(query));
  });
}

export function calendarPeriod(anchor: string, view: CalendarView): CalendarPeriod {
  if (view === "week") {
    const start = addCalendarDays(anchor, -weekdayIndex(anchor));
    return { start, end: addCalendarDays(start, 6) };
  }

  const date = utcDate(anchor);
  const first = dateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
  const last = dateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
  const start = addCalendarDays(first, -weekdayIndex(first));
  return { start, end: addCalendarDays(last, 6 - weekdayIndex(last)) };
}

export function shiftCalendarPeriod(anchor: string, view: CalendarView, direction: -1 | 1) {
  if (view === "week") return addCalendarDays(anchor, direction * 7);
  const current = utcDate(anchor);
  const targetMonth = current.getUTCMonth() + direction;
  const target = new Date(Date.UTC(current.getUTCFullYear(), targetMonth, 1));
  target.setUTCDate(Math.min(current.getUTCDate(), daysInMonth(target.getUTCFullYear(), target.getUTCMonth())));
  return dateKey(target);
}

export function calendarDates(period: CalendarPeriod) {
  const dates: string[] = [];
  for (let date = period.start; date <= period.end; date = addCalendarDays(date, 1)) dates.push(date);
  return dates;
}

export function isSameCalendarMonth(left: string, right: string) {
  return left.slice(0, 7) === right.slice(0, 7);
}

export function calendarDayNumber(date: string) {
  return utcDate(date).getUTCDate();
}

export function calendarPeriodLabel(anchor: string, view: CalendarView) {
  const date = utcDate(anchor);
  const options: Intl.DateTimeFormatOptions = view === "month"
    ? { month: "long", year: "numeric", timeZone: "UTC" }
    : { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };
  if (view === "month") return new Intl.DateTimeFormat(undefined, options).format(date);
  const period = calendarPeriod(anchor, view);
  return `${new Intl.DateTimeFormat(undefined, options).format(utcDate(period.start))} – ${new Intl.DateTimeFormat(undefined, options).format(utcDate(period.end))}`;
}
