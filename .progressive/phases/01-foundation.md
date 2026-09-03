# Phase 01 — Foundation

## Goal

Create a locally runnable application shell with a migrated, reachable SQLite database and no external service dependency.

## Context

Use ADR-001, ADR-002, and ADR-003. This phase establishes the executable baseline only; it does not implement project CRUD or any view’s product behaviour.

## Context hints

- Load `docs/source/LOCAL_PROJECT_OS_FINAL_SPEC_v2.md` only when a source requirement is unclear or conflicts with durable project state.
- Review reference notes before visual implementation; a note is not scope approval.

## In scope

- Bootstrap Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui using current compatible primary documentation.
- Establish local application shell, dark visual foundations, navigation placeholders, and persisted settings access.
- Configure Drizzle schema/migrations, the local SQLite connection, and a repeatable empty-database initialization check.
- Establish application error boundaries and the server/client data-access boundary.

## Out of scope

- Project CRUD, product views, backup/import, authentication, remote services, and native desktop packaging.

## Tasks

- [x] Bootstrap the local runtime and package scripts with current supported dependencies.
- [x] Add the database configuration, migration workflow, and local data-directory handling.
- [x] Build the app shell and settings boundary without implementing product views.
- [x] Add focused checks for startup, migration, and database connectivity.

## Acceptance criteria

- [x] The application starts locally without internet or external credentials.
- [x] A new local database initializes through versioned migrations and remains available after restart.
- [x] The app shell renders with no authentication screen or remote backend dependency.
- [x] Foundation validation commands are documented and pass with observed evidence.

## Negative / security cases

- No browser component directly opens the SQLite database.
- Failure to initialize the local database produces an actionable error, not a false-ready dashboard.

## Verification

- Focused startup and database-initialization checks.
- Type check, lint, build, and a local runtime smoke check according to the Quality Protocol.

## Completion Record

Completed: 2026-09-03

Delivered:

- Next.js 16 App Router, TypeScript, Tailwind CSS, and initialized shadcn/ui foundation.
- Server-only Drizzle + `better-sqlite3` connection at `data/project-os.db`, with a committed settings migration and seeded local defaults.
- Dark single-owner app shell, disabled view placeholders, persisted settings read boundary, and actionable error boundaries.
- Local commands documented in `README.md` for migration, development, production start, and validation.

Observed verification:

- `pnpm check:database` creates a fresh temporary database through the committed migration and verifies the three seeded settings.
- `pnpm db:migrate` completed twice against `data/project-os.db`; the persisted settings were readable after the second run.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed.
- A production `next start` smoke request rendered the Foundation shell at `http://127.0.0.1:3100`.
- A deliberate unwritable data-directory startup returned HTTP 500 rather than a ready dashboard.
