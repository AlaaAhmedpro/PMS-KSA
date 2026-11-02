import { Check } from "lucide-react";
import type { ProjectStatus } from "../../models/domain";
import { PROJECT_STATUS_LABELS } from "../../lib/constants";
import { cn } from "../../lib/cn";

type StepKey = "draft" | "planned" | "active" | "completed";

type StepDef = {
  key: StepKey;
  label: string;
  match: ProjectStatus[];
};

const STEPS: StepDef[] = [
  {
    key: "draft",
    label: PROJECT_STATUS_LABELS.draft,
    match: ["draft"],
  },
  {
    key: "planned",
    label: PROJECT_STATUS_LABELS.planned,
    match: ["planned"],
  },
  {
    key: "active",
    label: PROJECT_STATUS_LABELS.active,
    match: ["active", "on_hold"],
  },
  {
    key: "completed",
    label: PROJECT_STATUS_LABELS.completed,
    match: ["completed"],
  },
];

const SIDE_NOTE: Partial<Record<ProjectStatus, string>> = {
  on_hold: PROJECT_STATUS_LABELS.on_hold,
  cancelled: PROJECT_STATUS_LABELS.cancelled,
};

/** Brand blue — Atlantis primary */
const DONE = "#3B6FE8";
const DONE_SOFT = "#A8C0F5";
const DONE_RING = "#E8EFFF";
const LINE_MUTED = "#D8DEE8";

function currentStepIndex(status: ProjectStatus): number {
  if (status === "cancelled") {
    return Math.max(
      0,
      STEPS.findIndex((s) => s.key === "planned"),
    );
  }
  const idx = STEPS.findIndex((s) => s.match.includes(status));
  return idx < 0 ? 0 : idx;
}

export function ProjectLifecycleStepper({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const activeIndex = currentStepIndex(status);
  const sideNote = SIDE_NOTE[status];
  const cancelled = status === "cancelled";
  const fullyDone = status === "completed";

  const progressRatio =
    STEPS.length <= 1
      ? 0
      : fullyDone
        ? 1
        : activeIndex / (STEPS.length - 1);

  return (
    <div className={cn(className)}>
      {sideNote ? (
        <p
          className={cn(
            "mb-2 text-center text-[11px] font-bold",
            cancelled ? "text-red-600" : "text-amber-700",
          )}
        >
          {sideNote}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <div className="relative mx-auto min-w-[28rem] max-w-3xl">
          <div
            className="pointer-events-none absolute inset-x-7 top-[16px] h-[2px] rounded-full"
            style={{ backgroundColor: LINE_MUTED }}
          />
          <div
            className="pointer-events-none absolute top-[16px] h-[2px] rounded-full transition-[width] duration-150 ease-out"
            style={{
              insetInlineStart: "1.75rem",
              width: `calc((100% - 3.5rem) * ${progressRatio})`,
              backgroundColor: cancelled ? "#F87171" : DONE,
            }}
          />

          <ol className="relative z-[1] flex items-start justify-between gap-1">
            {STEPS.map((step, i) => {
              const done =
                !cancelled &&
                (i < activeIndex || (i === activeIndex && fullyDone));
              const active = i === activeIndex && !fullyDone;

              return (
                <li
                  key={step.key}
                  className="flex min-w-[4.5rem] flex-1 flex-col items-center"
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
                            borderColor: cancelled ? "#EF4444" : DONE,
                            color: cancelled ? "#DC2626" : DONE,
                          }}
                        >
                          {i + 1}
                        </span>
                      </>
                    ) : done ? (
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: cancelled ? "#F87171" : DONE,
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
                      "mt-2 max-w-[6.5rem] text-center text-[11px] leading-snug",
                      active
                        ? cancelled
                          ? "font-extrabold text-red-600"
                          : "font-extrabold"
                        : done
                          ? "font-bold text-steel-700 dark:text-steel-200"
                          : "font-semibold text-steel-400",
                    )}
                    style={
                      active && !cancelled ? { color: DONE } : undefined
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
