# Implementation Notes — Configurable Portfolio Module

## What was implemented

Shared portfolio core (dashboard, registry, form, detail, workflow, relationships, audit) plus **organization-configurable governance**:

| Area | Location |
|------|----------|
| Policy model | `web-core/src/models/domain.ts` → `OrgPortfolioPolicy` on `Organization` |
| Presets / validation | `web-core/src/lib/orgPortfolioPolicy.ts` |
| Hook | `web-core/src/hooks/useOrgPortfolioPolicy.ts` |
| Auth persistence | `AuthContext.updateOrganizationPortfolioPolicy` / client type sync |
| Enforcement | `portfolioWorkflow.ts`, `HierarchyStore` (workflow + relationships), form/detail, `portfolioPermissions.ts` |
| Settings UI | `OrganizationPortfolioSettingsPage` → `/settings/portfolio` |
| Seed | `SEED_ORG.portfolioPolicy` government preset; `DEMO_DATA_VERSION = 20261107` |
| Small client modules | Portfolio enabled for small-business profile |

## Existing services reused

HierarchyStore, relationship engine, RBAC `managePortfolio`, DataStore departments, PageHeader/Card/Button patterns, portfolio seed extras.

## How profiles work

- Three presets: `PORTFOLIO_POLICY_PRESETS.small|enterprise|government`.
- Selecting a template or `updateOrganizationClientType` loads matching defaults.
- Custom edits set `profileTemplate: "custom"` while remaining one codebase path.

## How workflow is enforced

`applyWorkflowAction(portfolio, action, { policy })` validates transitions, reasons, SoD, and stage-gated submission/activation rules. Simple mode allows approve from `submitted`.

## How permissions are enforced (demo)

UI hiding + store checks. **Not** production API authorization. Documented as simulated.

## Known limitations / simulated

- No separate `WorkflowInstance` / `ApprovalDecision` tables — status + audit + policy version comment.
- Budget “requires approval” blocks over-threshold changes with a message; does not spawn a parallel change-request workflow.
- Policy changes do not freeze historical workflow definitions on each portfolio (production should pin version on instance).
- Notifications remain primarily audit-driven.
- Document vault not added; government “documents required” uses supporting text fields as demo proxy.

## Future production hardening

1. Server-side policy and permission enforcement.
2. Pin `workflowVersionId` on submit; migrate explicitly.
3. Real document attachments and funding classifications.
4. Multi-currency conversion policy service.
5. First-class `PermissionKey` entries for each Portfolio.* action in RBAC matrix.
