import { NextResponse } from "next/server";
import { getAudit, toPublic } from "@/lib/jobs/audits";

// Status, progress and, once done, the report. Polled by the audit page.
export async function GET(_request, { params }) {
  const { id } = await params;
  const audit = await getAudit(id);
  if (!audit) {
    return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  }
  return NextResponse.json(toPublic(audit), {
    headers: { "Cache-Control": "no-store" },
  });
}
