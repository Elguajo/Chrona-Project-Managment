# Phase 09 Completion — UX and Usability Audit

Status: COMPLETED · 2026-09-05

## Outcome

The core model is understandable: one local owner maintains Projects, with Dashboard for attention, Kanban for status, Timeline for timing, Calendar for dated commitments, List for data, and Templates for repeatable starts. Tasks, Milestones, and Documents belong inside Projects. Navigation between these projections worked in the browser. The visual identity was preserved.

The baseline contained material recovery and accessibility defects, especially loss of draft fields following server validation and a command palette that touch users could not directly close. Focused fixes improve error recovery, keyboard navigation, narrow layouts, and field readability. This is an expert audit with browser evidence, not a user study or full WCAG certification.

## Product and journeys inspected

- First visit to a fresh, empty portfolio; discovering Quick add and all six views.
- Blank Project creation, template-based Project creation, required template start date.
- List → drawer → edit → invalid dates → correction → save → reopen → full workspace.
- Workspace Task creation, Document creation with 4,649 saved characters, Milestone creation/completion, reload persistence, inline Project saving.
- Command search, no results, arrow-key selection, dismissal, focus return, Back and draft-discard cancellation/confirmation.
- Desktop and narrow layouts at 1440, 768, and 390 CSS px; horizontal tables/boards remain independently scrollable.

All browser mutations used a fresh temporary SQLite database at `/tmp/chrona-ux-ZclAI3`, served locally on port 3117. The user's database was not used. Production resources were not changed.

## Prioritized findings

No P0 blocker was observed in the exercised paths.

| ID / priority | Problem and user impact | Evidence | Principle / reference | Recommended change and disposition | Severity / confidence |
|---|---|---|---|---|---|
| U1 / P1 | Invalid Project dates erased other entered fields. Correcting only the deadline could save an unintended empty start/description. | Drawer: entered start `2026-09-01`, deadline `2026-08-01`, and description. After the error, start and description were both empty. | Error recovery; WAI form notifications; React form reset semantics. | Preserve submitted fields on domain errors. **Implemented** explicit client submission with pending fieldset and success feedback. | High / High |
| U2 / P1 | Command screen had no pointer/touch dismissal control. Users without Escape had no direct way back to the underlying screen. | Open Quick add: zero Close/Cancel buttons on its initial screen. | User control and freedom; keyboard/pointer equivalence. | Add a named Close button. **Implemented**, focus returns to the trigger. | High / High |
| U3 / P1 | Arrow selection went out of view, so Enter could run a command the user could not see. | Ninth downward move: selected option bottom 1029 px, list bottom 719 px, list scrollTop 0. | WAI combobox pattern and visible active descendant. | Scroll selection into view; complete combobox semantics and remove options from sequential Tab order. **Implemented**. | Medium / High |
| U4 / P1 | Back/type switching/dismissal could discard a Quick add draft without warning. | Enter Document title → Back → Create Document: title empty. | Error prevention; user control. | Confirm discarding changed drafts and prevent navigation during submission. **Implemented**; rejecting Back keeps the text. | High / High |
| U5 / P1 | Workspace task title was too narrow to review in the desktop drawer. | A 519 px task form allocated only 71.7 px to its title input. | Recognition rather than recall; responsive interaction quality. | Give title its own row and use two columns for remaining fields. **Implemented**; title input measured 493 px. | Medium / High |
| U6 / P1 | List/Kanban leaked horizontal page overflow; List filters also exceeded tablet space. | At 390 px, document width was 800 px in List and 654 px in Kanban. Absolute screen-reader-only text escaped its intended scroller. | Reflow; local scrolling instead of whole-page overflow. | Establish positioning context on scrollers and wrap List filters earlier. **Implemented**; document width equals viewport at 390/768/1440 px. | Medium / High |
| U7 / P2 | Search icon overlapped placeholder/input text. | Mobile List screenshot; unlayered `.field` padding overrode `pl-9`. | Readability; consistent form affordances. | Place the field primitive in the components cascade layer so utilities apply. **Implemented**, screenshot rechecked. | Medium / High |
| U8 / P2 | Empty Dashboard gives zero metrics and empty agenda sections but does not explain the first action locally. | Fresh database first visit: “Nothing overdue” / “No upcoming dated items,” with creation discoverable only in the header. | NN/g empty-state guidance. | Add a short first-project invitation connected to the existing create flow. **Recommendation**; validate wording and placement with the owner. | Low / Medium |
| U9 / P2 | Mobile header crowds identity and prioritizes backup controls ahead of everyday creation. | 390 px screenshot: product subtitle wraps over three lines; backup buttons stack above Quick add. | Hierarchy and efficiency; production command/search patterns. | Group secondary maintenance actions and test prominence of creation. **Recommendation**, no navigation redesign applied. | Low / High |
| U10 / P1 | Unsaved-change protection remains inconsistent outside Quick add. | Source inspection: ProjectDrawer close/Escape and workspace Back link do not inspect unsaved forms. Not independently reproduced as a post-fix browser loss case. | Error prevention and consistent recovery. | Define one scoped policy for drawer/workspace navigation, saved baselines, and browser Back before extending guards. **Recommendation**; avoid a broad document-wide interception change in this audit. | High / Medium |

## References used and boundaries

- [Linear: Search](https://linear.app/docs/search): production reference in the same work-management category. Relevant pattern: search is reachable through visible controls and keyboard shortcuts, with scoped navigation. Supports discoverability and efficient movement. Do not copy Linear's visual identity, cloud/team model, or add issue-management scope.
- [WAI: Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/): relevant to a searchable command list with focus retained in the input. Supports named combobox, controlled listbox, active descendant, arrow/Enter behavior. Do not add autocomplete modes or selection semantics the product does not need.
- [WAI: User notifications](https://www.w3.org/WAI/tutorials/forms/notifications/): relevant to failed validation and successful saving. Supports concise error/success messages that help users recover. Do not assume a generic live region constitutes a complete screen-reader audit.
- [NN/g: Designing empty states](https://www.nngroup.com/articles/empty-state-interface-design/): addresses first-use uncertainty and next-step guidance. Relevant to empty Dashboard. Do not copy large onboarding illustrations or introduce unnecessary setup steps.
- [React: form](https://react.dev/reference/react-dom/components/form): implementation explanation, not a UX benchmark. A resolved form action resets uncontrolled fields, including when its returned application result represents validation failure. Existing workspace forms already use explicit client submission; the Project form now follows that local pattern.

## Delivered / files

- `src/components/app/quick-add.tsx`: close control, command focus/scroll semantics, draft guard, disabled impossible child creation without a Project, submission guard, screen-reader creation notification. Integrated with pre-existing uncommitted command-navigation work.
- `src/components/projects/kanban-board.tsx`: retain failed Project draft fields, pending edit protection, inline success message, contain board overflow.
- `src/components/projects/project-workspace.tsx`: readable task editing in narrow containers.
- `src/components/projects/project-list.tsx`: tablet filter wrapping and contained table overflow.
- `src/app/globals.css`: allow field-specific utility padding.
- `docs/references/ux-2026-09-05/list-before.png`, `list-after.png`: observed mobile comparison.

## Verification evidence

- Browser regression: date error retained start and description; correction persisted both after reopening.
- Browser regression: selected command remained inside list bounds after 11 ArrowDown presses; Close returned focus to Quick add.
- Browser regression: rejecting the draft-discard confirmation preserved “Keep this draft”; accepting Cancel closed the dialog.
- Browser: no-results command state rendered, template missing start date failed native validation, template creation succeeded after supplying it.
- Browser: Task creation, long Document creation, Milestone completion/reload, and standalone “Project saved” feedback succeeded. Keyboard Enter launched Create Task from the palette; its submitted Task persisted after reload.
- Responsive DOM checks: List/Kanban/Timeline/Calendar document widths matched 390, 768, and 1440 px after fixes; Dashboard/Templates were also opened across these widths. Before/after mobile List screenshots inspected.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` — passed after final code changes.
- `pnpm test:domain`, `pnpm check:database` — passed; both use isolated databases.
- `git diff --check` — passed.
- Browser console query reported no errors or warnings in its returned session log. This is not evidence for every possible runtime state.

Some browser harness attempts required narrower locators (hidden mounted dialogs and native select elements), the correct Templates heading, and separate handling of native confirmations. Milestone completion is asynchronous, so verification waited for saved feedback and reload rather than immediate checkbox state.

## Decisions made / architectural impact

No dependencies, persistence schemas, domain validation rules, APIs, visual tokens, or product scope changed. Used existing native dialogs, native validation, Button/Field patterns, and server actions. Preserved all unrelated uncommitted work. No full redesign was warranted by the observed failures.

## Remaining recommendations and user testing

- Observe the owner on first project creation and return-to-work journeys: can they find the right view and action without prompting? Verify the 5–10 second orientation target with real users rather than expert judgment.
- Test whether Quick add should default to the current Project inside its workspace; this audit did not change ownership selection semantics.
- Test the dense mobile header and long workspace against real usage frequency before introducing tabs or hiding sections.
- Screen-reader testing (VoiceOver/NVDA), measured contrast, 200% zoom, extreme unbroken names, network-failure/loading-state injection, full backup browser round-trip, and drag/zoom stress tests were not completed in this audit. Domain tests cover backup/data behavior but do not replace those interaction checks.
- Draft guards are not a complete browser-navigation/data-loss solution; U10 remains a follow-up.
