// The report as viewers see it: every section, plus the names of the checks
// behind each opportunity. Internal metadata, like LLM usage, is never sent.
export function viewReport(report) {
  const titles = new Map(report.checks.map((c) => [c.id, c.title]));
  return {
    generatedAt: report.generatedAt,
    store: report.store,
    scores: report.scores,
    summary: report.summary,
    opportunities: report.opportunities.map((o) => ({
      ...o,
      basedOn: o.evidenceRefs.map((id) => titles.get(id)),
    })),
    roadmap: report.roadmap,
    copyExamples: report.copyExamples,
    performance: report.performance,
    checks: report.checks,
    limitations: report.limitations,
    crawl: report.meta.crawl,
  };
}
