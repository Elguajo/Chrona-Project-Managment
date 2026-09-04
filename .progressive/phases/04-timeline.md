# Phase 04 — Timeline and Milestones

## Goal

Render the Project portfolio in a continuous date viewport without a day-by-project DOM grid.

## In scope

- Continuous date viewport with wheel zoom, adaptive Day/Week/Month/Quarter labels, middle-button and Space-drag panning, local Today line, sticky calendar header/project column, horizontal scrolling, grouping, and filtering.
- Mathematically positioned project bars, unscheduled group, deadline, overdue, no-deadline, completed, cancelled, and time metrics.
- Dated Milestone annotations for a Project without turning Milestones into independent Timeline rows.
- Cross-view read consistency and tests for date semantics.

## Out of scope

- Task rendering, dependencies, drag-resizing of Project dates, custom calendar rules, and persisted Timeline viewport settings.

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

- A continuous Timeline viewport over shared Project records with a 3–96 px/day scale, cursor-anchored zoom, adaptive Day/Week/Month/Quarter labels, Previous/Next/Today/Fit controls, dynamic yearly range extension, filters, horizontal overflow, a sticky date header/project column, and an unscheduled group.
- One mathematically positioned bar per scheduled Project rather than a day-by-project DOM grid; active, terminal, no-deadline, and overdue ranges have distinct derived behaviour.
- Milestone diamonds drawn only on their owning Project range, using the related Project Milestone records.

Observed verification:

- `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed. Domain coverage includes viewport scale clamping, cursor-preserving zoom, adaptive tick thresholds, fit/navigation, range extension, clipping, and overdue calculation. A fresh temporary SQLite migration and production HTTP smoke (`/` 200, missing Project 404) also passed.

Completed 2026-09-04 in a real local browser session backed by an isolated SQLite database with 509 realistic Projects. Day, Week, and Month/Quarter density; Previous/Next/Today/Fit; status filtering; Today and overdue markers; Project drawer Escape/focus return; and viewport retention across Dashboard → Timeline were exercised. One positioned Project bar per record was rendered without a cell-per-day-per-project grid, and no browser console errors were observed. The available CUA runner cannot hold Space or drag with the middle mouse button, so those two native gesture paths remain unconfirmed browser-only behaviour.
