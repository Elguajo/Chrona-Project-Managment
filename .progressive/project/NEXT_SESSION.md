# Next Session

Status: Phase 04 — Timeline and Milestones is complete. In an isolated local SQLite database with 508 Projects, real Edge browser QA verified Timeline Month/Quarter, Previous/Next/Today, status/type filters, horizontal scroll, Today markers, and visual density. Kanban `Move to…` now persists across reload without resetting the selected view; responsive Project drawer QA verified Escape/focus return and the full-screen single-scroll mobile sheet. Native Kanban drag/reorder is the only browser scenario still unconfirmed because the available CUA browser drag gesture does not produce HTML5 `dragstart`/`drop` events. The approved Project workspace expansion has added durable Tasks, Milestones, and Documents as Project-owned relations; it does not add collaboration, AI/MCP, CRM, or cloud synchronization.

Current phase: Phase 03 — Kanban (`.progressive/phases/03-kanban.md`). Timeline and Milestones are complete. List, Dashboard, Project workspace drawer, standalone `/projects/[id]` route, Templates, and Quick Add are also implemented. Global keyboard navigation remains future scope; `⌘/Ctrl+K` is intentionally limited to creation commands.

Read first: Project Brief → Architecture → Roadmap → current phase → ADR-002. Use `CONTEXT_MANIFEST.json` for non-default hints. Consult `docs/source/LOCAL_PROJECT_OS_FINAL_SPEC_v2.md` only when a requirement is unclear; it is source material, not default context.

Reference evidence is documented in `docs/references/`. It may influence visual implementation only after the note is considered; it cannot silently change scope.

Tooling profile: Recommended, with native fallbacks. Serena and GitHub Spec Kit were detected locally; no installation/configuration has occurred.

Verified foundation commands: `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm db:migrate`, and a production runtime smoke check. `README.md` contains local run and validation instructions.

Verified Phase 02 commands: `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm db:migrate`, and a production runtime smoke request. The domain migration is `drizzle/0001_wandering_smiling_tiger.sql`.

Verified Phase 03 commands: `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and a production HTTP smoke request against a temporary SQLite database. The smoke rendered all default columns plus a temporary card and native `Move to…` control. Browser keyboard/drag QA remains pending: gstack browse could not start because `chromium_headless_shell` is absent from the local Playwright cache; no browser was downloaded.

Verified Project workspace expansion: `pnpm db:generate` created `drizzle/0002_sticky_redwing.sql`; `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed. The domain test covers Task completion, Milestone completion, local Document editing, ownership rejection, direct child deletion, and project cascading deletion.

Verified Timeline and Milestones: the same command suite passed after adding the Timeline projection. Deterministic coverage includes Month/Quarter period bounds, navigation, clipping, and overdue semantics. Browser-level Timeline interaction/visual smoke remains pending with the same unavailable Playwright Chromium executable.

Verified List and Dashboard: `pnpm typecheck`, `pnpm lint`, `pnpm test:domain`, and `pnpm build` passed. A production server backed by a temporary SQLite database rendered Dashboard, Project, Task, and Milestone content in its initial HTML response; the process was stopped after the smoke.

Verified standalone Project workspace: `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed. A production server backed by a fresh temporary SQLite database rendered `/`, a populated `/projects/[id]` workspace (including Document content), and the missing-project 404; the process was stopped after the smoke. The route reads the existing Project aggregate plus its activity and server actions revalidate both route surfaces.

Verified Templates and Quick Add: migration `0003_shallow_donald_blake` creates three immutable starter templates and relational template children. Personal templates support CRUD; Project creation expands a template in one SQLite transaction and calculates dates from the required start date. The header Quick Add button and `⌘/Ctrl+K` expose create-only Project, Task, Milestone, and Document flows. `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed; a production HTTP smoke rendered the seeded template and Quick Add labels from a fresh temporary SQLite database.

Verified Calendar and Agenda browser QA: an isolated local database with 18 fixtures exercised Month and Week, previous/next and Today, record-type/status filters, search, 15-entry day expansion, and Project drawer open/close focus return. `2026-08-31` stayed in the August boundary cell while `2026-09-01` Task and Milestone entries stayed on September 1 across Month and Week. Opening the drawer originally logged React's server-action form `encType` warning; removing the redundant attribute from the shared Project form eliminated the error in a fresh browser session. `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, temporary `pnpm db:migrate`, and production HTTP smoke passed.

Next implementation action: use a browser runner that can issue native HTML5 drag events to smoke-test Kanban drag/reorder persistence; do not mark its combined drag acceptance criterion complete before then. The List sortable-columns acceptance criterion also still needs direct browser evidence. Keep established boundaries intact: one local SQLite database, one Project portfolio source of truth, Project-owned workspace records, no auth, no remote services, and no collaboration/AI/MCP/CRM/cloud sync.
