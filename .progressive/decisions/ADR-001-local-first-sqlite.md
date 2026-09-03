# ADR-001 — Local-first SQLite persistence

Status: Accepted
Date: 2026-09-03

## Context

V1 is a single-owner Project OS that must create, retain, and back up core data while offline. Cloud services, remote databases, and authentication are explicitly out of scope, while a future PostgreSQL migration must remain possible.

## Decision

Use a local SQLite database at `data/project-os.db`, accessed only through Drizzle ORM and versioned Drizzle migrations. Run it in the local Node runtime with `better-sqlite3`; do not introduce cloud storage or a remote API for V1 core data.

## Consequences

- Positive: offline core behaviour, simple local backup, no account or infrastructure dependency, and an explicit migration history.
- Cost/risk: local database files require careful import/export validation and a future data migration for cloud or multi-user use.
- Revisit when: native packaging, synchronization, a remote deployment, or multi-user access becomes an approved requirement.
