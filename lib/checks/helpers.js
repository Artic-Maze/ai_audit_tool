import { APP_FINGERPRINTS } from "../crawl/apps-fingerprints.js";

export const sectionData = (section) =>
  section.status === "ok" ? section.data : null;

// Outcome for a check that couldn't be measured. It never counts as a pass
// or a failure.
export function unknown(reason) {
  return { passed: null, value: null, display: "Unknown", evidence: [reason] };
}

export const pathOf = (url) => new URL(url).pathname;

// Product pages that were fetched, or why there are none.
export function productPages(snapshot) {
  const data = sectionData(snapshot.productPages);
  if (!data) {
    return {
      error: `Product pages couldn't be fetched (${snapshot.productPages.error}).`,
    };
  }
  const pages = data.pages.filter((p) => p.status === "ok");
  if (pages.length === 0) {
    return { error: "None of the sampled product pages could be fetched." };
  }
  return { pages };
}

// Detected apps in a category, or why app detection has nothing to say.
export function appsIn(snapshot, category) {
  const data = sectionData(snapshot.apps);
  if (!data) {
    return { error: `App detection didn't run (${snapshot.apps.error}).` };
  }
  return { apps: data.detected.filter((a) => a.categories.includes(category)) };
}

export const appNames = (apps) => apps.map((a) => a.name).join(", ");

// For sentences: "Klaviyo", "Klaviyo and Attentive", "A, B and C".
export function joinNames(apps) {
  const names = apps.map((a) => a.name);
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export const appEvidence = (app) => `${app.name} detected (${app.evidence}).`;

// "Gorgias, Tidio and Zendesk", or "16 apps, including A, B, C, D and E".
export function lookedFor(category) {
  const apps = APP_FINGERPRINTS.filter((a) => a.categories.includes(category));
  if (apps.length <= 6) return joinNames(apps);
  return `${apps.length} apps, including ${joinNames(apps.slice(0, 5))}`;
}

// A check that passes when any app in the category was detected. A miss is
// worded as "not detected": detection is best-effort.
export function appCheck(category, noun) {
  return (snapshot) => {
    const { apps, error } = appsIn(snapshot, category);
    if (error) return unknown(error);
    if (apps.length > 0) {
      return {
        passed: true,
        value: true,
        display: appNames(apps),
        evidence: apps.map(appEvidence),
      };
    }
    return {
      passed: false,
      value: false,
      display: "None detected",
      evidence: [`No ${noun} detected. Looked for ${lookedFor(category)}.`],
    };
  };
}
