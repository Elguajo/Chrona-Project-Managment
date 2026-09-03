# Next Session

Status: Phase 03 — Kanban is implemented and has passed domain, database, static, build, and HTTP runtime checks. It remains in progress solely because browser-level keyboard/drag smoke could not run without the missing local Playwright Chromium executable. The approved Project workspace expansion has added durable Tasks, Milestones, and Documents as Project-owned relations; it does not add collaboration, AI/MCP, CRM, or cloud synchronization.

Current phase: Phase 03 — Kanban (`.progressive/phases/03-kanban.md`). Timeline and Milestones are implemented early and await the same missing browser smoke; List, Dashboard, and the Project workspace drawer are also implemented early. The standalone Project route, templates, and global keyboard navigation remain future scope.

Read first: Project Brief → Architecture → Roadmap → current phase → ADR-002. Use `CONTEXT_MANIFEST.json` for non-default hints. Consult `docs/source/LOCAL_PROJECT_OS_FINAL_SPEC_v2.md` only when a requirement is unclear; it is source material, not default context.

Reference evidence is documented in `docs/references/`. It may influence visual implementation only after the note is considered; it cannot silently change scope.

Tooling profile: Recommended, with native fallbacks. Serena and GitHub Spec Kit were detected locally; no installation/configuration has occurred.

Verified foundation commands: `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm db:migrate`, and a production runtime smoke check. `README.md` contains local run and validation instructions.

Verified Phase 02 commands: `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm db:migrate`, and a production runtime smoke request. The domain migration is `drizzle/0001_wandering_smiling_tiger.sql`.

Verified Phase 03 commands: `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and a production HTTP smoke request against a temporary SQLite database. The smoke rendered all default columns plus a temporary card and native `Move to…` control. Browser keyboard/drag QA remains pending: gstack browse could not start because `chromium_headless_shell` is absent from the local Playwright cache; no browser was downloaded.

Verified Project workspace expansion: `pnpm db:generate` created `drizzle/0002_sticky_redwing.sql`; `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed. The domain test covers Task completion, Milestone completion, local Document editing, ownership rejection, direct child deletion, and project cascading deletion.

Verified Timeline and Milestones: the same command suite passed after adding the Timeline projection. Deterministic coverage includes Month/Quarter period bounds, navigation, clipping, and overdue semantics. Browser-level Timeline interaction/visual smoke remains pending with the same unavailable Playwright Chromium executable.

Verified List and Dashboard: `pnpm typecheck`, `pnpm lint`, `pnpm test:domain`, and `pnpm build` passed. A production server backed by a temporary SQLite database rendered Dashboard, Project, Task, and Milestone content in its initial HTML response; the process was stopped after the smoke.

Next implementation action: install or make an existing Playwright Chromium browser available only with owner approval, then smoke-test keyboard `Move to…`, modal focus return, and drag/reorder persistence before marking Phase 03 complete. Keep established boundaries intact: one local SQLite database, one Project portfolio source of truth, Project-owned workspace records, no auth, no remote services, and no collaboration/AI/MCP/CRM/cloud sync.
