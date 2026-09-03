# Phase 07 — Personal Workflow Polish

## Goal

Make the local single-owner workspace faster to operate without adding collaboration, remote services, or AI automation.

## In scope

- Project templates that create local Project defaults and optional starter Tasks, Milestones, and Documents.
- Keyboard-first quick navigation and an Upcoming/Overdue dashboard derived from Project deadlines, Task due dates, and Milestones.
- Local search across Project names, Tasks, Milestones, Documents, tags, and links.

## Out of scope

- Accounts, teams, roles, AI/MCP, CRM, third-party integrations, cloud synchronization, notifications, and background services.

## Acceptance criteria

- A template creates only local records owned by the new Project.
- Upcoming and overdue information is derived from existing date-only fields and the local system date.
- Search never requires network access and does not disclose data outside the local process.

## Progress Record

Implemented early: 2026-09-03

- A local Dashboard derives active-project, overdue-project, open-agenda, and completed-Task counts plus Upcoming/Overdue agenda rows from existing Project, Task, and Milestone date/status data.
- Project search is available in List, Kanban, and Timeline. Templates and keyboard-first global navigation remain planned.
