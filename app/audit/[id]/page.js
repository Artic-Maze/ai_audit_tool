import { cache } from "react";
import { notFound } from "next/navigation";
import { AuditView } from "@/components/audit-view";
import { getAudit, toPublic } from "@/lib/jobs/audits";

// One database read per request, shared by the metadata and the page.
const loadAudit = cache(getAudit);

export async function generateMetadata({ params }) {
  const audit = await loadAudit((await params).id);
  return { title: audit ? `${audit.domain} audit` : "Audit not found" };
}

export default async function AuditPage({ params }) {
  const audit = await loadAudit((await params).id);
  if (!audit) notFound();
  return <AuditView initial={toPublic(audit)} />;
}
