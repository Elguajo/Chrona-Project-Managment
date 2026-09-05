# Phase 08 — Local Command Navigation

## Goal

Let the single owner navigate the local portfolio and Projects quickly from a keyboard-first command palette without changing the local data model or product boundaries.

## Context

Phase 07 deliberately limits `⌘/Ctrl+K` to record creation. The main portfolio has six client-side views, while a standalone Project workspace uses a separate route. The command palette must navigate both surfaces using existing local Project data only.

## In scope

- A local `⌘/Ctrl+K` command palette for existing Project, Task, Milestone, and Document creation commands.
- Local commands to open Dashboard, Kanban, Timeline, Calendar, List, Templates, or a Project workspace by Project name.
- URL-backed selected portfolio view so a workspace command can return to a precise existing view.
- Keyboard, focus, modal, and unsaved-form safety for palette-triggered navigation.
- Correct the README statement about the already implemented local backup/import feature.

## Out of scope

- SQLite schema or backup-format changes, remote services, sync, authentication, AI/MCP, CRM, notifications, background jobs, and new Project-domain capabilities.

## Tasks

- [x] Implement the reusable local command palette and view navigation.
- [x] Preserve Quick Add creation flows and protect unsaved visible forms before navigation.
- [x] Validate keyboard, focus, view, Project-route, local-only, and regression behaviour.
- [x] Update implementation-coupled README wording and record completion evidence.

## Acceptance criteria

- [x] `⌘/Ctrl+K` opens the local command palette on the portfolio and a Project workspace without hijacking editable fields or conflicting with another dialog.
- [x] Keyboard users can select all six portfolio views, the four existing creation flows, and a locally matched Project; view selection survives reload through a validated URL value.
- [x] Palette close restores focus, and a palette-triggered route/view change cannot silently discard a changed visible form.
- [x] The feature makes no network request beyond the existing local application process and requires no migration.

## Verification

- Focused command/navigation tests where meaningful; `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
- Local browser QA using an isolated SQLite database: portfolio/workspace shortcuts, arrow/Enter/Escape, focus restoration, view reload, Project navigation, open dialog/form handling, and console/network inspection.

## Completion Record

Completed: 2026-09-04

- `QuickAdd` is now a local command palette. It offers the four existing creation flows, all six portfolio views, and local Project-name matches; it reads only the existing serialized Project aggregate and performs no palette-specific request.
- The selected portfolio view is a validated `?view=` value. Commands from `/projects/[id]` navigate to that existing portfolio surface; direct reload retains the selected view. Invalid query values fall back to Dashboard.
- The palette does not open from editable elements or while another native dialog is open. It restores the invoker focus on Escape. Before a view or Project-route command, it detects changed visible form controls and requires a browser confirmation before leaving.
- Browser QA used a fresh temporary `PROJECT_OS_DATA_DIR`, `pnpm db:migrate`, and a production server on local port 3015. It created a fixture Project through `⌘K` + Enter; found and opened it by name; opened Timeline from the workspace and retained Timeline across reload; opened Kanban with ArrowDown + Enter; confirmed Escape focus restoration; confirmed editable-field and open-dialog shortcut suppression; and observed the unsaved-form confirmation before navigation. The temporary fixture data was not written to the owner database.
- Final validation passed: `pnpm typecheck`, `pnpm lint`, `pnpm test:domain`, `pnpm check:database`, and `pnpm build`. A local production HTTP request rendered `/`. No schema migration was added.
