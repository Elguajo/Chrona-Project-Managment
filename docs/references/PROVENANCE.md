# External-source provenance

## Console — UI audit

- Repository: <https://github.com/begadwael/console>
- Audited commit: `ddaf9d76e9147f1505c1d61b45087e5a65f6fc62`
- License: MIT, copyright (c) 2026 Begad Wael
- Audited paths: `components/quick-add/QuickAdd.tsx`, `app/projects/ProjectsClient.tsx`, and `app/templates/TemplatesClient.tsx`.

Chrona uses the audited interaction concepts: one visible Quick Add entry point plus `⌘/Ctrl+K`, template preview counts, and starter-template duplication. No Console source code, styles, storage code, JSON collection layer, MCP integration, or other substantial portions were copied. The Chrona implementation is clean-room code using its existing SQLite/Drizzle Project aggregate, so no third-party source notice is required in application files.
