# ADR-003 — Date-only calendar semantics and local Today

Status: Accepted
Date: 2026-09-03

## Context

Project start dates and deadlines are calendar commitments. Timestamp conversion can shift a displayed calendar day across timezones, while elapsed and overdue behaviour must remain predictable for one local owner.

## Decision

Store `start_date` and `deadline` as validated date-only ISO values (`YYYY-MM-DD`). Store lifecycle events (`created_at`, `updated_at`, `completed_at`, `cancelled_at`) as ISO timestamps. Compute Today from the local system date and calculate timeline metrics from these semantics; never persist a Today marker.

## Consequences

- Positive: calendar rendering, sorting, filtering, and overdue rules avoid timezone drift.
- Cost/risk: date parsing/formatting belongs in a single tested domain utility, and invalid ordering is rejected rather than normalized.
- Revisit when: cross-device synchronization or user-configurable timezones becomes approved scope.
