# Project Brief — Local Project OS

## Outcome

Deliver a local-first visual Project OS for one owner. On opening the dashboard, the owner can understand the projects that exist, their current state, timing, deadlines, overlaps, and required attention in 5–10 seconds, then work inside a project without leaving its local workspace.

## Users and jobs

- Primary user: one local owner; no other user roles exist in V1.
- Core jobs: see one project portfolio by state and calendar time; maintain projects; move them through their lifecycle; inspect the same project through Timeline, Kanban, List, and Details; and keep a portable local backup.

## Must-have scope

- One portfolio-level `Project` entity and its links, tags, status history, activity, Tasks, Milestones, Documents, templates, and local settings.
- Synchronized Timeline (when), Kanban (state), List (data), and Project Details (context) views.
- A project workspace for lightweight Tasks, dated Milestones, and local text Documents. These records belong to a Project; they are not a second portfolio or a collaborative work-management product.
- Local project CRUD, archive/restore, confirmed permanent delete, search, filters, sorting, and persisted ordering.
- Month and Quarter Timeline with local Today line, calculated time metrics, deadline/overdue/completed/cancelled behaviour, and unscheduled projects.
- Kanban status moves by drag-and-drop and an accessible `Move to…` alternative.
- JSON export/import with validation before replacement; local cover assets where used.

## Explicit constraints

- Local-first, offline-capable core behaviour; no core cloud service or remote database dependency.
- Exactly one user. Do not build authentication, accounts, roles, teams, organizations, workspaces, permissions, or RLS in V1.
- SQLite with Drizzle ORM and migrations; primary database path is `data/project-os.db`.
- Timeline, Kanban, and List are projections of the same Project records—never view-specific copies. Tasks, Milestones, and Documents are related Project records, never independent portfolio records.
- Calendar dates are date-only values; `Today` comes from the local system date and is never persisted.
- V1 prioritizes desktop (1280+) and laptop (1024+) quality, with the responsive behaviours specified for tablet/mobile.
- Supplied references are evidence for analysis only. They cannot change product behaviour, data semantics, or scope without an explicit approved change.

## Material assumptions

- V1 runs as a local Node-hosted web application; native desktop packaging is not included unless separately approved.
- The owner controls the local machine and database, but application inputs—including imports—still require validation.
- The initial target is approximately 500 projects; virtualized rendering is deferred until evidence requires it.

## Ubiquitous Language

- **Project** — the sole portfolio-level unit represented across Timeline, Kanban, and List. Source: ADR-002.
- **Task** — a lightweight, local action owned by exactly one Project. It has a title, optional detail/due date, status, manual order, and completion timestamp.
- **Milestone** — a dated checkpoint owned by exactly one Project; it may be open or completed.
- **Document** — a local text note owned by exactly one Project. External references remain Project links.
- **Timeline** — time projection of Projects answering when they exist, overlap, end, or need attention.
- **Kanban** — status projection of Projects, arranged by the default lifecycle columns.
- **List** — sortable data projection of Projects.
- **Work Progress** — owner-entered completion estimate (0–100), independent from Time Progress.
- **Time Progress** — calculated elapsed/planned-duration ratio; it never replaces Work Progress.
- **Calendar date** — date-only `YYYY-MM-DD` value with no timezone conversion. Source: ADR-003.

## Out of scope — first release

- Users, login, teams, organizations, permissions, billing, CRM, invoicing, chat/comments, AI/MCP, collaboration, cloud sync, public sharing, or automatic third-party sync.
- Subtasks, task dependencies, task assignees, sprints, time tracking, resource allocation, arbitrary file uploads, custom fields/statuses/types, saved views, and project-health analytics.

## Success criteria

- The owner can create a project and see the same persisted record in all three synchronized views and Details after restart.
- Timeline positions and metrics correctly represent start, deadline, current date, completion, cancellation, and overdue state.
- Kanban moves and order persist; keyboard/accessibility alternatives work without drag-and-drop.
- Tasks, Milestones, and Documents persist within their Project, survive restart, and are removed atomically when their Project is permanently deleted.
- Core project operations and views work with no network connection or login.
- A valid exported backup can be restored; invalid imports are rejected before existing data is overwritten.

## Classification

- Planning depth: FULL — V1 crosses UI, persistence, date semantics, destructive lifecycle, and backup/import boundaries.
- Complexity: L
- Risk: Medium — local trusted owner reduces access-control risk; data integrity, import, and permanent deletion remain material.
