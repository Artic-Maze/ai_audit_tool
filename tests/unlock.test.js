import { describe, expect, it } from "vitest";
import { isUnlocked, unlockCookie } from "../lib/unlock.js";

// A minimal stand-in for Next's cookie store.
const jar = (cookies) => ({
  get: (name) => (name in cookies ? { name, value: cookies[name] } : undefined),
});

describe("unlock cookie", () => {
  it("unlocks the audit it was issued for", () => {
    const { name, value } = unlockCookie("audit-1");
    expect(isUnlocked(jar({ [name]: value }), "audit-1")).toBe(true);
  });

  it("doesn't unlock another audit, a forged value, or nothing", () => {
    const { name, value } = unlockCookie("audit-1");
    expect(isUnlocked(jar({ [name]: value }), "audit-2")).toBe(false);
    expect(isUnlocked(jar({ [name]: "made-up" }), "audit-1")).toBe(false);
    expect(isUnlocked(jar({}), "audit-1")).toBe(false);
  });

  it("is http-only and long-lived", () => {
    expect(unlockCookie("audit-1").options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 31_536_000,
    });
  });
});
