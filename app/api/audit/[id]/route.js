import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAudit, toPublic } from "@/lib/jobs/audits";
import { isUnlocked } from "@/lib/unlock";

// Status, progress and, once done, the report (the full version only for
// viewers who unlocked it). Polled by the audit page.
export async function GET(_request, { params }) {
  const { id } = await params;
  const audit = await getAudit(id);
  if (!audit) {
    return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  }
  const unlocked = isUnlocked(await cookies(), id);
  return NextResponse.json(toPublic(audit, { unlocked }), {
    headers: { "Cache-Control": "no-store" },
  });
}
