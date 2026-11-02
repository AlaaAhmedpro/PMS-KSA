import type { OrgPortfolioPolicy } from "../../models/domain";
import {
  PORTFOLIO_STATUS_LABELS,
  type PortfolioStatus,
} from "../../lib/portfolioDomain";
import { cn } from "../../lib/cn";
import { Check } from "lucide-react";

type StepKey =
  | "draft"
  | "submitted"
  | "review"
  | "approval"
  | "approved"
  | "active"
  | "closed";

type StepDef = {
  key: StepKey;
  label: string;
  match: PortfolioStatus[];
};

function stepsForPolicy(policy: OrgPortfolioPolicy): StepDef[] {
  const hasReview =
    policy.workflowMode !== "simple" &&
    policy.stages.some((s) => s.key === "review" && s.enabled);

  if (!hasReview) {
    return [
      {
        key: "draft",
        label: PORTFOLIO_STATUS_LABELS.draft,
        match: ["draft", "returned"],
      },
      {
        key: "submitted",
        label: PORTFOLIO_STATUS_LABELS.submitted,
        match: ["submitted"],
      },
      {
        key: "approved",
        label: PORTFOLIO_STATUS_LABELS.approved,
        match: ["approved", "pending_approval", "under_review"],
      },
      {
        key: "active",
        label: PORTFOLIO_STATUS_LABELS.active,
        match: ["active", "on_hold"],
      },
      {
        key: "closed",
        label: PORTFOLIO_STATUS_LABELS.closed,
        match: ["closed", "archived"],
      },
    ];
  }

  return [
    {
      key: "draft",
      label: PORTFOLIO_STATUS_LABELS.draft,
      match: ["draft", "returned"],
    },
    {
      key: "submitted",
      label: PORTFOLIO_STATUS_LABELS.submitted,
      match: ["submitted"],
    },
    {
      key: "review",
      label: PORTFOLIO_STATUS_LABELS.under_review,
      match: ["under_review"],
    },
    {
      key: "approval",
      label: PORTFOLIO_STATUS_LABELS.pending_approval,
      match: ["pending_approval"],
    },
    {
      key: "approved",
      label: PORTFOLIO_STATUS_LABELS.approved,
      match: ["approved"],
    },
    {
      key: "active",
      label: PORTFOLIO_STATUS_LABELS.active,
      match: ["active", "on_hold"],
    },
    {
      key: "closed",
      label: PORTFOLIO_STATUS_LABELS.closed,
      match: ["closed", "archived"],
    },
  ];
}

function currentStepIndex(
  status: PortfolioStatus,
  steps: StepDef[],
): number {
  if (status === "rejected") {
    return Math.max(
      0,
      steps.findIndex((s) => s.key === "submitted"),
    );
  }
  const idx = steps.findIndex((s) => s.match.includes(status));
  return idx < 0 ? 0 : idx;
}

const SIDE_NOTE: Partial<Record<PortfolioStatus, string>> = {
  returned: PORTFOLIO_STATUS_LABELS.returned,
  rejected: PORTFOLIO_STATUS_LABELS.rejected,
  on_hold: PORTFOLIO_STATUS_LABELS.on_hold,
  archived: PORTFOLIO_STATUS_LABELS.archived,
};

/** Olive green matching the reference stepper */
const DONE = "#6B8F3C";
const DONE_SOFT = "#C5D9A8";
const DONE_RING = "#E4EFCF";
const LINE_MUTED = "#D8DEE8";

export function PortfolioLifecycleStepper({
  status,
  policy,
  className,
}: {
  status?: string | null;
  policy: OrgPortfolioPolicy;
  className?: string;
}) {
  const current = (status || "draft") as PortfolioStatus;
  const steps = stepsForPolicy(policy);
  const activeIndex = currentStepIndex(current, steps);
  const sideNote = SIDE_NOTE[current];
  const rejected = current === "rejected";
  const fullyDone = current === "closed" || current === "archived";

  const progressRatio =
    steps.length <= 1
      ? 0
      : fullyDone
        ? 1
        : activeIndex / (steps.length - 1);

  return (
    <div className={cn(className)}>
      {sideNote ? (
        <p
          className={cn(
            "mb-2 text-center text-[11px] font-bold",
            rejected ? "text-red-600" : "text-amber-700",
          )}
        >
          {sideNote}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <div className="relative mx-auto min-w-[40rem] max-w-4xl">
          {/* Base line */}
          <div
            className="pointer-events-none absolute inset-x-7 top-[16px] h-[2px] rounded-full"
            style={{ backgroundColor: LINE_MUTED }}
          />
          {/* Progress line */}
          <div
            className="pointer-events-none absolute top-[16px] h-[2px] rounded-full transition-[width] duration-150 ease-out"
            style={{
              insetInlineStart: "1.75rem",
              width: `calc((100% - 3.5rem) * ${progressRatio})`,
              backgroundColor: rejected ? "#F87171" : DONE,
            }}
          />

          <ol className="relative z-[1] flex items-start justify-between gap-1">
            {steps.map((step, i) => {
              const done =
                !rejected &&
                (i < activeIndex || (i === activeIndex && fullyDone));
              const active = i === activeIndex && !fullyDone;

              return (
                <li
                  key={step.key}
                  className="flex min-w-[4.5rem] flex-1 flex-col items-center sm:min-w-[5.5rem]"
                >
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    {active ? (
                      <>
                        <span
                          aria-hidden
                          className="absolute h-8 w-8 rounded-full border-2"
                          style={{ borderColor: DONE_RING }}
                        />
                        <span
                          aria-hidden
                          className="absolute h-[26px] w-[26px] rounded-full border"
                          style={{ borderColor: DONE_SOFT }}
                        />
                        <span
                          className="relative flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 bg-white text-[11px] font-extrabold tabular-nums"
                          style={{
                            borderColor: rejected ? "#EF4444" : DONE,
                            color: rejected ? "#DC2626" : DONE,
                          }}
                        >
                          {i + 1}
                        </span>
                      </>
                    ) : done ? (
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: rejected ? "#F87171" : DONE,
                        }}
                      >
                        <Check
                          className="h-3 w-3 text-white"
                          strokeWidth={3}
                          aria-hidden
                        />
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-steel-300 bg-white text-[10px] font-bold tabular-nums text-steel-400 dark:border-steel-600 dark:bg-steel-900">
                        {i + 1}
                      </span>
                    )}
                  </div>

                  <span
                    className={cn(
                      "mt-2 max-w-[6.5rem] text-center text-[11px] leading-snug sm:max-w-[7.5rem]",
                      active
                        ? rejected
                          ? "font-extrabold text-red-600"
                          : "font-extrabold"
                        : done
                          ? "font-bold text-steel-700 dark:text-steel-200"
                          : "font-semibold text-steel-400",
                    )}
                    style={
                      active && !rejected ? { color: DONE } : undefined
                    }
                    title={step.label}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
