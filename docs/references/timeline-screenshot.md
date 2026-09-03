# Reference: Timeline screenshot

## Source

Local screenshot: `docs/reference-image/tg_image_669985546.png`. The source product and unseen interactions are unknown.

## What it does

Shows a portfolio timeline with project names in a left lane and work scheduled on a horizontal calendar axis. The image appears to support project-level ranges plus nested ticket/event/reminder lanes.

## Observed patterns

- A dark timeline with a persistent left project-name column and a wide calendar grid.
- Month headings and weekly date labels on the horizontal axis, navigation arrows, zoom controls, and a Today control.
- A clearly contrasted vertical current-date marker.
- Rounded, colour-coded bars positioned across time; one long parent range has smaller subordinate bars beneath it.
- A left filter region and small coloured project markers; the exact filter semantics are truncated/unknown.

## Information architecture and interaction evidence

- The layout separates project identity from temporal placement, which supports scanning overlaps.
- The screenshot text suggests contextual creation of tickets, reminders, or events, but it does not prove detailed editor, drag, resize, filtering, or persistence behaviour.
- Nested task/event/reminder lanes are visible evidence of a richer work-management tool, not proof that they belong in this Project OS V1.

## Relevant patterns

- **Adapt in V1:** sticky project identity lane, navigable month/quarter calendar header, direct Today control, clear local Today marker, positioned range bars, and restrained colour use.
- **Keep governed by the specification:** date-only semantics, no-deadline growth to Today, overdue/completed/cancelled behaviour, unscheduled projects, and mathematically positioned bars.

## What should not be copied

- Source branding, exact colours, typography, controls, copy, or pixel-level appearance.
- Ticket/reminder/event creation, nested work lanes, and task-level planning. They are V2/future candidates, not V1 scope.
- Assumed drag-resize or right-click interactions that are not specified or fully observable.

## Implementation notes

The useful V1 structure has medium complexity: calendar calculations, sticky regions, horizontal overflow, and accessible rendering require focused tests. Avoid a day-cell grid; render a single mathematically positioned bar per Project. Nested items would materially expand the data model and are deferred.

## Recommendation

**Adapt:** temporal layout and scanability patterns.

**Later:** timeline items, task/event/reminder lanes, and any timeline resizing workflow.

**Reject:** pixel-level cloning and silently expanding V1 into a task-management system.
