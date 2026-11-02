# Organization Profile Comparison (Starter Templates)

Profiles are **defaults**, not hard product forks. Administrators customize them under `/settings/portfolio`. One shared portfolio core enforces `OrgPortfolioPolicy`.

| Dimension | Small Business | Large Enterprise | Government Entity |
|-----------|----------------|------------------|-------------------|
| Profile template id | `small` | `enterprise` | `government` |
| Workflow mode | `simple` | `standard` | `formal` |
| Default stages | Executive / owner only | PMO → Finance → Executive | Strategy/PMO → Finance → Authorized decision |
| Required at submit (defaults) | Minimal (name, description, owner, code) | + sponsor, planned budget, department | + sponsor, objectives, planned budget, start date, department, supporting notes |
| Strategic objectives mandatory | No | No (optional advanced) | Yes on submit |
| Budget required on submit | No | Yes | Yes |
| Documents / supporting info | No | No | Yes (budget notes / success metrics proxy in demo) |
| Direct portfolio↔project link | Allowed | Allowed | Allowed (configurable) |
| Lock fields after approval | No | Yes | Yes |
| Separation of duties | Yes | Yes | Yes |
| Budget change approval | Off by default | On (threshold 100,000 SAR) | On (threshold 50,000 SAR) |
| Variance warning | 20% | 10% | 5% |
| Modules enabled with client type | Portfolio (+ projects) | Portfolio, program, objectives | Full strategic stack |
| Reporting expectation | Basic dashboard | Org / BU filters, KPI-oriented | Governance + audit timeline |
| Audit expectation | Lightweight event log | Full lifecycle + budget notes | Formal decisions with reasons + policy version in audit comment |

## Defaults vs enforced constraints

**Defaults (customizable):** stage names, which stages are enabled, required-field flags, thresholds, relationship types, currency, fiscal year start, profile template label.

**Enforced by product (not duplicating three apps):**

- Unique portfolio code; date range validity.
- Transitions only via `portfolioWorkflow` + active policy (no free status edits).
- Policy version recorded on workflow audit entries.
- In-progress instances are not rewritten when configuration changes; new submissions use the saved policy.
- No cross-currency aggregation without a conversion rule (demo: single currency per portfolio).
- Removing a relationship does not delete the target entity.

## Changing profiles safely

1. Open **حوكمة المحافظ** → load a template or edit flags.
2. Review **معاينة قبل الحفظ**.
3. Confirm save. Workflow definition changes bump `portfolioPolicy.version`.
4. Existing portfolio statuses remain; subsequent actions evaluate against the **current** organization policy (demo simplification). Production should pin workflow version on the instance.
