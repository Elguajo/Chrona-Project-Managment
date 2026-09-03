# FINAL TECHNICAL SPECIFICATION
# Local Project OS — Timeline + Kanban + List

**Version:** 2.0 Final  
**Date:** 03.09.2026  
**Mode:** Local-first / Single-user  
**Primary user:** One owner only  
**Status:** Ready for implementation with Codex / Claude / other coding agents

---

## 0. Executive Summary

Build a **local-first project management dashboard** for one owner.

The application is not intended to be Jira, ClickUp, Notion, Linear, or a full task-management suite.

Its primary goal is to provide one visual system for understanding:

- what projects exist;
- what state they are in;
- when they started;
- how long they have been running;
- how much time is left;
- which projects are overdue;
- which projects are paused;
- which projects are completed;
- how projects overlap in time;
- how projects move through statuses.

The same project data must be available through three synchronized views:

```text
TIMELINE  = WHEN
KANBAN    = STATE
LIST      = DATA
DETAILS   = CONTEXT
```

All views must use the same underlying `Project` entity.

---

# 1. Product Scope

The application should support projects of different kinds:

- personal;
- client;
- design;
- development;
- research;
- business;
- studio/internal;
- other.

Examples:

```text
Personal portfolio website
Client branding project
Figma plugin
Blender research tool
AI automation project
Studio website
Scientific 3D research
Business experiment
```

The product is intended to become a personal **Project OS** over time, but V1 must stay focused.

---

# 2. Core Product Principle

The owner should be able to open the application and understand the current state of all projects in approximately **5–10 seconds**.

Prioritize:

```text
visibility
clarity
time
status
deadline
movement
focus
```

Do not prioritize feature quantity.

---

# 3. V1 Deployment Model

V1 is explicitly:

```text
LOCAL-FIRST
SINGLE USER
NO PUBLIC ACCOUNTS
NO REGISTRATION
NO TEAM
NO ORGANIZATIONS
NO USER MANAGEMENT
```

There is one owner of the application.

Do not introduce an `admin` role in V1 because there are no other users.

The app opens directly into the dashboard.

---

# 4. V1 Architecture

Recommended stack:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Drizzle ORM
SQLite
date-fns
dnd-kit
```

Optional later:

```text
TanStack Query
TanStack Virtual
```

Do not introduce Redux unless a concrete technical need appears.

---

# 5. Local Data Storage

V1 database:

```text
SQLite
```

Recommended:

```text
/data/project-os.db
```

Use Drizzle ORM for schema and migrations.

The application should not depend on:

- Supabase;
- Firebase;
- remote PostgreSQL;
- external authentication;
- remote API services

for core functionality.

All core project data must remain usable without an internet connection.

---

# 6. Future Migration Requirement

The data model must not intentionally block migration to:

```text
SQLite
   ↓
PostgreSQL
   ↓
Supabase / managed PostgreSQL
```

Later versions may introduce:

```text
authentication
multi-device sync
multiple users
workspaces
teams
permissions
```

These are not part of V1.

Do not prematurely build them.

---

# 7. Reference-Driven Design Process

The owner will continue providing websites, screenshots, videos, applications, interfaces, and other products as **design and UX references** during development.

The implementation agent must treat these inputs as references for analysis, not as instructions to blindly clone them.

Every new reference must be analyzed before implementation.

---

# 8. Required Reference Analysis

For every supplied reference, the AI/development agent must identify:

1. What problem the referenced interface solves.
2. Information architecture.
3. Main navigation model.
4. Layout structure.
5. Timeline / Kanban / table behavior if present.
6. Project card structure.
7. Filtering system.
8. Search behavior.
9. Date representation.
10. Status representation.
11. Interaction patterns.
12. Drag-and-drop behavior.
13. Drawer / modal / detail-page behavior.
14. Density of information.
15. Visual hierarchy.
16. What is genuinely useful for this Project OS.
17. What should **not** be copied.
18. Possible implementation complexity.
19. Whether the idea belongs in:
   - V1;
   - V2;
   - Future;
   - Rejected.

---

# 9. Reference Documentation

Each meaningful reference should create or update a file:

```text
/docs/references/<reference-name>.md
```

Suggested structure:

```md
# Reference: <name>

## Source
URL / screenshot / video / app

## What it does

## Relevant patterns

## Timeline behavior

## Kanban behavior

## Navigation

## Project cards

## Details panel

## Useful ideas for our product

## Ideas not suitable for our product

## Implementation notes

## Recommendation
Adopt / Adapt / Reject / Later
```

Maintain an index:

```text
/docs/references/README.md
```

---

# 10. Rule for Reference Integration

A new reference must **not silently redefine the product**.

The agent must separate:

```text
OBSERVED PATTERN
RECOMMENDATION
APPROVED PRODUCT CHANGE
```

If a new reference conflicts with this specification:

1. preserve the current specification;
2. explain the conflict;
3. propose a change separately;
4. only modify product behavior if explicitly approved.

Do not replace core product decisions simply because a new reference looks visually attractive.

---

# 11. Design Reference vs Functional Requirement

References may influence:

- spacing;
- visual density;
- layout;
- navigation;
- cards;
- micro-interactions;
- typography hierarchy;
- timeline styling;
- Kanban behavior.

References must not automatically change:

- data model;
- statuses;
- date semantics;
- local-first architecture;
- core project lifecycle;
- synchronization logic.

---

# 12. Main Views

V1 must contain:

```text
Timeline
Kanban
List
Project Details
```

Primary switch:

```text
[List] [Timeline] [Kanban]
```

Last selected view may be stored locally in settings.

---

# 13. Project Entity

Core conceptual model:

```ts
Project {
  id
  name
  description

  type
  status
  priority

  clientName

  startDate
  deadline
  completedAt
  cancelledAt

  workProgress

  color
  coverMode
  coverImagePath

  sortOrder

  createdAt
  updatedAt
  archivedAt
}
```

---

# 14. Project Types

Initial values:

```text
personal
client
design
development
research
business
studio
other
```

Types are independent from statuses.

Example:

```text
type = client
status = negotiating
```

---

# 15. Project Statuses

Default lifecycle:

```text
Pitch
Negotiating
Planning
Active
On Hold
Completed
Cancelled
```

IDs:

```text
pitch
negotiating
planning
active
on_hold
completed
cancelled
```

Default order:

```text
Pitch
→ Negotiating
→ Planning
→ Active
→ Completed
```

Alternative paths:

```text
Active → On Hold
On Hold → Active

Pitch → Cancelled
Negotiating → Cancelled
Planning → Cancelled
Active → Cancelled
```

---

# 16. Project Priority

Initial values:

```text
low
normal
high
critical
```

Use priority mainly for filtering and sorting.

Do not overload the UI with large priority badges.

---

# 17. Unified Data Rule

There must never be separate project copies for Timeline and Kanban.

Correct:

```text
Project A
├── Timeline representation
├── Kanban representation
├── List representation
└── Detail representation
```

Incorrect:

```text
TimelineProject
KanbanProject
ListProject
```

---

# 18. Timeline View — Purpose

Timeline answers:

```text
When did this project start?
How long has it existed?
Where is Today?
What is the deadline?
How much time remains?
Is it overdue?
When was it completed?
Which projects overlap?
```

---

# 19. Timeline Scales

Support:

```text
Week
Month
Quarter
Year
```

MVP required:

```text
Month
Quarter
```

Preferred default:

```text
Month
```

Optional later:

```text
Day
```

---

# 20. Timeline Navigation

Controls:

```text
←
Today
→
Month / Quarter / Year
```

Support:

- horizontal scrolling;
- navigation to previous/next period;
- jump to Today;
- sticky calendar header;
- sticky project-name column.

---

# 21. Today Line

Timeline must show a strong vertical marker for the current calendar date.

Requirements:

- computed automatically;
- not persisted in database;
- updated based on local date;
- visible across all timeline rows;
- easily distinguishable without dominating the UI.

Example:

```text
AUG                    SEP
───────────────│────────────────────
               │ TODAY
               │
```

---

# 22. Project Without Deadline

Example:

```text
start_date = 2026-08-12
deadline = null
completed_at = null
```

Rendered end:

```text
today
```

Formula:

```text
display_end = today
```

The bar grows automatically as days pass.

Metric:

```text
Active for 22 days
```

---

# 23. Project With Deadline

Example:

```text
START                      DEADLINE
███████████████░░░░░░░░░░░
               ↑
             TODAY
```

Represent:

- elapsed time;
- remaining planned time;
- deadline marker.

Metrics:

```text
Elapsed
Remaining
Time progress
Deadline
```

---

# 24. Overdue Project

Condition:

```text
today > deadline
AND status NOT IN (completed, cancelled)
```

Example:

```text
START             DEADLINE       TODAY
██████████████████│▓▓▓▓▓▓▓▓▓▓▓▓│
                  └── overdue ───┘
```

Metric:

```text
Overdue by 8 days
```

Overdue must be visually distinct.

---

# 25. Completed Project

When project becomes Completed:

```text
completed_at = now
```

The timeline stops extending.

Example:

```text
start_date   = 2026-07-01
deadline     = 2026-08-15
completed_at = 2026-08-19
```

Metrics:

```text
Planned duration
Actual duration
Completed 4 days late
```

If earlier:

```text
Completed 6 days early
```

---

# 26. Cancelled Project

When status becomes Cancelled:

```text
cancelled_at = now
```

Cancelled projects do not count as overdue.

Timeline end may become:

```text
cancelled_at
```

---

# 27. Reopening Projects

If:

```text
Completed → Active
```

then:

```text
completed_at = null
```

Create status/activity history entry.

If:

```text
Cancelled → Active
```

then:

```text
cancelled_at = null
```

---

# 28. On Hold

V1:

- project remains visible;
- calendar duration continues;
- status changes visually;
- no advanced pause accounting.

V2 may add:

```text
pauseStartedAt
pauseEndedAt
activeWorkingDays
pausedDays
```

---

# 29. Time Metrics

## Elapsed

For active project:

```text
today - start_date
```

For completed:

```text
completed_at - start_date
```

For cancelled:

```text
cancelled_at - start_date
```

---

# 30. Remaining

```text
deadline - today
```

If negative, use Overdue instead.

Do not show negative Remaining.

---

# 31. Planned Duration

```text
deadline - start_date
```

---

# 32. Actual Duration

```text
completed_at - start_date
```

---

# 33. Time Progress

```text
elapsed / planned_duration × 100
```

Display normal time progress up to 100%.

Overdue is displayed separately.

---

# 34. Work Progress

`Work Progress` is independent from `Time Progress`.

Field:

```text
work_progress
```

Range:

```text
0–100
```

Example:

```text
Time  78%
Work  35%
```

This difference is strategically important and must not be merged into one number.

---

# 35. Timeline Rendering Strategy

Do not create one DOM cell per day per project.

Each project bar should be positioned mathematically.

Given:

```text
visibleStart
visibleEnd
```

Calculate:

```text
left =
(projectStart - visibleStart)
/
(visibleEnd - visibleStart)
```

and:

```text
width =
(projectEnd - projectStart)
/
(visibleEnd - visibleStart)
```

Render each project as one positioned bar.

---

# 36. Timeline Unscheduled Group

Projects in:

```text
Pitch
Negotiating
```

may have:

```text
start_date = null
```

They must remain visible in Kanban.

Timeline may show them under:

```text
UNSCHEDULED
```

They do not receive a calendar bar until a start date exists.

---

# 37. Timeline Grouping

MVP:

```text
None
Type
Status
```

Future:

```text
Client
Priority
Tag
```

---

# 38. Internal Timeline Items

Future-capable data model should support:

```text
phase
milestone
task
event
reminder
```

Example:

```text
Portfolio Website
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Research
██████

UX
      █████████

Design
             █████████

Development
                      █████████████

Beta
                                 ●

Launch
                                        ◆
```

Basic project-level Timeline is MVP.

Detailed sub-items are V2 unless explicitly prioritized later.

---

# 39. Kanban View — Purpose

Kanban answers:

```text
What state is each project in?
What is being discussed?
What is planned?
What is active?
What is paused?
What is completed?
What was cancelled?
```

---

# 40. Kanban Columns

Default:

```text
Pitch
Negotiating
Planning
Active
On Hold
Completed
Cancelled
```

Each column shows count:

```text
ACTIVE  4
```

---

# 41. Kanban Card

Recommended hierarchy:

```text
[Optional Cover]

Project name
Client / Personal

Started 22 days ago

Deadline
30 Sep

18 days left

Time   ███████░░ 63%
Work   █████░░░░ 40%

Tags
```

Keep cards compact.

Not every field must be visible by default.

---

# 42. Kanban Drag & Drop

Users can drag:

```text
Planning → Active
```

The action updates:

```text
project.status
```

And must immediately synchronize:

```text
Kanban
Timeline
List
Project Details
```

---

# 43. Drag Accessibility

Drag-and-drop cannot be the only method.

Card action menu must allow:

```text
Move to…
```

with selectable statuses.

---

# 44. Card Ordering

Cards can be manually reordered within a column.

Persist:

```text
sort_order
```

Recommended fractional strategy:

```text
1000
2000
3000
```

or equivalent ranking algorithm.

---

# 45. Status History

Persist every status transition.

Example:

```text
2026-07-04 Pitch
2026-07-12 Negotiating
2026-07-19 Planning
2026-08-02 Active
2026-08-28 On Hold
2026-09-01 Active
```

This enables future analytics.

---

# 46. List View

Columns:

```text
Project
Status
Type
Start
Deadline
Elapsed
Remaining
Time %
Work %
Priority
Updated
```

Support sorting.

---

# 47. Project Drawer

Clicking a project from Timeline / Kanban / List opens a side drawer.

Desktop:

```text
380–480 px
```

The drawer must not force page navigation for common edits.

Suggested content:

```text
Project name
Status
Type
Priority

Start
Deadline

Active for
Remaining
Overdue

Time progress
Work progress

Description
Tags
Links

Open full project →
```

---

# 48. Project Detail Page

Route:

```text
/projects/[id]
```

V1 sections:

```text
Overview
Timeline
Links
Activity
```

Future:

```text
Phases
Milestones
Notes
Files
Integrations
```

---

# 49. Project Links

Support:

```text
Figma
GitHub
Notion
Google Drive
Website
Behance
Reference
Custom
```

Fields:

```text
id
project_id
type
title
url
created_at
```

---

# 50. Project Cover

Fields:

```text
cover_mode
cover_image_path
color
```

Modes:

```text
none
color
gradient
image
```

For local-first V1, uploaded image assets may be stored locally in application data storage.

Do not require cloud object storage.

---

# 51. Tags

Many-to-many model:

```text
tags
project_tags
```

Example tags:

```text
portfolio
client
web
blender
ai
research
urgent
```

---

# 52. Search

MVP search:

```text
project.name
client_name
tags
```

Future:

```text
description
links
notes
```

---

# 53. Filters

MVP:

```text
Status
Type
Priority
Deadline
Overdue
```

Deadline presets:

```text
No deadline
Due today
Due this week
Due this month
Overdue
```

---

# 54. Sorting

Timeline:

```text
manual
start date
deadline
priority
type
```

Kanban:

```text
manual
deadline
priority
recently updated
```

List:

sortable columns.

---

# 55. URL/View State

If technically reasonable, view and filters may be represented in URL:

```text
/projects?view=timeline
/projects?view=kanban
/projects?view=list
```

Example:

```text
/projects?view=timeline&type=client&status=active
```

Because V1 is local-only, this is for state consistency, not public sharing.

---

# 56. Dashboard Summary

Keep compact.

Example:

```text
12 Active
3 Due this week
2 Overdue
4 On Hold
```

Do not create a large KPI analytics screen for MVP.

---

# 57. Project Health — Future

Computed state:

```text
On Track
At Risk
Overdue
Stalled
```

This is not a project status.

Example:

```text
time progress = 80%
work progress = 35%
→ At Risk
```

---

# 58. New Project

Primary action:

```text
+ New Project
```

Minimal form:

```text
Name *
Status
Type
Start date
Deadline
```

Optional fields:

```text
Client
Description
Priority
Color
Cover
Tags
Work Progress
```

---

# 59. Creation From Kanban Column

Creating from an `Active` column:

```text
status = active
```

If no start date is entered:

```text
start_date = today
```

but the UI should make this behavior visible.

---

# 60. Date Rules

Validation:

```text
deadline >= start_date
completed_at >= start_date
cancelled_at >= start_date
```

Show explicit validation errors.

Never silently normalize invalid user input.

---

# 61. Date Storage

Calendar values:

```text
start_date
deadline
```

must be stored as SQLite date-compatible values representing calendar dates, not timezone-shifting timestamps.

Event timestamps:

```text
created_at
updated_at
completed_at
cancelled_at
```

can use ISO timestamps.

---

# 62. Local Time

`Today` must use the local system date.

V1 does not require user timezone accounts.

---

# 63. Database Tables

Required:

```text
projects
project_status_history
project_links
tags
project_tags
project_activity
settings
```

Prepared for V2:

```text
timeline_items
```

---

# 64. `projects` Table

Suggested logical schema:

```sql
projects
--------
id TEXT PRIMARY KEY

name TEXT NOT NULL
description TEXT

type TEXT
status TEXT NOT NULL
priority TEXT

client_name TEXT

start_date TEXT
deadline TEXT

completed_at TEXT
cancelled_at TEXT

work_progress INTEGER NOT NULL DEFAULT 0

color TEXT
cover_mode TEXT
cover_image_path TEXT

sort_order REAL

created_at TEXT NOT NULL
updated_at TEXT NOT NULL

archived_at TEXT
```

Constraint:

```text
work_progress BETWEEN 0 AND 100
```

Use actual Drizzle schema types appropriate for SQLite.

---

# 65. `project_status_history`

```text
id
project_id
from_status
to_status
changed_at
```

---

# 66. `project_activity`

Types:

```text
created
status_changed
deadline_changed
progress_changed
completed
reopened
cancelled
archived
restored
```

Fields:

```text
id
project_id
type
metadata_json
created_at
```

---

# 67. `timeline_items`

Future-capable:

```text
id
project_id
type
title
description
start_date
end_date
completed_at
status
sort_order
created_at
updated_at
```

---

# 68. `settings`

Local application settings:

```text
id
key
value_json
```

Examples:

```text
default_view
timeline_zoom
sidebar_collapsed
last_used_filters
appearance
```

---

# 69. No Authentication in V1

Explicitly do not implement:

```text
login
signup
password reset
OAuth
magic link
sessions
roles
permissions
RLS
```

The local application is trusted as a single-owner environment.

---

# 70. Backup and Restore

Because V1 is local-first, backup matters.

MVP should provide at least one safe strategy.

Preferred:

```text
Export JSON
Import JSON
```

Optional:

```text
Export SQLite database
```

Import must validate schema/version before overwriting data.

---

# 71. Data Export

Recommended JSON structure:

```json
{
  "schemaVersion": 1,
  "exportedAt": "...",
  "projects": [],
  "statusHistory": [],
  "links": [],
  "tags": [],
  "activities": []
}
```

---

# 72. Data Safety

Do not automatically delete projects permanently.

Primary destructive lifecycle:

```text
Archive
```

Permanent delete should:

- require confirmation;
- be secondary;
- cascade safely to related records.

---

# 73. Autosave

Project Drawer may autosave.

States:

```text
Saved
Saving…
Failed to save
```

Use debounce where appropriate.

An error must not falsely display Saved.

---

# 74. Optimistic UI

Use optimistic interaction for:

```text
Kanban status move
Card reorder
Work progress
Priority
Simple quick edits
```

If persistence fails:

- revert UI;
- show error toast.

---

# 75. Header

Suggested structure:

```text
Projects

+ New Project

List | Timeline | Kanban

Search
Filter

Today
```

Exact visual design may evolve based on references.

---

# 76. Sidebar

Potential categories:

```text
All Projects

Personal
Client
Development
Research
Business
Studio

Active
On Hold
Completed
Archived
```

The final sidebar design may be refined through reference analysis.

---

# 77. Dark Interface Direction

Default visual direction:

- near-black background;
- subtle borders;
- compact layout;
- high information density;
- minimal unnecessary cards;
- clear typography hierarchy;
- selective color;
- timeline and Kanban feel like one product.

Do not copy a reference pixel-for-pixel.

---

# 78. Visual Constraints

Do not add without reason:

- gradients everywhere;
- glassmorphism;
- excessive glow;
- decorative dashboards;
- large KPI cards;
- oversized rounded cards;
- unnecessary animations;
- gamification;
- visual noise.

Visual choices must support reading project state and time.

---

# 79. Responsive Strategy

Primary:

```text
Desktop 1280+
Laptop 1024+
```

Tablet:

- collapsible sidebar;
- horizontally scrollable Timeline/Kanban where needed.

Mobile:

- drawer becomes full-screen sheet;
- Kanban can horizontally scroll between columns;
- Timeline is horizontally scrollable;
- List may transform into compact rows/cards.

V1 may prioritize desktop quality first.

---

# 80. Empty States

Examples:

```text
No projects yet
Create your first project
```

```text
No projects in this period
```

```text
No projects match these filters
Clear filters
```

---

# 81. Loading States

For local SQLite operations loading should generally be minimal.

Where loading exists:

- avoid layout shifts;
- use lightweight skeletons;
- do not fake long loading animations.

---

# 82. Error Handling

Examples:

```text
Could not save project.
Retry
```

```text
Could not load database.
```

```text
Import file is incompatible with this version.
```

Errors must be actionable.

---

# 83. Keyboard Shortcuts

Recommended:

```text
N               New project
/               Search
Esc             Close drawer
Cmd/Ctrl + K    Command menu (future or V1 optional)
```

Keyboard shortcuts must not interfere with text inputs.

---

# 84. Accessibility

Minimum:

- semantic controls;
- keyboard navigation;
- visible focus;
- sufficient contrast;
- status represented by text/icon as well as color;
- drag alternative through menu;
- accessible names for icon buttons.

---

# 85. Performance

Target dataset:

```text
500 projects
```

The main interface should remain responsive.

Avoid:

- day × project DOM grids;
- unnecessary re-renders;
- huge nested scroll containers.

If project count becomes large, add:

```text
TanStack Virtual
```

for vertical virtualization.

---

# 86. V1 Scope

## Required

### Core
- local SQLite database;
- migrations;
- no auth;
- project CRUD;
- archive;
- delete confirmation;
- backup/export/import.

### Views
- Timeline;
- Kanban;
- List;
- Project Drawer;
- Project detail route.

### Project fields
- name;
- description;
- type;
- status;
- priority;
- client;
- start;
- deadline;
- completed/cancelled timestamps;
- work progress;
- color;
- cover;
- tags;
- links.

### Timeline
- Month;
- Quarter;
- Today line;
- elapsed;
- remaining;
- deadline;
- overdue;
- completed;
- no-deadline growing bar;
- navigation;
- filtering.

### Kanban
- all default status columns;
- project cards;
- drag & drop;
- manual ordering;
- Move To alternative;
- column counts;
- synchronized status.

### List
- sortable project rows.

### Details
- calculated time metrics;
- quick edit;
- links;
- activity.

### Search / Filters
- name;
- client;
- status;
- type;
- priority;
- deadline;
- overdue.

---

# 87. V1 Non-Goals

Do not build:

```text
users
login
teams
workspaces
permissions
billing
CRM
invoices
chat
comments
AI assistant
file collaboration
complex task management
resource allocation
Gantt dependencies
time tracking timer
automatic Figma sync
automatic GitHub sync
cloud sync
public sharing
```

unless the product scope is explicitly changed later.

---

# 88. V2 Candidates

Potential additions:

- phases;
- milestones;
- timeline items;
- saved views;
- pause intervals;
- project templates;
- custom project types;
- custom statuses;
- custom fields;
- project health;
- stalled detection;
- status analytics;
- deadline analytics;
- advanced keyboard workflow;
- Timeline drag-resizing.

All require separate prioritization.

---

# 89. V3 / Future Project OS

Possible direction:

```text
Projects
+
Timeline
+
Kanban
+
Calendar
+
GitHub
+
Figma
+
Notion
+
Drive
+
Automation
+
AI
```

Do not implement this architecture prematurely.

---

# 90. Future Multi-User Migration

Only when required:

```text
Local Single User
        ↓
Cloud Sync
        ↓
Authentication
        ↓
Multi-device
        ↓
Workspaces
        ↓
Teams
```

At that stage:

- migrate SQLite → PostgreSQL;
- add user IDs;
- add ownership;
- introduce auth;
- introduce authorization.

This is intentionally outside V1.

---

# 91. Development Documentation Structure

Recommended repository structure:

```text
/docs
  /product
    SPEC.md
    ROADMAP.md
    DECISIONS.md

  /references
    README.md
    <reference>.md

  /development
    DATA_MODEL.md
    TIMELINE_LOGIC.md
    KANBAN_LOGIC.md
    LOCAL_STORAGE.md

  /phases
    001-foundation.md
    002-project-crud.md
    003-kanban.md
    004-timeline.md
    005-project-details.md
    006-polish.md
```

---

# 92. Decision Log

Important architecture/product decisions must be recorded in:

```text
/docs/product/DECISIONS.md
```

Example:

```md
## ADR-001 — SQLite for V1

Decision:
Use SQLite + Drizzle.

Reason:
Single-user local-first application; no current need for cloud backend.

Consequences:
Simple local setup, easy backup, later migration required for multi-user cloud mode.
```

---

# 93. Reference-to-Decision Workflow

When the owner provides a new site:

```text
Reference supplied
      ↓
AI analyzes reference
      ↓
Reference note created
      ↓
Useful patterns extracted
      ↓
Compare against current SPEC
      ↓
Recommendation produced
      ↓
Owner approves/rejects
      ↓
SPEC / DECISIONS updated if necessary
      ↓
Implementation
```

Do not jump directly from:

```text
URL → code
```

for substantial UX changes.

---

# 94. Screenshots and Inaccessible References

If a website:

- blocks access;
- requires login;
- is heavily client-rendered;
- has inaccessible interactions;

the agent should use any screenshots/video supplied by the owner as the primary evidence.

Do not invent unseen screens or behavior.

Mark uncertainty explicitly.

---

# 95. Copyright / Cloning Rule

Use references to learn:

- interaction patterns;
- layout logic;
- information hierarchy;
- UX concepts.

Do not intentionally copy:

- brand identity;
- logos;
- proprietary illustrations;
- copyrighted copy;
- unique visual assets;
- another product pixel-for-pixel.

The target should be an original product influenced by multiple references.

---

# 96. Implementation Phases

## Phase 1 — Foundation

Deliver:

- Next.js;
- TypeScript;
- Tailwind;
- shadcn/ui;
- SQLite;
- Drizzle;
- migrations;
- app shell;
- settings.

Exit criteria:

- application runs locally;
- database initializes;
- migrations work.

---

## Phase 2 — Project CRUD

Deliver:

- create;
- edit;
- archive;
- restore;
- delete;
- project fields;
- tags;
- links;
- activity.

Exit criteria:

- project survives application restart.

---

## Phase 3 — Kanban

Deliver:

- status columns;
- cards;
- counts;
- drag & drop;
- Move To;
- ordering;
- status history.

Exit criteria:

- moves persist after reload.

---

## Phase 4 — Timeline

Deliver:

- calendar header;
- project bars;
- Today;
- Month;
- Quarter;
- no-deadline behavior;
- deadline;
- overdue;
- completed;
- navigation;
- filters.

Exit criteria:

- time positions and metrics are correct.

---

## Phase 5 — List + Details

Deliver:

- sortable List;
- Project Drawer;
- project route;
- links;
- activity;
- progress.

---

## Phase 6 — Backup + Polish

Deliver:

- JSON export/import;
- responsive behavior;
- keyboard support;
- errors;
- accessibility;
- performance profiling.

---

# 97. Timeline Acceptance Criteria

Timeline is complete when:

1. projects render on correct calendar positions;
2. Today line is correct;
3. no-deadline projects extend to Today;
4. deadline projects show planned range;
5. overdue segment is visible;
6. completed project stops at completion;
7. cancelled project does not count as overdue;
8. elapsed is correct;
9. remaining is correct;
10. filters work;
11. switching views does not duplicate data;
12. reload preserves state.

---

# 98. Kanban Acceptance Criteria

Kanban is complete when:

1. all status columns exist;
2. each project appears in exactly one status column;
3. drag changes status;
4. Move To changes status;
5. status persists;
6. manual ordering persists;
7. counts update;
8. filters/search work;
9. click opens Project Drawer;
10. completion sets completed timestamp;
11. reopening clears completion timestamp;
12. timeline reflects every status update.

---

# 99. Local-First Acceptance Criteria

V1 is genuinely local-first when:

1. application can start without external cloud services;
2. projects can be created offline;
3. core views work offline;
4. data is stored in local SQLite;
5. restarting the app preserves data;
6. export produces a portable backup;
7. import can restore valid backup;
8. no login is required;
9. no hidden external database dependency exists.

---

# 100. Cross-View Synchronization Test

Test:

```text
1. Create "Portfolio".
2. Status = Planning.
3. Start = 12 Aug.
4. Deadline = 30 Sep.
5. Confirm it appears in Planning Kanban.
6. Open Timeline.
7. Confirm correct date range.
8. Return to Kanban.
9. Move Planning → Active.
10. Open Timeline.
11. Status must now be Active.
12. Change Work Progress to 40%.
13. Open List.
14. Work Progress must show 40%.
15. Complete project.
16. Completed timestamp must be stored.
17. Restart application.
18. All state must remain correct.
```

---

# 101. Reference Integration Acceptance Criteria

When a new reference URL or screenshot is provided:

1. AI analyzes it before coding substantial changes.
2. Findings are documented.
3. Useful patterns are separated from copied appearance.
4. Conflicts with SPEC are identified.
5. Suggested changes are categorized:
   - Adopt;
   - Adapt;
   - Later;
   - Reject.
6. Product changes are not silently introduced.
7. Approved changes are reflected in SPEC/DECISIONS before implementation when significant.

---

# 102. Definition of Done — V1

V1 is ready when the owner can:

1. launch the project locally;
2. create a project;
3. set type/status/priority;
4. add start date;
5. optionally add deadline;
6. see project in Kanban;
7. see same project in Timeline;
8. see same project in List;
9. see active duration;
10. see time remaining;
11. see overdue state;
12. set Work Progress;
13. drag project between statuses;
14. reorder Kanban cards;
15. open Project Drawer;
16. edit project;
17. attach links;
18. complete project;
19. reopen project;
20. archive project;
21. filter projects;
22. search projects;
23. restart the app without data loss;
24. export data;
25. restore data from a valid export.

---

# 103. Final Product Rule

The application must remain a **project visibility system first**.

Before adding any feature ask:

```text
Does this help the owner understand:
- what exists,
- what state it is in,
- when it happens,
- how long it takes,
- what needs attention?
```

If not, it probably does not belong in the core product.

---

# 104. One-Sentence Product Definition

> **Local Project OS is a single-user visual project dashboard that combines Timeline, Kanban, List and Project Details so the owner can see the state and time dimension of all personal, client, design, development, research and business projects in one place.**
