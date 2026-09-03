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
- [ ] Drag and `Move to…` persist status; completing/reopening maintains lifecycle timestamps. (Browser keyboard/drag smoke is pending because the local Playwright Chromium binary is unavailable.)
- [ ] Manual order, search, filters, and status effects survive reload. (Persistence and rendered controls are verified; browser interaction smoke is pending.)
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

Remaining verification:

- Browser-level keyboard operation of `Move to…`, focus return from the drawer, and native drag/drop could not run because the installed Playwright browser runner has no local Chromium executable. No browser download was performed.
