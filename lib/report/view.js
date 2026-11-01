export const FREE_OPPORTUNITIES = 3;

// The report as a viewer may see it. Until they unlock it with their email,
// locked sections aren't sent at all (the page shows placeholders, not blurred
// real data), only counts of what unlocking adds. Internal metadata, like LLM
// usage, is never sent.
export function viewReport(report, { unlocked }) {
  const titles = new Map(report.checks.map((c) => [c.id, c.title]));
  const opportunities = report.opportunities.map((o) => ({
    ...o,
    basedOn: o.evidenceRefs.map((id) => titles.get(id)),
  }));
  const free = {
    generatedAt: report.generatedAt,
    store: report.store,
    scores: report.scores,
    limitations: report.limitations,
    crawl: report.meta.crawl,
  };

  if (unlocked) {
    return {
      ...free,
      unlocked: true,
      summary: report.summary,
      opportunities,
      roadmap: report.roadmap,
      copyExamples: report.copyExamples,
      performance: report.performance,
      checks: report.checks,
    };
  }
  return {
    ...free,
    unlocked: false,
    opportunities: opportunities.slice(0, FREE_OPPORTUNITIES),
    locked: {
      opportunities: Math.max(0, opportunities.length - FREE_OPPORTUNITIES),
      copyExamples: report.copyExamples.items.length,
      performance: report.performance.status === "ok",
    },
  };
}
