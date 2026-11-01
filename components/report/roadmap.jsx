import { NumberBadge } from "./primitives";

const PHASE_NAMES = { 1: "Quick wins", 2: "Bigger projects", 3: "Later" };

export function Roadmap({ roadmap, opportunities }) {
  const numbered = new Map(
    opportunities.map((o, i) => [o.id, { ...o, n: i + 1 }]),
  );
  return (
    <ol className="grid gap-3 md:grid-cols-3">
      {roadmap.map((phase) => (
        <li key={phase.phase} className="rounded-2xl border bg-card p-5">
          <h3 className="text-lg font-extrabold tracking-[-0.01em]">
            {phase.label}
          </h3>
          <p className="text-xs text-muted-foreground">
            {PHASE_NAMES[phase.phase]} · {phase.rule.toLowerCase()}
          </p>
          {phase.opportunityIds.length ? (
            <ul className="mt-4 space-y-3">
              {phase.opportunityIds.map((id) => {
                const o = numbered.get(id);
                return (
                  <li key={id} className="flex gap-2.5 text-sm">
                    <NumberBadge n={o.n} />
                    <span className="pt-0.5">{o.title}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Nothing in this phase.
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
