# ADR-002 — One Project entity for all views

Status: Accepted
Date: 2026-09-03

## Context

Timeline, Kanban, List, and Details expose different questions about a project. Storing separate records per view would make status, ordering, dates, and progress diverge.

## Decision

Persist one portfolio-level `Project` entity with related links, tags, activity, status history, Tasks, Milestones, and Documents. Treat Timeline, Kanban, and List as projections of that Project and route all mutations through shared validated domain operations. Tasks, Milestones, and Documents belong to exactly one Project and are rendered inside its workspace; none may become an independent portfolio record. Store only durable user state; derive time metrics and display positions from project data.

## Consequences

- Positive: cross-view synchronization is a data invariant, while a Project can still contain local execution context; reload persistence is straightforward to test.
- Cost/risk: view code cannot own contradictory copies or bypass lifecycle operations; child records require validated ownership checks and cannot be repurposed into shared work items.
- Revisit when: subtasks/dependencies, multi-project Tasks, custom lifecycle schemas, collaboration, or synchronization are approved; they require a new decision rather than an extension by implication.
