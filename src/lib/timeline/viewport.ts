import { addCalendarDays, dateRange, daysBetween } from "@/lib/timeline/date";

export const TIMELINE_MIN_PIXELS_PER_DAY = 3;
export const TIMELINE_MAX_PIXELS_PER_DAY = 96;
export const TIMELINE_DEFAULT_PIXELS_PER_DAY = 32;
export const TIMELINE_RANGE_BUFFER_DAYS = 365;

export type TimelineViewportState = {
  centerDate: string;
  pixelsPerDay: number;
};

export type TimelineRange = {
  start: string;
  end: string;
};

export type TimelineTickMode = "day" | "week" | "month";

export function clampPixelsPerDay(value: number) {
  return Math.min(TIMELINE_MAX_PIXELS_PER_DAY, Math.max(TIMELINE_MIN_PIXELS_PER_DAY, value));
}

export function timelineTickMode(pixelsPerDay: number): TimelineTickMode {
  if (pixelsPerDay >= 48) return "day";
  if (pixelsPerDay >= 12) return "week";
  return "month";
}

export function timelineOffsetForDate(date: string, start: string, pixelsPerDay: number) {
  return daysBetween(start, date) * pixelsPerDay;
}

export function timelineDateAtOffset(start: string, offset: number, pixelsPerDay: number) {
  return addCalendarDays(start, Math.round(offset / pixelsPerDay));
}

export function zoomScrollLeft({ start, scrollLeft, pointerOffset, previousPixelsPerDay, nextPixelsPerDay }: {
  start: string;
  scrollLeft: number;
  pointerOffset: number;
  previousPixelsPerDay: number;
  nextPixelsPerDay: number;
}) {
  const pointerDate = timelineDateAtOffset(start, scrollLeft + pointerOffset, previousPixelsPerDay);
  return Math.max(0, timelineOffsetForDate(pointerDate, start, nextPixelsPerDay) - pointerOffset);
}

export function timelineRangeForDates(dates: string[], today: string, bufferDays = TIMELINE_RANGE_BUFFER_DAYS): TimelineRange {
  const values = [...dates, today].sort();
  const start = values[0] ?? today;
  const end = values.at(-1) ?? today;
  return { start: addCalendarDays(start, -bufferDays), end: addCalendarDays(end, bufferDays) };
}

export function extendTimelineRange(range: TimelineRange, edge: "start" | "end", days = TIMELINE_RANGE_BUFFER_DAYS): TimelineRange {
  return edge === "start"
    ? { ...range, start: addCalendarDays(range.start, -days) }
    : { ...range, end: addCalendarDays(range.end, days) };
}

export function timelineRangeWidth(range: TimelineRange, pixelsPerDay: number) {
  return Math.max(1, (daysBetween(range.start, range.end) + 1) * pixelsPerDay);
}

export function shiftTimelineCenter(centerDate: string, viewportWidth: number, pixelsPerDay: number, direction: -1 | 1) {
  const days = Math.max(1, Math.round((viewportWidth / pixelsPerDay) * 0.8));
  return addCalendarDays(centerDate, days * direction);
}

export function fitTimelineViewport(dates: string[], today: string, viewportWidth: number): TimelineViewportState {
  const values = [...dates, today].sort();
  const start = values[0] ?? today;
  const end = values.at(-1) ?? today;
  const span = Math.max(14, daysBetween(start, end) + 15);
  return {
    centerDate: addCalendarDays(start, Math.round(span / 2)),
    pixelsPerDay: clampPixelsPerDay(viewportWidth / span),
  };
}

export function timelineDatesInView(range: TimelineRange, scrollLeft: number, viewportWidth: number, pixelsPerDay: number, bufferPixels = 160) {
  const width = timelineRangeWidth(range, pixelsPerDay);
  const startOffset = Math.max(0, scrollLeft - bufferPixels);
  const endOffset = Math.min(width, scrollLeft + viewportWidth + bufferPixels);
  return {
    start: timelineDateAtOffset(range.start, startOffset, pixelsPerDay),
    end: timelineDateAtOffset(range.start, endOffset, pixelsPerDay),
  };
}

export function timelineTickDates(start: string, end: string, mode: TimelineTickMode) {
  if (mode === "day") return dateRange(start, end);

  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (mode === "week") cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7));
  else cursor.setUTCDate(1);

  const result: string[] = [];
  while (cursor <= last) {
    result.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(cursor.getUTCDate()).padStart(2, "0")}`);
    if (mode === "week") cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
  }
  return result;
}
