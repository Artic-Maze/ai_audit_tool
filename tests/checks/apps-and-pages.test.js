import { describe, expect, it } from "vitest";
import {
  appsSection,
  fivePages,
  homepageSection,
  makeSnapshot,
  pagesSection,
} from "../fixtures/snapshot.js";
import { checkById } from "../helpers.js";

describe("support checks", () => {
  it("pass the chat check when a chat app is detected", () => {
    expect(checkById(makeSnapshot(), "support.chat")).toMatchObject({
      passed: true,
      display: "Gorgias",
    });
  });

  it("word a missing chat widget as not detected", () => {
    const result = checkById(
      makeSnapshot({ apps: appsSection([]) }),
      "support.chat",
    );
    expect(result.passed).toBe(false);
    expect(result.evidence[0]).toMatch(
      /^No chat widget detected\. Looked for \d+ apps, including Gorgias, Tidio, /,
    );
  });

  it("treat a page we couldn't check as unknown, not missing", () => {
    const result = checkById(
      makeSnapshot({ pages: pagesSection({ faq: null }) }),
      "support.faq-page",
    );
    expect(result.passed).toBeNull();
    expect(result.evidence[0]).toContain("Blocked by bot protection");
  });

  it("fail a missing contact page", () => {
    const result = checkById(
      makeSnapshot({ pages: pagesSection({ contact: false }) }),
      "support.contact-page",
    );
    expect(result.passed).toBe(false);
    expect(result.evidence).toEqual([
      "No contact page link on the homepage, and /pages/contact doesn't exist.",
    ]);
  });
});

describe("recommendations.related-section", () => {
  const id = "recommendations.related-section";
  const noSection = fivePages(() => ({
    hasRecommendations: false,
    recommendationsEvidence: null,
  }));

  it("passes when most sampled pages have a section", () => {
    expect(checkById(makeSnapshot(), id)).toMatchObject({
      passed: true,
      display: "5 of 5 pages",
    });
  });

  it("is unknown when a recommendations app could add one with JavaScript", () => {
    const result = checkById(
      makeSnapshot({ productPages: noSection, apps: appsSection(["rebuy"]) }),
      id,
    );
    expect(result.passed).toBeNull();
    expect(result.evidence[0]).toContain("Rebuy can add one with JavaScript");
  });

  it("fails when there's no section and no app", () => {
    const result = checkById(
      makeSnapshot({ productPages: noSection, apps: appsSection([]) }),
      id,
    );
    expect(result.passed).toBe(false);
  });
});

describe("email checks", () => {
  const noForm = homepageSection({ newsletter: false });

  it("find a signup form in the homepage HTML", () => {
    expect(checkById(makeSnapshot(), "email.signup-form").passed).toBe(true);
  });

  it("can't confirm a missing form when an email app could inject one", () => {
    const result = checkById(
      makeSnapshot({ homepage: noForm, apps: appsSection(["klaviyo"]) }),
      "email.signup-form",
    );
    expect(result.passed).toBeNull();
    expect(result.evidence[0]).toContain("Klaviyo can add one with JavaScript");
  });

  it("fail a missing form when no email app is installed", () => {
    const result = checkById(
      makeSnapshot({ homepage: noForm, apps: appsSection([]) }),
      "email.signup-form",
    );
    expect(result.passed).toBe(false);
  });

  it("pass the popup check for a popup app", () => {
    expect(checkById(makeSnapshot(), "email.popup")).toMatchObject({
      passed: true,
      display: "Privy",
    });
  });

  it("can't tell about popups when only email platforms are installed", () => {
    const result = checkById(
      makeSnapshot({ apps: appsSection(["klaviyo", "omnisend"]) }),
      "email.popup",
    );
    expect(result.passed).toBeNull();
    expect(result.evidence[0]).toContain(
      "Klaviyo and Omnisend offer signup popups",
    );
  });

  it("fail the popup check with no popup or email app", () => {
    expect(
      checkById(makeSnapshot({ apps: appsSection([]) }), "email.popup").passed,
    ).toBe(false);
  });
});
