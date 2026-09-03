# Phase 02 — Project Domain and CRUD

## Goal

Persist and safely manage the unified Project portfolio with its required relationships and lifecycle invariants.

## In scope

- Drizzle schema/migrations for projects, status history, links, tags, project tags, activity, and settings.
- Create, edit, archive, restore, and explicitly confirmed permanent-delete operations.
- Date, progress, lifecycle, status-history, and activity invariants in shared domain operations.
- Project form and local cover-asset handling where needed.

## Out of scope

- Kanban ordering/moves, Timeline rendering, List/Details view implementation, import/export, auth, and cloud services.

## Tasks

- [x] Implement the durable schema and migration tests.
- [x] Implement validated project commands and queries.
- [x] Implement project creation/editing and archive lifecycle UI.
- [x] Add focused persistence, reopening, validation, and deletion-confirmation tests.

## Acceptance criteria

- [x] A Project and its tags/links survive application restart without view-specific copies.
- [x] Invalid date ordering and work-progress values show errors and are not silently normalized.
- [x] Status transitions create history/activity and correctly set or clear completion/cancellation timestamps.
- [x] Archive/restore works; permanent delete is secondary, confirmed, and safely cascades related records.

## Verification

- Domain and migration tests; type check, lint, build, and local CRUD smoke test.

## Completion Record

Completed: 2026-09-03

Delivered:

- A versioned Drizzle migration for the unified `projects` table and status history, links, tags, project tags, activity, and settings relationships; project-owned relations use SQLite cascading deletes.
- Server-authoritative CRUD commands with strict calendar-date, enum, work-progress, URL, lifecycle, local-cover-image, archive/restore, and permanent-delete confirmation validation.
- A local project form and portfolio record surface for creating, editing, archiving, restoring, and explicitly deleting records. It does not implement Kanban movement, Timeline, or a full List view.
- Focused domain checks covering persistence, relations, invalid input rejection, completion/reopen history, archive lifecycle, confirmed deletion cascades, and local cover asset replacement/removal.

Observed verification:

- `pnpm db:generate` created `drizzle/0001_wandering_smiling_tiger.sql` from the committed schema.
- `pnpm test:domain` passed against a fresh temporary SQLite database.
- `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed.
- `pnpm db:migrate` applied the migration to the local database at `data/project-os.db`.
- A production `next start` smoke request at `http://127.0.0.1:3010` rendered the local-project form and records section.
