# Phase 06 — Backup, Resilience, and Polish

## Goal

Make V1 safely recoverable, accessible, and demonstrably usable as a local-first Project OS.

## In scope

- Versioned JSON export/import with validation before transactional replacement, including Tasks, Milestones, Documents, links, tags, history, and local settings.
- Error, loading, empty, optimistic-save, responsive, keyboard, accessibility, and performance hardening.
- End-to-end cross-view synchronization and local-first acceptance verification.

## Out of scope

- Cloud synchronization, remote backups, user accounts, collaborative recovery, and V2 product features.

## Tasks

- [x] Design and implement validated export/import including incompatible-file rejection and recovery safety.
- [x] Complete responsive, accessibility, error, and optimistic-persistence behaviour.
- [x] Profile representative project counts and introduce virtualization only if evidence warrants it.
- [x] Execute V1 definition-of-done and offline/cross-view verification.

## Acceptance criteria

- [x] Valid exports restore projects, related workspace records, relationships, and history; invalid/incompatible imports do not overwrite data.
- [x] Core use works offline, without login, after restart, and without an external database.
- [x] Keyboard/focus, drag alternative, status contrast, and responsive behaviours meet the stated V1 minimum.
- [x] The cross-view synchronization test and V1 definition of done have observed evidence.

## Negative / security cases

- Import treats files as untrusted and does not partially overwrite existing data on failed validation.
- Error states never report a save/import as successful when persistence failed.

## Verification

- Import/export and offline tests, accessibility and performance checks, type check, lint, build, and end-to-end local acceptance run.

## Completion Record

Completed: 2026-09-04

- `GET /api/backup` produces a versioned Local Project OS JSON v1 snapshot of all durable tables, local settings, and locally stored cover assets. `POST /api/backup` accepts only JSON v1, validates every row, enum, date, URL, relation, metadata payload, and cover signature before replacement.
- Restore stages cover assets, swaps the cover directory with rollback protection, and replaces SQLite rows in one transaction. Domain coverage restores Projects, Tasks, Documents, status history, templates, and a PNG cover file; it rejects both an unsupported schema version and a Task referring to a missing Project while confirming the prior database remains intact.
- The backup controls expose success through a polite status and an import failure through an assertive alert. Project/workspace forms retain their existing pending disables, persistence errors, native labels, dialogs, focus styles, empty states, and keyboard-accessible `Move to…` alternative.
- Local Microsoft Edge browser acceptance used Playwright Core and an isolated SQLite database with 500 Projects plus workspace fixtures. It observed `Move to…` focus as a native `SELECT`, Kanban-to-List status synchronization, an export followed by a changed status and successful restore, and an incompatible import rejected without changing the active row. The browser requested only `http://127.0.0.1`; the intentional rejection returned HTTP 400 and was announced as an alert.
- The 500-Project production profile rendered Dashboard in 196 ms and switched to Timeline in 158 ms in the local Edge run. There was no observed rendering pressure warranting virtualization. At a 390px viewport, page-level horizontal movement is clipped (`scrollX=0`) while the Kanban board preserves its own horizontal scroller.
- Final evidence: `pnpm test:domain`, `pnpm check:database`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed. A fresh temporary `PROJECT_OS_DATA_DIR` completed `pnpm db:migrate`; a production server using that database rendered `/` and returned a valid backup payload from `/api/backup`.
