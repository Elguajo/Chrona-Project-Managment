# Phase 05 — List and Project Workspace

## Goal

Provide a sortable portfolio table plus a drawer and full Project workspace for inspection, editing, and lightweight execution.

## In scope

- Sortable List columns, shared search/filters, and compact responsive transformations.
- Project side drawer, quick edits, calculated metrics, links, activity, and `/projects/[id]` overview/timeline/links/activity route.
- Local Task CRUD and ordering, dated Milestone CRUD, local text Document CRUD, and Project templates without accounts, collaboration, or external sync.
- Accessible interaction and drawer-to-full-screen-sheet responsive behaviour.

## Out of scope

- Comments, task dependencies/subtasks, arbitrary files/integrations, collaboration, and custom fields.

## Tasks

- [x] Implement List projection and sorting from shared Project records.
- [x] Implement Project Drawer and full detail route.
- [x] Wire quick edits, links, activity, and consistent metric presentation.
- [x] Implement validated Task, Milestone, and Document workspace commands and their accessible controls.
- [x] Verify create/edit/move/progress transitions across all views.

## Acceptance criteria

- [x] List columns are sortable and show the same persisted values as Kanban and Timeline.
- [x] A project opened from any portfolio view has a usable drawer and full detail route.
- [x] Quick edits, links, and activity persist and are reflected in all projections.
- [x] Keyboard escape/focus and responsive drawer behaviour are usable.
- [x] A Task, Milestone, and Document added in a Project workspace survive reload and never appear under another Project.

## Verification

- Focused UI/domain tests, accessibility checks, type check, lint, build, and local cross-view smoke test.

## Progress Record

Implemented early: 2026-09-03

- The List projects the same Project records with search, status/type/priority filters, sortable columns, Task completion counts, and the shared Project drawer/workspace.
- The Project workspace supports local Task, Milestone, and Document mutation, but the standalone `/projects/[id]` route remains pending.

Implemented: 2026-09-04

- `/projects/[id]` reads the same Project aggregate as List, Kanban, Timeline, and the drawer; it adds no view-owned records.
- The route presents status, dates, Work Progress, derived Time Progress, project schedule/milestones, links, Task/Milestone/Document controls, and activity.
- Project and workspace server actions revalidate both the portfolio and the owning standalone route. Domain coverage verifies the standalone aggregate's ownership and activity; production HTTP smoke rendered the portfolio, populated workspace route, and missing-project 404 against a fresh temporary SQLite database.
- Real-browser drawer smoke completed 2026-09-04 in Edge: Escape closes the native modal and returns focus to the triggering Timeline Project button on desktop and at 375px. The mobile drawer is a full-screen sheet with a single internal scroll container; the prior nested native-dialog scrollbar was removed.
- A local Microsoft Edge browser run against an isolated temporary SQLite database verified Project, Status, Deadline, Work, and Updated columns in both sort directions, with values matching the shared Project records used by Kanban and Timeline.
