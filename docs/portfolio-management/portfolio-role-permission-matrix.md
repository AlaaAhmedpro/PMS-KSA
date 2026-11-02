# Portfolio Role × Permission Matrix (Demo)

Mapped onto existing RBAC keys (`managePortfolio`, `viewStrategic`) plus role checks in `portfolioPermissions.ts`. Organization configuration uses `canConfigurePortfolioPolicies` (`org_admin` / `system_admin`).

| Action / capability | org_admin | executive | PMO / managePortfolio | finance-like role* | member |
|---------------------|-----------|-----------|----------------------|--------------------|--------|
| View dashboard / registry / details | Yes | Yes (viewStrategic) | Yes | If viewStrategic | If viewStrategic |
| Create / Edit (policy-gated fields) | Yes | Limited | Yes | No | No |
| Submit / Resubmit | Yes | Yes | Yes | No | No |
| Start review / Return / Recommend | Yes | No | Yes | Yes (demo) | No |
| Approve / Reject | Yes | Yes | No | Yes (demo) | No |
| Activate / Suspend / Resume / Close / Archive | Yes | Yes | Yes | No | No |
| Manage relationships | Yes | No* | Yes | No | No |
| Manage budget (direct) | Yes | Yes | Yes | No | No |
| Budget change over policy threshold | Blocked with message | Blocked | Blocked | — | — |
| View audit | Yes | Yes | Yes | View if can view | View if can view |
| Organization.ConfigurePortfolioPolicies | Yes | No | No | No | No |
| Approve own submission (SoD) | **Blocked** when policy.separationOfDuties | **Blocked** | n/a | **Blocked** | n/a |

\* Custom role ids containing `finance` are treated as finance reviewers in the demo permission helper. Executive often has `viewStrategic` only in the default matrix.

## Data-access scopes (demo)

| Scope | Behavior in demo |
|-------|------------------|
| Organization-wide | Seed data filtered by `session.organizationId` |
| Department | Portfolio `departmentId` field; not hard-scoped in queries yet |
| Assigned portfolio | Owner/team fields exist; list not filtered by owner unless UI filters applied |

## Separation of duties

Configured via `OrgPortfolioPolicy.separationOfDuties` (default true on all presets). Enforced in `applyWorkflowAction` for approve/reject.

## Notes

- Module visibility requires `enabledModules.portfolio`.
- Fine-grained `Portfolio.*` keys are **simulated** — recommended production step: promote to `PermissionKey` entries.
- Frontend + HierarchyStore checks only; no backend API authorization.
