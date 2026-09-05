# Interface audit and refinement plan — 2026-09-05

Audit and plan completed before application edits. Mode: audit and refine.

## Evidence and product

Live local Next.js app, dark theme, 1440×1000 desktop and 390×844 mobile, isolated SQLite copy of the previous UX test fixtures. Baselines: six portfolio views, Project drawer, command palette, mobile List. Goal walk: Dashboard commitments → List → Project drawer → Escape → command palette. No user database mutations. Existing uncommitted UX changes are the baseline.

Single-owner local portfolio; frequent desktop inspection, creation and lightweight project work; mobile review. Best experience: calm, precise and dense enough for daily use.

## Current interface model

- Preserve: near-black canvas, graphite surfaces, lime emphasis, semantic status colors, system sans, Lucide outline icons, compact data views and project-owned workflows.
- Preserve: keyboard command palette, native forms/dialogs, scrollers for intrinsically wide portfolio views, date-only labels, existing recovery feedback.
- Refine: 4/8-based spacing mixed with repeated large introductions; 30/24 px heading levels compete across shell and view. Lime eyebrow labels repeat more often than meaningful actions.
- Refine: modest rounded buttons and Kanban cards coexist with square fields and nested dashboard rectangles. Thin borders are used for nearly every grouping.
- Refine: technical descriptions (“view-specific copy”, “derived from”) occupy prominent space in everyday screens.
- Remove: permanently disabled Settings placeholder; no working behavior depends on it.
- Missing: explicit dark native-control color scheme; reduced-motion override for shared button transitions; intentional entry continuity for the two primary overlays.

## Findings and plan

| Problem / evidence | Impact | Preserve | Proposed change | Principle | Priority / confidence |
| --- | --- | --- | --- | --- | --- |
| Rendered: mobile header squeezes brand into a narrow multi-line strip | Identity and primary action are hard to scan | Brand, Quick add, visible backups | Two-column mobile header with backup row; aligned desktop width | Flexibility, purpose | P1 / High |
| Rendered: large generic intro plus duplicate view introduction pushes data down | Repetitive work spends screen area on explanation | Six views and descriptions | Compact Portfolio context; quiet navigation and secondary eyebrows | Hierarchy, simplicity | P1 / High |
| Rendered: Dashboard nested boxes and stretched empty panel dominate | Deadlines compete with borders; tiny title-only click area | Metrics, order, date and kind | Align panels at top, separated full-width agenda buttons, concise empty state, restrained card geometry | Purpose, agency, craft | P1 / High |
| Rendered/code: fields square, controls 28–36 px; date affordances nearly black; computed color-scheme normal | Inconsistent proportions; weak native-control affordances | Native fields, validation, font and tokens | Shared field geometry and 40 px controls, 44 px coarse-pointer targets, color-scheme dark | Familiarity, responsibility | P2 / High |
| Code: transition-all on buttons; no reduced-motion override; primary panels appear without entry continuity | Overbroad transitions and ungoverned motion | Immediate feedback and focus behavior | Specific 140 ms color transitions; restrained 160 ms drawer/palette entry, disabled for reduced motion | Agency, craft | P2 / High |
| Rendered: List names and sort headers look like miniature outlined pills | Action styling competes with tabular hierarchy | Sorting and project opening | Quiet link buttons, readable row rhythm, selected sort direction | Craft, familiarity | P2 / High |

Focus ring quality needs keyboard recheck after changes; programmatic focus following pointer input does not establish focus-visible behavior. Loading, error, screen-reader behavior and performance are not claimed from screenshots. Existing success/error code remains the source for preserved states.

## Direction and system delta

A focused local workspace: graphite and lime remain recognizable, with one strong action, compact context, stable controls and clear information groups. Keep fonts, semantic palette and token values. Reuse radius and color tokens; apply shared field/button proportions, quieter view eyebrows, row separators and a short optional panel entry. No new decorative signature: the lime active-view marker provides continuity.

Reference: [Apple HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout) — transfer alignment, hierarchy and recognizable adaptation. Do not transfer platform controls, materials, Apple composition or branding. Existing product is the primary visual reference; no unrelated moodboard is needed.

Scope guard: no data/schema/auth changes, no new dependencies, no IA redesign, no changes to date math, drag/drop, backup operations or project lifecycle. No global palette/font replacement, glass, blur or ornamental motion.

## Verification plan

Recapture baseline states, desktop/mobile; check 768 px, narrow 320 px, keyboard focus, command Escape/focus return, search/sort/empty state, drawer validation and persistence on isolated fixtures, reduced motion and all six view navigation. Run typecheck, lint, build, domain and database checks. Review actual renders and fix material regressions before completion.
