import { createHmac, timingSafeEqual } from "node:crypto";

// A viewer who gives their email for an audit gets a cookie for that audit.
// Its value is an HMAC of the audit id, so it can't be made up by hand.

const COOKIE_PREFIX = "gl_unlock_";
const ONE_YEAR = 60 * 60 * 24 * 365;

function secret() {
  if (process.env.UNLOCK_SECRET) return process.env.UNLOCK_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("UNLOCK_SECRET isn't set (see .env.example)");
  }
  return "growthlens-development-only";
}

const sign = (auditId) =>
  createHmac("sha256", secret()).update(auditId).digest("base64url");

export function unlockCookie(auditId) {
  return {
    name: `${COOKIE_PREFIX}${auditId}`,
    value: sign(auditId),
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR,
    },
  };
}

// cookieStore: anything with get(name) -> { value } (Next's cookies()).
export function isUnlocked(cookieStore, auditId) {
  const value = cookieStore.get(`${COOKIE_PREFIX}${auditId}`)?.value;
  if (!value) return false;
  const expected = Buffer.from(sign(auditId));
  const given = Buffer.from(value);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
