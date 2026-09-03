# Architecture — Local Project OS

## Recommended stack

- Runtime/framework: Node.js (current supported LTS at implementation time), Next.js 16 App Router, TypeScript.
- UI: Tailwind CSS, shadcn/ui, date-fns, dnd-kit. Add TanStack Virtual only if measured rendering pressure warrants it.
- Data/storage: SQLite file at `data/project-os.db`; Drizzle ORM and Drizzle Kit migrations; `better-sqlite3` driver in the Node runtime.
- Deployment/hosting: local Node process only in V1; no hosted backend or external provider is part of the core path.
- Important boundaries: Server Actions for validated commands; Route Handlers only where a browser file exchange is needed (for example export/import). Do not create a public API as a separate product surface.

## Why this fits

The App Router gives a local web application a clear server/client boundary while retaining interactive browser views. SQLite + Drizzle keeps data on the owner’s machine and gives V1 a migration discipline compatible with a later PostgreSQL transition. The driver choice keeps database access server-side and avoids an external service.

Next.js’s current installation guidance supports its App Router, TypeScript, Tailwind CSS, and local development workflow; its current documentation lists 16.3.4 and Node.js 20.9 as the minimum. Drizzle documents a native `better-sqlite3` adapter, and SQLite permits ISO-like text date storage. Exact dependency versions will be selected and verified in Phase 01, not pinned in this durable architecture document.

## System shape

```text
Local browser
  └─ Next.js UI
       ├─ Timeline / Kanban / List / Project Details projections
       ├─ local URL view/filter state and local settings
       └─ validated server commands and queries
            └─ project domain services
                 ├─ lifecycle, date, ordering, activity, Task, Milestone, and Document invariants
                 └─ Drizzle repositories
                      └─ SQLite: data/project-os.db

Local filesystem
  ├─ Drizzle migrations
  ├─ optional cover assets
  └─ JSON export/import files
```

## Sources of truth

- Project portfolio and related records → SQLite tables managed through Drizzle migrations. `Project` is the portfolio aggregate root; Tasks, Milestones, Documents, links, tags, activity, and status history carry a mandatory `projectId` foreign key with cascading deletion.
- Project lifecycle effects, date validation, ordering, and activity/status records → domain service transaction; no view owns independent state.
- Timeline metrics and Today line → derived at read/render time from the Project record and local system date; never persisted as competing data. Milestone dates are durable checkpoints and can be rendered as annotations, not as independent Timeline rows.
- Selected view, filters, and presentation settings → URL state when appropriate plus local `settings` records.
- Product scope → Project Brief; architecture boundaries → this document; execution order → Roadmap/current phase.
- Reference observations → `docs/references/`; they are non-authoritative until an explicitly approved product change updates the canonical owner.

## Security/trust boundaries

- The local app has one trusted owner and intentionally has no authentication or authorization boundary.
- Client-provided mutations must still be validated server-side: enum values, work-progress range, date order, ownership of related local records, and archive/delete transitions.
- Import files are untrusted input. Validate schema version and referential/data constraints before any replacement transaction; permanent deletion requires explicit confirmation.
- Database, cover assets, and exports are local private data. Do not send them to third-party services.

## Operational assumptions

- Core features must run without internet access after local dependencies are installed.
- Migrations are explicit, versioned, and run before using a database schema; the database is not recreated as an upgrade mechanism.
- Backup/import is a deliberate recovery workflow, not background synchronization.
- The UI must remain responsive around 500 projects; Timeline bars are mathematically positioned, not rendered as day-by-project cells.

## Architecture-change triggers

- Native desktop distribution, multi-device/cloud synchronization, external hosting, or background processing.
- Authentication, multiple users, teams, workspaces, permissions, or any public/external API.
- Subtasks/dependencies, custom lifecycle schemas, arbitrary file attachments, multi-project Tasks, or a target dataset that needs virtualization.
- Migration away from SQLite or a changed backup/import compatibility promise.
