# Reference: Kanban board screenshot

## Source

Local screenshot: `docs/reference-image/tg_image_3765483013.png`. The source product and unseen interactions are unknown.

## What it does

Provides a portfolio-level board organized by the lifecycle states Pitch, Negotiating, Planning, Active, On Hold, Completed, and Cancelled.

## Observed patterns

- A full-width, dark, high-density board with one vertical column per status.
- Each column header combines a coloured status dot, uppercase status label, and count.
- A compact top bar has a primary New Project action, List/Timeline/Kanban switcher, filtering/search affordances, and utility icons.
- The visible Active card uses a large optional cover area and a short project title; empty columns remain quiet rather than using repeated empty cards.

## Information architecture and interaction evidence

- Main navigation is a direct three-view switch, not nested navigation.
- The screenshot supports filtering and search affordances, but does not prove their behaviour, drag-and-drop, drawer contents, card menus, or keyboard workflow.
- Card-level metadata, ordering, and status-change behaviour are not visible and must follow the product specification rather than inference.

## Relevant patterns

- **Adapt in V1:** dense columns, legible status/count headers, a direct view switch, restrained dark surfaces, and optional cover presentation.
- **Keep governed by the specification:** all default lifecycle states, synchronized data, accessible `Move to…`, manual ordering, filtering, and compact card hierarchy.

## What should not be copied

- Brand identity, logos, unique utility icons, proprietary copy, or exact visual styling.
- The oversized cover treatment as a default; it conflicts with the V1 requirement for compact information-rich cards and should remain an optional, responsive card variant.
- Any unseen interaction or product feature inferred from toolbar icons.

## Implementation notes

Expected visual implementation complexity is low to medium. The dense layout is compatible with V1, but keyboard movement and drag alternatives remain mandatory regardless of the reference.

## Recommendation

**Adapt:** board hierarchy and density.

**Later:** no additional functionality established by this evidence.

**Reject:** pixel-level cloning and adoption of unexplained toolbar functionality.
