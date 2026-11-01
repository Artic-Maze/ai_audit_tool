import { AREA_LABELS } from "@/lib/checks/areas";
import { formatDate, Section, StatusIcon } from "./primitives";

const RESULTS = {
  true: { status: "good", label: "Passed" },
  false: { status: "critical", label: "Failed" },
  null: { status: null, label: "Not measured" },
};

export function Methodology({ report }) {
  const { crawl, limitations, checks } = report;
  return (
    <Section id="methodology" title="Methodology and limitations">
      <div className="rounded-2xl border bg-card p-5 text-sm sm:p-6">
        <p>
          We crawled the store&apos;s public storefront on{" "}
          {formatDate(crawl.startedAt)} ({crawl.requestCount} requests) and ran
          rule-based checks across five areas. Each area starts at 100 and loses
          the weight of every failed check; the overall score weights the areas.
          AI only writes the explanations and copy examples, so the same store
          data always gets the same scores.
        </p>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-muted-foreground">
          {limitations.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        {checks && (
          <details className="mt-5">
            <summary className="cursor-pointer font-bold">
              All {checks.length} checks
            </summary>
            <div className="mt-3">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-bold">
                      Check
                    </th>
                    <th
                      scope="col"
                      className="hidden py-2 pr-3 font-bold sm:table-cell"
                    >
                      Area
                    </th>
                    <th scope="col" className="py-2 pr-3 font-bold">
                      Result
                    </th>
                    <th scope="col" className="py-2 pr-3 font-bold">
                      Value
                    </th>
                    <th
                      scope="col"
                      className="hidden py-2 font-bold sm:table-cell"
                    >
                      Target
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((check) => {
                    const result = RESULTS[check.passed];
                    return (
                      <tr
                        key={check.id}
                        className="border-b align-top last:border-0"
                      >
                        <th scope="row" className="py-2 pr-3 font-medium">
                          {check.title}
                        </th>
                        <td className="hidden py-2 pr-3 text-muted-foreground sm:table-cell">
                          {AREA_LABELS[check.area]}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="inline-flex items-center gap-1.5">
                            <StatusIcon status={result.status} />
                            {result.label}
                          </span>
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {check.display}
                        </td>
                        <td className="hidden py-2 text-muted-foreground sm:table-cell">
                          {check.threshold}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </Section>
  );
}
