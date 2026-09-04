# Phase 07 — Personal Workflow Polish

## Goal

Make the local single-owner workspace faster to operate without adding collaboration, remote services, or AI automation.

## In scope

- Project templates that create local Project defaults and optional starter Tasks, Milestones, and Documents.
- Keyboard-first quick navigation and an Upcoming/Overdue dashboard derived from Project deadlines, Task due dates, and Milestones.
- Local search across Project names, Tasks, Milestones, Documents, tags, and links.

## Out of scope

- Accounts, teams, roles, AI/MCP, CRM, third-party integrations, cloud synchronization, notifications, and background services.

## Acceptance criteria

- A template creates only local records owned by the new Project.
- Upcoming and overdue information is derived from existing date-only fields and the local system date.
- Search never requires network access and does not disclose data outside the local process.

## Completion Record

Completed: 2026-09-04

- Templates were verified without change: a starter template created a local Project in one SQLite transaction with its Tasks, Milestones, and Documents all owned by the new Project. Browser Quick Add created a fixture Project with 4 Tasks, 3 Milestones, and 1 Document; database inspection confirmed every child `projectId` matched that new Project.
- Dashboard Upcoming and Overdue rows were verified without change. They derive solely from active Project deadlines, unfinished Task due dates, open Milestone target dates, and `localToday()` date-only comparison; no date is persisted as Today.
- Search had an uncovered gap: List, Kanban, and Timeline searched only top-level Project fields and tags. They now share an in-memory matcher over the complete locally loaded Project aggregate: Project fields, tags, links, Tasks, Milestones, and Documents. The matcher performs no I/O or network request.
- Local Microsoft Edge browser QA using Playwright Core and a fresh temporary `PROJECT_OS_DATA_DIR` observed three overdue and four upcoming rows for local `2026-09-04`; it found a Document in List, a Milestone in Kanban, and a link URL in Timeline. A browser-created template project closed the form successfully. No Edge console warnings or errors were observed.
- Final evidence: `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed. A fresh temporary `PROJECT_OS_DATA_DIR` completed `pnpm db:migrate`; production HTTP smoke rendered Dashboard/Upcoming/Overdue from `/` and returned valid backup JSON from `/api/backup`.
