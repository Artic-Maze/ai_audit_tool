import { fmtMs } from "@/lib/checks/format";
import { SPEED_LABELS, speedStatus } from "@/lib/report/status";
import { StatusIcon } from "./primitives";

const ROWS = [
  ["homepage", "mobile", "Homepage, mobile"],
  ["homepage", "desktop", "Homepage, desktop"],
  ["product", "mobile", "Product page, mobile"],
  ["product", "desktop", "Product page, desktop"],
];

const fmtCls = (value) => String(Math.round(value * 100) / 100);

// LCP and CLS prefer real-user (field) data over the lab run; INP only
// exists as field data.
const METRICS = [
  {
    label: "Score",
    metric: "score",
    format: String,
    read: (run) => run.lab.performanceScore,
  },
  {
    label: "LCP",
    metric: "lcpMs",
    format: fmtMs,
    read: (run) => run.field?.lcpMs ?? run.lab.lcpMs,
  },
  {
    label: "CLS",
    metric: "cls",
    format: fmtCls,
    read: (run) => run.field?.cls ?? run.lab.cls,
  },
  {
    label: "INP",
    metric: "inpMs",
    format: fmtMs,
    read: (run) => run.field?.inpMs,
  },
];

function Value({ metric, value, format }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">No data</span>;
  }
  const status = speedStatus(metric, value);
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusIcon status={status} />
      {format(value)}
      <span className="sr-only"> ({SPEED_LABELS[status]})</span>
    </span>
  );
}

export function Performance({ performance }) {
  if (performance.status !== "ok") {
    return (
      <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        PageSpeed data wasn&apos;t available for this audit.
      </p>
    );
  }
  const rows = ROWS.map(([page, strategy, label]) => ({
    label,
    run: performance.data.runs.find(
      (r) => r.page === page && r.strategy === strategy,
    ),
  })).filter((row) => row.run);

  return (
    <div className="rounded-2xl border bg-card">
      {/* Phones: one block per page, metrics in a 2×2 grid. */}
      <ul className="divide-y sm:hidden">
        {rows.map(({ label, run }) => (
          <li key={label} className="px-5 py-4">
            <p className="font-medium">{label}</p>
            {run.status === "ok" ? (
              <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm tabular-nums">
                {METRICS.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between gap-2"
                  >
                    <dt className="text-muted-foreground">{m.label}</dt>
                    <dd>
                      <Value
                        metric={m.metric}
                        value={m.read(run)}
                        format={m.format}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Unavailable</p>
            )}
          </li>
        ))}
      </ul>

      <table className="hidden w-full text-sm tabular-nums sm:table">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th scope="col" className="px-5 py-3 font-bold">
              Page
            </th>
            {METRICS.map((m) => (
              <th key={m.label} scope="col" className="px-3 py-3 font-bold">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, run }) => (
            <tr key={label} className="border-b last:border-0">
              <th scope="row" className="px-5 py-3 text-left font-medium">
                {label}
              </th>
              {run.status === "ok" ? (
                METRICS.map((m) => (
                  <td key={m.label} className="px-3 py-3">
                    <Value
                      metric={m.metric}
                      value={m.read(run)}
                      format={m.format}
                    />
                  </td>
                ))
              ) : (
                <td
                  colSpan={METRICS.length}
                  className="px-3 py-3 text-muted-foreground"
                >
                  Unavailable
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col gap-3 border-t px-5 py-4 text-xs text-muted-foreground">
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {["good", "warning", "critical"].map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <StatusIcon status={status} />
              {SPEED_LABELS[status]}
            </span>
          ))}
        </p>
        <p>
          Score is Google&apos;s Lighthouse lab test (out of 100). LCP (main
          content shown), CLS (layout shift) and INP (response to taps) use real
          Chrome user data where it exists; INP has no lab version.
        </p>
      </div>
    </div>
  );
}
