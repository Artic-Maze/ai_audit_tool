import { ArrowUpRight } from "lucide-react";
import { AreaScores } from "./area-scores";
import { CopyExamples } from "./copy-examples";
import { ImpactEffortMatrix } from "./impact-effort-matrix";
import { Methodology } from "./methodology";
import { OpportunityList } from "./opportunities";
import { Performance } from "./performance";
import { Eyebrow, formatDate, Section } from "./primitives";
import { Roadmap } from "./roadmap";
import { ScoreDial } from "./score-dial";

function ReportHeader({ report }) {
  const { store, scores, generatedAt } = report;
  return (
    <header className="flex flex-col gap-8 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div className="min-w-0">
        <Eyebrow>AI growth audit</Eyebrow>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] break-words sm:text-4xl">
          {store.name ?? store.domain}
        </h1>
        <a
          href={store.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 rounded text-sm font-medium text-growth hover:text-ink"
        >
          {store.domain}
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
        <p className="mt-4 text-sm text-muted-foreground">
          Audited {formatDate(generatedAt)}
          {store.theme && ` · ${store.theme} theme`}
        </p>
        {store.storefront === "headless" && (
          <p className="mt-3 max-w-md text-sm">
            This store runs a headless storefront, which keeps product data
            private, so some checks couldn&apos;t run.
          </p>
        )}
      </div>
      <ScoreDial score={scores.overall.score} grade={scores.overall.grade} />
    </header>
  );
}

export function Report({ report }) {
  const { opportunities } = report;
  return (
    <>
      <ReportHeader report={report} />
      <Section id="summary" title="Executive summary">
        <p className="max-w-3xl text-lg text-pretty">{report.summary.text}</p>
      </Section>
      <Section
        id="scores"
        title="Scores by area"
        description="Each area starts at 100 and loses points for every check it fails."
      >
        <AreaScores areas={report.scores.areas} />
      </Section>
      {opportunities.length > 0 ? (
        <>
          <Section
            id="matrix"
            title="Impact vs. effort"
            description="Where each opportunity sits, so you can start with the quick wins."
          >
            <ImpactEffortMatrix opportunities={opportunities} />
          </Section>
          <Section
            id="opportunities"
            title="Opportunities"
            description="Highest impact first. Impact and effort are rated 1 to 5."
          >
            <OpportunityList opportunities={opportunities} />
          </Section>
        </>
      ) : (
        <Section id="opportunities" title="Opportunities">
          <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
            The checks we could run found no major gaps.
          </p>
        </Section>
      )}
      <Section
        id="copy"
        title="Before and after: product copy"
        description="Two of the thinnest product descriptions, rewritten in the store's voice."
      >
        <CopyExamples copyExamples={report.copyExamples} />
      </Section>
      {opportunities.length > 0 && (
        <Section id="roadmap" title="90-day roadmap">
          <Roadmap roadmap={report.roadmap} opportunities={opportunities} />
        </Section>
      )}
      <Section
        id="speed"
        title="Page speed"
        description="Context only: speed isn't part of the scores above."
      >
        <Performance performance={report.performance} />
      </Section>
      <Methodology report={report} />
    </>
  );
}
