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
- [ ] Implement Project Drawer and full detail route.
- [ ] Wire quick edits, links, activity, and consistent metric presentation.
- [ ] Implement validated Task, Milestone, and Document workspace commands and their accessible controls.
- [ ] Verify create/edit/move/progress transitions across all views.

## Acceptance criteria

- [ ] List columns are sortable and show the same persisted values as Kanban and Timeline.
- [ ] A project opened from any view has a usable drawer and full detail route.
- [ ] Quick edits, links, and activity persist and are reflected in all projections.
- [ ] Keyboard escape/focus and responsive drawer behaviour are usable.
- [ ] A Task, Milestone, and Document added in a Project workspace survive reload and never appear under another Project.

## Verification

- Focused UI/domain tests, accessibility checks, type check, lint, build, and local cross-view smoke test.

## Progress Record

Implemented early: 2026-09-03

- The List projects the same Project records with search, status/type/priority filters, sortable columns, Task completion counts, and the shared Project drawer/workspace.
- The Project workspace supports local Task, Milestone, and Document mutation, but the standalone `/projects/[id]` route remains pending.
