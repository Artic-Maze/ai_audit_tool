import { GRADE_STATUS } from "@/lib/report/status";
import { GradeLabel } from "./primitives";

const ARC = {
  good: "stroke-status-good",
  warning: "stroke-status-warning",
  serious: "stroke-status-serious",
};
const TRACK = {
  good: "stroke-status-good/15",
  warning: "stroke-status-warning/20",
  serious: "stroke-status-serious/20",
};

// The overall score: a ring meter around the hero number, with the grade
// as icon + label underneath.
export function ScoreDial({ score, grade, size = 176 }) {
  const status = GRADE_STATUS[grade];
  const stroke = 12;
  const center = size / 2;
  const radius = center - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <figure className="flex shrink-0 flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className={TRACK[status] ?? "stroke-muted"}
          />
          {score > 0 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
              transform={`rotate(-90 ${center} ${center})`}
              className={ARC[status]}
            />
          )}
        </svg>
        <p className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-extrabold tracking-[-0.02em]">
            {score ?? "–"}
          </span>
          <span className="mt-1 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
            out of 100
          </span>
        </p>
      </div>
      <figcaption className="mt-3">
        <GradeLabel grade={grade} />
      </figcaption>
    </figure>
  );
}
