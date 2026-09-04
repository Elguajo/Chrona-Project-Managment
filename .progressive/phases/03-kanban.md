# Phase 03 — Kanban

## Goal

Show each Project in exactly one lifecycle column and persist accessible status moves and manual ordering.

## In scope

- Default status columns, counts, compact project cards, search/filter integration, and drawer opening.
- Drag-and-drop status moves and a keyboard/accessibility-compatible `Move to…` action.
- Fractional/manual persisted ordering within columns and optimistic rollback on failed persistence.

## Out of scope

- Timeline rendering, List/Details implementation, custom statuses, and task-level boards.

## Tasks

- [x] Implement Kanban read model and columns from shared Project records.
- [x] Implement status movement, order persistence, history/activity effects, and rollback behaviour.
- [x] Provide the non-drag interaction and keyboard/focus behaviour.
- [x] Add cross-view persistence tests for movement and ordering.

## Acceptance criteria

- [x] Each Project occurs in exactly one default column and counts stay correct.
- [x] Drag and `Move to…` persist status; completing/reopening maintains lifecycle timestamps.
- [x] Manual order, search, filters, and status effects survive reload.
- [x] Kanban changes become visible to later Timeline/List projections without duplicate data.

## Verification

- Focused domain/UI tests, accessibility keyboard checks, type check, lint, build, and local Kanban smoke test.

## Progress Record

Implemented: 2026-09-03

Delivered:

- A Kanban projection over the existing Project records, with all seven default lifecycle columns, accurate filtered/unfiltered counts, compact cards, search and priority/type filters, and a project editor drawer.
- A shared transactional `moveProject` domain command that validates target state, writes fractional `sortOrder` values (with precision-triggered compaction), updates lifecycle timestamps, and appends status history/activity without introducing a Kanban-specific table or model.
- Native HTML drag-and-drop for card movement/reordering plus a labelled native `Move to…` select for keyboard and assistive-technology access. The UI updates optimistically and restores the prior board on a failed server action.
- Focused persistence coverage for all lifecycle columns, ordering, completion/reopening timestamps, history/activity, archived visibility, and the shared Kanban read projection.

Observed verification:

- `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed.
- A production runtime smoke rendered the seven columns, a temporary Project card, and its `Move to…` control from a temporary SQLite database.
- Accessibility review verified semantic controls, logical focusable controls, the native modal drawer with Escape/close affordances, live mutation feedback, and visible focus styling by source/runtime markup inspection.

Completed browser verification: 2026-09-04

- A production Next.js server backed by an isolated temporary SQLite database with realistic fixtures was exercised in local Microsoft Edge through Playwright Core, using the system Edge executable rather than downloading Chromium.
- Native pointer drags emitted observed HTML5 `dragstart` and `drop` events for same-column reorder and a cross-column status move. Both persisted through reload.
- The native `Move to…` control completed and then reopened a Project through reload. The temporary database recorded `completedAt` on completion, cleared it on reopening, and retained both lifecycle history entries.
- Browser console errors were empty after the interaction suite.
