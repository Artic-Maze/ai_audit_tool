import { fmtMs } from "./format.js";
import { sectionData, unknown } from "./helpers.js";

// Google's "good" thresholds. Lighthouse calls scores under 50 poor.
export const MIN_MOBILE_SCORE = 50;
export const MAX_LCP_MS = 2500;
export const MAX_CLS = 0.1;
export const MAX_INP_MS = 200;

const PAGE_LABELS = { homepage: "Homepage", product: "Product page" };

const fmtCls = (value) => String(Math.round(value * 100) / 100);

// The mobile run used for context: the homepage, or a product page if the
// homepage run failed.
function mobileRun(snapshot) {
  const data = sectionData(snapshot.pagespeed);
  if (!data) {
    return {
      error: `PageSpeed data isn't available (${snapshot.pagespeed.error}).`,
    };
  }
  for (const page of ["homepage", "product"]) {
    const run = data.runs.find(
      (r) => r.page === page && r.strategy === "mobile" && r.status === "ok",
    );
    if (run) return { run };
  }
  return { error: "No mobile PageSpeed run succeeded." };
}

function mobileScore(snapshot) {
  const { run, error } = mobileRun(snapshot);
  if (error) return unknown(error);
  const score = run.lab.performanceScore;
  if (score === null) {
    return unknown("Lighthouse didn't return a performance score.");
  }
  return {
    passed: score >= MIN_MOBILE_SCORE,
    value: score,
    display: `${score}/100`,
    evidence: [
      `${PAGE_LABELS[run.page]} scores ${score}/100 on mobile in Google's Lighthouse lab test.`,
    ],
  };
}

// Prefer real-user data (Chrome UX Report, 75th percentile) over the lab run.
function vital({ labKey, fieldKey, label, max, format }) {
  return (snapshot) => {
    const { run, error } = mobileRun(snapshot);
    if (error) return unknown(error);
    const field = run.field?.[fieldKey] ?? null;
    const lab = labKey ? run.lab[labKey] : null;
    const value = field ?? lab;
    if (value === null) {
      return unknown(
        labKey
          ? `No ${label} measurement is available.`
          : `${label} needs real-user data, and Chrome has none for this site.`,
      );
    }
    const evidence = [];
    if (field !== null) {
      const scope =
        run.field.scope === "origin" ? " across the whole site" : "";
      evidence.push(
        `Real Chrome users${scope}, 75th percentile: ${format(field)}.`,
      );
    }
    if (lab !== null) {
      evidence.push(
        `Lab test on the ${PAGE_LABELS[run.page].toLowerCase()} (simulated mobile): ${format(lab)}.`,
      );
    }
    return { passed: value <= max, value, display: format(value), evidence };
  };
}

export const PERFORMANCE_CHECKS = [
  {
    id: "performance.mobile-score",
    area: "performance",
    title: "Mobile performance score",
    metric: "Lighthouse mobile performance score",
    threshold: `${MIN_MOBILE_SCORE} or more`,
    run: mobileScore,
  },
  {
    id: "performance.lcp",
    area: "performance",
    title: "Largest Contentful Paint",
    metric: "Time until the main content shows (LCP), mobile",
    threshold: `${fmtMs(MAX_LCP_MS)} or less`,
    run: vital({
      labKey: "lcpMs",
      fieldKey: "lcpMs",
      label: "LCP",
      max: MAX_LCP_MS,
      format: fmtMs,
    }),
  },
  {
    id: "performance.cls",
    area: "performance",
    title: "Cumulative Layout Shift",
    metric: "How much the layout jumps while loading (CLS), mobile",
    threshold: `${MAX_CLS} or less`,
    run: vital({
      labKey: "cls",
      fieldKey: "cls",
      label: "CLS",
      max: MAX_CLS,
      format: fmtCls,
    }),
  },
  {
    id: "performance.inp",
    area: "performance",
    title: "Interaction to Next Paint",
    metric: "Delay after a tap or click (INP), real users on mobile",
    threshold: `${MAX_INP_MS} ms or less`,
    run: vital({
      labKey: null,
      fieldKey: "inpMs",
      label: "INP",
      max: MAX_INP_MS,
      format: fmtMs,
    }),
  },
];
