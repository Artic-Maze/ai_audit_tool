import { appCheck, sectionData, unknown } from "./helpers.js";

function pageCheck(key, label, path) {
  return (snapshot) => {
    const pages = sectionData(snapshot.pages);
    if (!pages) {
      return unknown(`Pages couldn't be checked (${snapshot.pages.error}).`);
    }
    const page = pages[key];
    if (page.exists === null) {
      return unknown(
        `Couldn't tell whether there's a ${label} (${page.error}).`,
      );
    }
    if (!page.exists) {
      return {
        passed: false,
        value: false,
        display: "Not found",
        evidence: [
          `No ${label} link on the homepage, and ${path} doesn't exist.`,
        ],
      };
    }
    return {
      passed: true,
      value: true,
      display: "Found",
      evidence: [
        page.via === "homepage link"
          ? `Linked from the homepage: ${page.url}`
          : `Found at ${page.url}`,
      ],
    };
  };
}

export const SUPPORT_CHECKS = [
  {
    id: "support.chat",
    area: "support",
    title: "Chat widget",
    metric: "Live chat or chatbot widget detected",
    threshold: "Detected",
    run: appCheck("chat", "chat widget"),
  },
  {
    id: "support.faq-page",
    area: "support",
    title: "FAQ page",
    metric: "FAQ page linked from the homepage or at /pages/faq",
    threshold: "Exists",
    run: pageCheck("faq", "FAQ page", "/pages/faq"),
  },
  {
    id: "support.contact-page",
    area: "support",
    title: "Contact page",
    metric: "Contact page linked from the homepage or at /pages/contact",
    threshold: "Exists",
    run: pageCheck("contact", "contact page", "/pages/contact"),
  },
];
