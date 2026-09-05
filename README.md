# Local Project OS

Local-first Project OS for one owner. It stores a project portfolio in SQLite, provides a local attention Dashboard plus List, Kanban, Timeline, Calendar, and Templates projections, and keeps lightweight Tasks, dated Milestones, local text Documents, links, and activity inside the owning Project. Calendar renders date-only Project deadlines, unfinished Task due dates, and open Milestones without a view-specific table. Open a Project from its drawer to use the full local workspace at `/projects/[id]`. Three starter templates and personal templates create local Project-owned records; Quick add is available from the header or `⌘/Ctrl+K`. Versioned local JSON backup export/import is included. Authentication is not included.

## Requirements

- Node.js 20.9 or later
- pnpm

## Run locally

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000`. The application has no account, credential, cloud database, or network service dependency at runtime.

SQLite lives at `data/project-os.db` by default. To use another local data directory, set `PROJECT_OS_DATA_DIR` before running `pnpm db:migrate`, `pnpm dev`, or `pnpm start`.

## Validation

```bash
pnpm test:domain
pnpm check:database
pnpm typecheck
pnpm lint
pnpm build
pnpm db:migrate
pnpm start
```

`test:domain` and `check:database` create and remove uniquely named operating-system temporary directories. They verify a fresh SQLite database, project lifecycle validation, persisted Project workspace relations, local cover-asset handling, and the committed migrations without touching your local data.
