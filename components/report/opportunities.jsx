import { AREA_LABELS } from "@/lib/checks/areas";
import { ROADMAP_PHASES } from "@/lib/scoring/roadmap";
import { NumberBadge, Rating, Tag } from "./primitives";

function OpportunityCard({ opportunity: o, n }) {
  return (
    <li
      id={`opportunity-${n}`}
      className="rounded-2xl border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <NumberBadge n={n} />
        <Tag>{AREA_LABELS[o.area]}</Tag>
        <Tag>{ROADMAP_PHASES[o.phase - 1].label}</Tag>
      </div>
      <h3 className="mt-3 text-lg font-extrabold tracking-[-0.01em]">
        {o.title}
      </h3>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="font-bold">What we found</dt>
          <dd className="mt-0.5 text-muted-foreground">{o.finding}</dd>
        </div>
        <div>
          <dt className="font-bold">What to build</dt>
          <dd className="mt-0.5">{o.recommendation}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <Rating label="Impact" value={o.impact} />
        <Rating label="Effort" value={o.effort} />
      </div>
      {o.estLift && (
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="font-bold">Estimated lift:</span> {o.estLift}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Based on: {o.basedOn.join(", ")}
      </p>
    </li>
  );
}

export function OpportunityList({ opportunities }) {
  return (
    <ol className="space-y-3">
      {opportunities.map((o, i) => (
        <OpportunityCard key={o.id} opportunity={o} n={i + 1} />
      ))}
    </ol>
  );
}
