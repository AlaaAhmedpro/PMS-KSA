# Portfolio Business Rules (Implemented)

## Required fields by lifecycle stage

Controlled by `OrgPortfolioPolicy` via `validatePortfolioAgainstPolicy`:

| Stage | Source | Typical checks |
|-------|--------|----------------|
| Create / draft save | `requiredAtCreate` | name, description, ownerUserId, code |
| Submit / resubmit | `requiredAtSubmit` + flags | sponsor, objectives, planned budget, start date, department, supporting notes |
| Activate | `requiredAtActivate` | approvedBudgetSar when listed |

Always: end date ≥ start date; non-negative budgets; unique code (form + seed).

## Organization policy precedence

1. Explicit `organization.portfolioPolicy` (normalized).
2. Else preset from `organization.clientType`.
3. Workflow actions receive policy from HierarchyStore (active org).

No scattered `if (clientType === 'government')` in pages — use policy flags/services.

## Workflow transitions

- Defined in `services/portfolioWorkflow.ts` and adjusted by `workflowMode` / enabled stages.
- Status cannot be set arbitrarily from the UI.
- Reasons required for return/reject/suspend/close per transition + policy flags.
- Separation of duties: submitter cannot approve/reject when `separationOfDuties` is true.

## Permission evaluation (demo)

- RBAC `managePortfolio` / roles (`org_admin`, `executive`, …) via `portfolioPermissions.ts`.
- Configure policies: `org_admin` / `system_admin` only.
- **Simulated:** frontend + in-memory store checks only — not production API authz.

## Financial rules

- Remaining ≈ approved − actual (same currency scope).
- Variance warning when `|variance|/approved * 100 ≥ varianceWarningPct`.
- Budget change after approval may be blocked when `budgetChangeRequiresApproval` and delta ≥ threshold (demo blocks with message; does not open a second workflow engine).
- No summing across SAR/AED without conversion (not implemented — prevent mixed aggregates).

## Relationship validation

- `validateRelationship` (cycles, duplicates, type compatibility).
- Policy: `allowedRelationshipTypes`, `allowDirectProjectLink`.
- Remove relationship ≠ delete entity; FK side-effects cleared via `relationshipSync`.

## Audit requirements

- create / update / each workflow action → `portfolioAudit` with actor, from/to status, comment (includes policy version on workflow).

## Configuration versioning

- Saving stage/mode changes increments `portfolioPolicy.version`.
- Preview + confirm before save in settings UI.
- Demo does **not** pin a frozen workflow document on each portfolio instance (documented limitation).

## Error handling

- Workflow returns `{ ok: false, reason }` shown in UI.
- Invalid policy config blocked at save.

## Concurrency

- Demo: last write wins in localStorage. No optimistic locking.

## Closure and archival

- Close requires reason; archive from closed/rejected only.
- Closed/archived: no ordinary budget edits.
