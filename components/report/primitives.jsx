import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GRADE_STATUS } from "@/lib/report/status";
import { gradeLabel } from "@/lib/scoring/score";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});
export const formatDate = (iso) => dateFormat.format(new Date(iso));

export function Eyebrow({ className, children }) {
  return (
    <p
      className={cn(
        "text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Section({ id, title, description, className, children }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("mt-14", className)}
    >
      <h2
        id={`${id}-title`}
        className="text-2xl font-extrabold tracking-[-0.02em]"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

// Same look as the impact/effort matrix markers, so cards and chart connect.
export function NumberBadge({ n, className }) {
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground",
        className,
      )}
    >
      {n}
    </span>
  );
}

export function Tag({ children }) {
  return (
    <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

const STATUS_ICONS = {
  good: CircleCheck,
  warning: CircleAlert,
  serious: TriangleAlert,
  critical: CircleX,
};
const STATUS_TEXT = {
  good: "text-status-good",
  warning: "text-status-warning",
  serious: "text-status-serious",
  critical: "text-status-critical",
};

// The icon half of every status cue; the text label is always beside it.
export function StatusIcon({ status, className }) {
  const Icon = STATUS_ICONS[status] ?? CircleDashed;
  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0",
        STATUS_TEXT[status] ?? "text-muted-foreground",
        className,
      )}
    />
  );
}

export function GradeLabel({ grade, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-bold",
        className,
      )}
    >
      <StatusIcon status={GRADE_STATUS[grade]} />
      {gradeLabel(grade)}
    </span>
  );
}

// The fill carries the status; the track is a lighter step of the same hue.
const METER_FILL = {
  good: "bg-status-good",
  warning: "bg-status-warning",
  serious: "bg-status-serious",
};
const METER_TRACK = {
  good: "bg-status-good/15",
  warning: "bg-status-warning/20",
  serious: "bg-status-serious/20",
};

export function Meter({ value, status, label }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      aria-valuetext={
        value === null ? "Not enough data" : `${value} out of 100`
      }
      className={cn(
        "h-2 w-full overflow-hidden rounded-[4px]",
        METER_TRACK[status] ?? "bg-muted",
      )}
    >
      {value !== null && (
        <div
          className={cn("h-full rounded-r-[4px]", METER_FILL[status])}
          style={{ width: `${value}%` }}
        />
      )}
    </div>
  );
}

// Impact or effort on the 1–5 scale: five pips plus the number.
export function Rating({ label, value }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <span aria-hidden="true" className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-3.5 first:rounded-l-[3px] last:rounded-r-[3px]",
              i <= value ? "bg-growth" : "bg-muted-foreground/25",
            )}
          />
        ))}
      </span>
      <span className="text-muted-foreground">{value}/5</span>
    </span>
  );
}
