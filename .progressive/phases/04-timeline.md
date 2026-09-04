# Phase 04 — Timeline and Milestones

## Goal

Render the Project portfolio as correct month/quarter time ranges without a day-by-project DOM grid.

## In scope

- Month and Quarter navigation, local Today line, sticky calendar header/project column, horizontal scrolling, grouping, and filtering.
- Mathematically positioned project bars, unscheduled group, deadline, overdue, no-deadline, completed, cancelled, and time metrics.
- Dated Milestone annotations for a Project without turning Milestones into independent Timeline rows.
- Cross-view read consistency and tests for date semantics.

## Out of scope

- Task rendering, dependencies, drag-resizing, day scale, and custom calendar rules.

## Tasks

- [x] Implement a tested date/range and metrics domain utility from ADR-003.
- [x] Implement Timeline projection and positioned bars from shared Project records.
- [x] Add tested Milestone annotations to the owning Project bar/details.
- [x] Add navigation, filters, and responsive overflow handling. Grouping remains intentionally limited to the default ungrouped portfolio view.
- [x] Verify the specified timeline and cross-view scenarios.

## Acceptance criteria

- [x] Bars, Today, elapsed, remaining, and time progress are correct for supported ranges.
- [x] No-deadline projects grow to Today; overdue projects are distinct; completed/cancelled projects end correctly.
- [x] Filters work and switching views neither duplicates nor loses project state.
- [x] Approximately 500 projects remain responsive without a cell-per-day-per-project grid.

## Verification

- Deterministic date tests, Timeline interaction/runtime checks, type check, lint, build, and local visual smoke test.

## Progress Record

Implemented: 2026-09-03

Delivered:

- A Month/Quarter Timeline over the shared Project records with previous/next/Today navigation, date-only calendar math, filters, horizontal overflow, a sticky date header/project column, and an unscheduled group.
- One mathematically positioned bar per scheduled Project rather than a day-by-project DOM grid; active, terminal, no-deadline, and overdue ranges have distinct derived behaviour.
- Milestone diamonds drawn only on their owning Project range, using the related Project Milestone records.

Observed verification:

- `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed. Domain coverage includes Month/Quarter ranges, navigation, range clipping, and overdue calculation.

Remaining verification:

Completed 2026-09-04 in a real local Edge session backed by an isolated SQLite database with 508 realistic Projects. Month and Quarter, Previous/Next/Today, status/type filters, a 730px horizontal scroll, two Today markers, and the visual density of 509 Timeline rows were exercised. The browser showed 30 Month / 92 Quarter date headers and one positioned Project row/bar per record, rather than a cell-per-day-per-project grid. No browser console errors were observed.
