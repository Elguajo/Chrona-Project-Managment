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

- [ ] Design and implement validated export/import including incompatible-file rejection and recovery safety.
- [ ] Complete responsive, accessibility, error, and optimistic-persistence behaviour.
- [ ] Profile representative project counts and introduce virtualization only if evidence warrants it.
- [ ] Execute V1 definition-of-done and offline/cross-view verification.

## Acceptance criteria

- [ ] Valid exports restore projects, related workspace records, relationships, and history; invalid/incompatible imports do not overwrite data.
- [ ] Core use works offline, without login, after restart, and without an external database.
- [ ] Keyboard/focus, drag alternative, status contrast, and responsive behaviours meet the stated V1 minimum.
- [ ] The cross-view synchronization test and V1 definition of done have observed evidence.

## Negative / security cases

- Import treats files as untrusted and does not partially overwrite existing data on failed validation.
- Error states never report a save/import as successful when persistence failed.

## Verification

- Import/export and offline tests, accessibility and performance checks, type check, lint, build, and end-to-end local acceptance run.
