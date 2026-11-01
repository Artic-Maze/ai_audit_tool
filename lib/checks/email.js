import {
  appCheck,
  appEvidence,
  appNames,
  appsIn,
  joinNames,
  lookedFor,
  sectionData,
  unknown,
} from "./helpers.js";

function signupForm(snapshot) {
  const home = sectionData(snapshot.homepage);
  if (!home) {
    return unknown(
      `The homepage couldn't be read (${snapshot.homepage.error}).`,
    );
  }
  if (home.newsletterForm.present) {
    return {
      passed: true,
      value: true,
      display: "Found",
      evidence: [
        `Signup form on the homepage: ${home.newsletterForm.evidence}.`,
      ],
    };
  }
  // Email apps inject their forms with JavaScript, so a missing form in the
  // HTML proves nothing when one is installed.
  const { apps, error } = appsIn(snapshot, "email");
  if (error) return unknown(error);
  if (apps.length > 0) {
    return unknown(
      `No signup form in the homepage HTML, but ${joinNames(apps)} can add one with JavaScript, so this can't be confirmed.`,
    );
  }
  return {
    passed: false,
    value: false,
    display: "Not found",
    evidence: ["No newsletter signup form found on the homepage."],
  };
}

function popup(snapshot) {
  const popups = appsIn(snapshot, "popup");
  if (popups.error) return unknown(popups.error);
  if (popups.apps.length > 0) {
    return {
      passed: true,
      value: true,
      display: appNames(popups.apps),
      evidence: popups.apps.map(appEvidence),
    };
  }
  const email = appsIn(snapshot, "email").apps;
  if (email.length > 0) {
    return unknown(
      `No dedicated popup app detected. ${joinNames(email)} ${email.length === 1 ? "offers" : "offer"} signup popups, but whether they're switched on can't be seen from public HTML.`,
    );
  }
  return {
    passed: false,
    value: false,
    display: "None detected",
    evidence: [`No popup app detected. Looked for ${lookedFor("popup")}.`],
  };
}

export const EMAIL_CHECKS = [
  {
    id: "email.app",
    area: "email",
    title: "Email or SMS app",
    metric: "Email or SMS marketing app detected",
    threshold: "Detected",
    run: appCheck("email", "email or SMS app"),
  },
  {
    id: "email.signup-form",
    area: "email",
    title: "Newsletter signup form",
    metric: "Newsletter signup form on the homepage",
    threshold: "Present",
    run: signupForm,
  },
  {
    id: "email.popup",
    area: "email",
    title: "Signup popup",
    metric: "Popup app detected",
    threshold: "Detected",
    run: popup,
  },
];
