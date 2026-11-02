---
name: ux
description: >-
  Applies PMS-KSA product UX and visual rules for self-serve enterprise Arabic
  UI. Use when the user invokes /UX, asks for UI/UX review, redesign, filters,
  tables, auth/onboarding flows, or page polish in web-core.
disable-model-invocation: true
---

# /UX — PMS-KSA interface craft

Read and follow workspace `.cursor/rules/design.mdc` first. This skill adds
execution habits for UI work; it does not replace those tokens/rules.

## When invoked

1. Open the target page and its nearest approved reference (projects list,
   portfolios manage, login, people).
2. Propose changes only if they match existing patterns; ask before inventing
   a new visual pattern.
3. Implement one surface at a time; stop for review after the page/step.

## Self-serve enterprise tone

- Formal Arabic, short labels, no exclamation marks, no emojis.
- One primary action per view; secondary actions outline/ghost.
- Production states always: empty, loading skeleton if async, error with
  actionable text, validation, pagination on lists.

## Layout checklist

- Page order: breadcrumb (if any) → title → actions inline-end → filters/search → content.
- Tables: `Card overflow-hidden p-0`, `table-fixed`, header `bg-steel-50`,
  row `~40px`, status badges muted 4px radius.
- Filters: solid brand pill when active (`border-brand-500 bg-brand-500 text-white`)
  like Projects scope tabs.
- Search: plain `Input` in `grid gap-2 sm:grid-cols-2` with optional
  `SearchableSelect` — match Projects/Portfolios manage.
- Prefer `NativeSelect` inside table cells (avoid clipped SearchableSelect).

## Auth / people flows

- Prefer provision by email: temp password **or** activation link (no invite token as primary).
- Demo mail: show in-app preview + sent-mail log; never claim real SMTP.
- Force change-password gate when `mustChangePassword`; block login when
  `emailVerified === false` until `/activate`.
- Keep login formal and compact; no marketing hero inside app shell pages.

## Density and motion

- Typography/spacing from tokens only (12–24 / 4–32).
- Motion ≤ 150ms opacity/transform.
- Icons: Material/lucide sparingly; not beside every heading.

## After edits

Audit against design.mdc (colors, radius ≤ 8, shadows, RTL logical props,
seed realism, typing) and list fixes in the reply.
