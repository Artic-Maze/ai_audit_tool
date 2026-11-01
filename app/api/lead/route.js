import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAudit, toPublic } from "@/lib/jobs/audits";
import { unlockCookie } from "@/lib/unlock";

const Body = z.object({
  auditId: z.string().min(1).max(64),
  email: z.email().max(254),
});

// Email capture: records the lead, unlocks the full report for this viewer
// (a signed cookie per audit) and returns the full report.
export async function POST(request) {
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }
  const audit = await getAudit(body.data.auditId);
  if (!audit || audit.status !== "done") {
    return NextResponse.json(
      { error: "This report isn't ready yet." },
      { status: 404 },
    );
  }

  const email = body.data.email.toLowerCase();
  const known = await db.lead.findFirst({
    where: { email, auditId: audit.id },
    select: { id: true },
  });
  if (!known) await db.lead.create({ data: { email, auditId: audit.id } });

  const response = NextResponse.json(toPublic(audit, { unlocked: true }));
  const { name, value, options } = unlockCookie(audit.id);
  response.cookies.set(name, value, options);
  return response;
}
