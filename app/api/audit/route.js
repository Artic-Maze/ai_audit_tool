import { NextResponse } from "next/server";
import { z } from "zod";
import { CrawlError } from "@/lib/crawl/errors";
import { requestAudit } from "@/lib/jobs/audits";

const Body = z.object({ url: z.string().min(1).max(2048) });

// Starts an audit (202) or returns a reusable one for the same store (200).
// The work runs in the background; poll GET /api/audit/:id for progress.
export async function POST(request) {
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      {
        error:
          'Send JSON with the store address, like {"url": "yourstore.com"}.',
      },
      { status: 400 },
    );
  }
  try {
    const audit = await requestAudit(body.data.url);
    return NextResponse.json(audit, { status: audit.reused ? 200 : 202 });
  } catch (err) {
    if (err instanceof CrawlError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Couldn't start an audit", err);
    return NextResponse.json(
      { error: "Couldn't start the audit. Try again in a minute." },
      { status: 500 },
    );
  }
}
