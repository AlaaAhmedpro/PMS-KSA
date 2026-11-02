# Portfolio Management — Documentation Index

Enterprise Portfolio Management for the **web-core** PMS demo (`pms-ksa-core`), including **configurable organization profiles** (Small Business / Large Enterprise / Government Entity) on one shared core.

## How to render diagrams

- GitHub / GitLab / Azure DevOps Markdown preview (Mermaid supported).
- VS Code / Cursor: Mermaid preview extensions.
- CLI (optional): `npx @mermaid-js/mermaid-cli -i portfolio-lifecycle.mmd -o out.svg`

## Files

| File | Description |
|------|-------------|
| `portfolio-feature-architecture.mmd` | Feature architecture (existing + new policy layer) |
| `portfolio-erd.mmd` | Entity relationship diagram |
| `organization-profile-comparison.md` | Profile defaults vs constraints |
| `portfolio-lifecycle.mmd` | Lifecycle state machine |
| `workflow-configuration.mmd` | Admin configures and activates policy/workflow |
| `portfolio-approval-workflows.mmd` | Sample workflows for three profiles |
| `portfolio-approval-workflow.mmd` | Earlier single-path diagram (kept for reference) |
| `portfolio-role-permission-matrix.md` | Role × action matrix |
| `portfolio-relationship-model.mmd` | Containment vs alignment vs dependency |
| `portfolio-user-flows.mmd` | Key user interaction flows |
| `portfolio-business-rules.md` | Business rules and edge cases |
| `portfolio-implementation-notes.md` | Files, limitations, demo vs production |

## Primary routes (web-core)

- `/portfolios` — Portfolios with tabs (`tab=dashboard` | `tab=manage`); `/portfolios/dashboard` redirects to dashboard tab
- `/portfolios/new` — Create wizard
- `/portfolios/:id` — Details (tabs)
- `/portfolios/:id/edit` — Edit wizard
- `/settings/portfolio` — Organization portfolio governance settings
- `/strategy` — Cross-entity strategic overview
