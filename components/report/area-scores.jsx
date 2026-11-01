import { GRADE_STATUS } from "@/lib/report/status";
import { GradeLabel, Meter } from "./primitives";

function checksLine({ score, passed, failed, unknown }) {
  const measured = passed + failed;
  if (score === null) {
    return `Not enough data: ${unknown} of ${measured + unknown} checks couldn't be measured.`;
  }
  const result = failed
    ? `${failed} of ${measured} checks failed`
    : `All ${measured} checks passed`;
  return unknown ? `${result} · ${unknown} not measured` : result;
}

export function AreaScores({ areas }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {areas.map((area) => (
        <li
          key={area.area}
          className="flex flex-col rounded-2xl border bg-card p-4"
        >
          <h3 className="text-sm font-bold">{area.label}</h3>
          <p className="mt-2 text-3xl font-extrabold tracking-[-0.02em]">
            {area.score ?? "–"}
            <span className="text-sm font-bold text-muted-foreground">
              /100
            </span>
          </p>
          <div className="mt-3">
            <Meter
              value={area.score}
              status={GRADE_STATUS[area.grade]}
              label={`${area.label} score`}
            />
          </div>
          <GradeLabel grade={area.grade} className="mt-3" />
          <p className="mt-1 text-xs text-muted-foreground">
            {checksLine(area)}
          </p>
        </li>
      ))}
    </ul>
  );
}
