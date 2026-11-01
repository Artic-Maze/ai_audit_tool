import { cn } from "@/lib/utils";

// Impact and effort are whole numbers 1–5; each value gets its own band and
// sits at the band's center. Returns a percentage along the axis.
const position = (value) => ((value - 0.5) / 5) * 100;

// Center-to-center distance between markers sharing a cell: a 24px marker
// plus its 2px surface ring on each side.
const SPACING = 28;

// Integer scales put several opportunities in the same cell, so spread each
// cell's markers in rows of up to three around its center.
function placeMarkers(opportunities) {
  const cells = new Map();
  opportunities.forEach((o, i) => {
    const key = `${o.effort}:${o.impact}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push({ ...o, n: i + 1 });
  });
  return [...cells.values()].flatMap((group) => {
    const rows = Math.ceil(group.length / 3);
    return group.map((o, i) => {
      const row = Math.floor(i / 3);
      const inRow = Math.min(3, group.length - row * 3);
      return {
        ...o,
        dx: ((i % 3) - (inRow - 1) / 2) * SPACING,
        dy: (row - (rows - 1) / 2) * SPACING,
      };
    });
  });
}

// Quadrants split between 2 and 3 on both scales, matching the roadmap:
// impact 3+ with effort 1–2 is a quick win.
const SPLIT_X = position(2.5);
const SPLIT_Y = 100 - position(2.5);
const QUADRANTS = [
  {
    label: "Quick wins",
    box: [0, 0, SPLIT_X, SPLIT_Y],
    corner: "top-2 left-2.5",
    className: "rounded-tl-lg bg-signal/10",
  },
  {
    label: "Big bets",
    box: [SPLIT_X, 0, 100, SPLIT_Y],
    corner: "top-2 right-2.5",
    className: "border-l",
  },
  {
    label: "Nice to have",
    box: [0, SPLIT_Y, SPLIT_X, 100],
    corner: "bottom-2 left-2.5",
    className: "border-t",
  },
  {
    label: "Low priority",
    box: [SPLIT_X, SPLIT_Y, 100, 100],
    corner: "bottom-2 right-2.5",
    className: "border-t border-l",
  },
];

const TICKS = [1, 2, 3, 4, 5];

// A scatter of the opportunities on impact (up) and effort (right). Each
// marker carries the opportunity's number; hovering or focusing it shows the
// details. The opportunity list below is the chart's table view.
export function ImpactEffortMatrix({ opportunities }) {
  return (
    <figure className="rounded-2xl border bg-card p-4 sm:p-6">
      <div className="grid grid-cols-[1.25rem_1fr] gap-x-2">
        <p className="col-start-2 mb-2 text-xs font-bold text-muted-foreground">
          Impact ↑
        </p>

        <div
          aria-hidden="true"
          className="relative text-xs text-muted-foreground"
        >
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 tabular-nums"
              style={{ top: `${100 - position(t)}%` }}
            >
              {t}
            </span>
          ))}
        </div>

        <div
          role="group"
          aria-label="Impact and effort of each opportunity, from 1 to 5"
          className="relative aspect-[4/3] rounded-lg border sm:aspect-[16/9]"
        >
          {QUADRANTS.map(
            ({ label, box: [x1, y1, x2, y2], corner, className }) => (
              <div
                key={label}
                className={cn("absolute border-border", className)}
                style={{
                  left: `${x1}%`,
                  top: `${y1}%`,
                  width: `${x2 - x1}%`,
                  height: `${y2 - y1}%`,
                }}
              >
                <span
                  className={cn(
                    "absolute text-[11px] font-bold tracking-[0.06em] text-muted-foreground uppercase",
                    corner,
                  )}
                >
                  {label}
                </span>
              </div>
            ),
          )}

          {placeMarkers(opportunities).map((o) => (
            <span
              key={o.id}
              tabIndex={0}
              role="img"
              aria-label={`${o.n}. ${o.title}: impact ${o.impact} of 5, effort ${o.effort} of 5`}
              className="group absolute z-10 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                left: `calc(${position(o.effort)}% + ${o.dx}px)`,
                top: `calc(${100 - position(o.impact)}% + ${o.dy}px)`,
              }}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-growth text-xs font-bold text-white ring-2 ring-card transition-transform group-hover:scale-110">
                {o.n}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none invisible absolute bottom-full mb-1 w-max max-w-56 rounded-lg bg-ink px-3 py-2 text-left text-xs text-white shadow-lg group-hover:visible group-focus-visible:visible",
                  o.effort <= 1
                    ? "left-0"
                    : o.effort >= 4
                      ? "right-0"
                      : "left-1/2 -translate-x-1/2",
                )}
              >
                <strong className="block text-sm">
                  Impact {o.impact} · Effort {o.effort}
                </strong>
                {o.n}. {o.title}
              </span>
            </span>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="relative col-start-2 h-6 text-xs text-muted-foreground"
        >
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute top-1.5 -translate-x-1/2 tabular-nums"
              style={{ left: `${position(t)}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <p className="col-start-2 text-right text-xs font-bold text-muted-foreground">
          Effort →
        </p>
      </div>
      <figcaption className="mt-4 text-sm text-muted-foreground">
        Each number matches an opportunity below. Quick wins, high impact for
        low effort, sit in the shaded top-left corner.
      </figcaption>
    </figure>
  );
}
