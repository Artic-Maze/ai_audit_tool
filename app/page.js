import { FileText, Mail, MessageCircle, Search, Sparkles } from "lucide-react";
import { AuditForm } from "@/components/audit-form";

const AREAS = [
  {
    icon: FileText,
    name: "Product copy",
    checks: "Thin or duplicate descriptions, missing alt text, SEO titles",
  },
  {
    icon: Search,
    name: "Search",
    checks: "Typo and synonym queries run against your real catalog",
  },
  {
    icon: MessageCircle,
    name: "Support",
    checks: "Chat widget, FAQ and contact pages",
  },
  {
    icon: Sparkles,
    name: "Recommendations",
    checks: "Upsell apps and “you may also like” sections",
  },
  {
    icon: Mail,
    name: "Email & retention",
    checks: "Email/SMS apps, signup forms and popups",
  },
];

const DELIVERABLES = [
  {
    title: "A score for each area",
    body: "Rule-based scores, so the same store gets the same result every time.",
  },
  {
    title: "Ranked AI opportunities",
    body: "Each one backed by evidence from your store, with impact and effort ratings.",
  },
  {
    title: "A 90-day roadmap",
    body: "Quick wins first, then bigger builds. Download the full report as a PDF.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
        <span className="text-sm font-semibold tracking-tight">
          Shopify AI Growth Audit
        </span>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-4 pt-12 pb-16 text-center sm:px-6 sm:pt-20">
          <p className="text-sm font-medium text-muted-foreground">
            Free audit for Shopify stores
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Find where AI can grow your store
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-muted-foreground">
            Enter your store URL. We check your public storefront, score five
            areas, and rank the AI opportunities by impact and effort.
          </p>

          <div className="mx-auto mt-8 max-w-lg text-left">
            <AuditForm />
          </div>
          <p className="text-sm text-muted-foreground">
            Takes about a minute. Uses public storefront data only.
          </p>
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight">
              What we check
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {AREAS.map(({ icon: Icon, name, checks }) => (
                <li key={name} className="rounded-xl border bg-card p-4">
                  <Icon className="size-5 text-muted-foreground" />
                  <h3 className="mt-3 font-medium">{name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{checks}</p>
                </li>
              ))}
            </ul>

            <h2 className="mt-14 text-xl font-semibold tracking-tight">
              What you get
            </h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-3">
              {DELIVERABLES.map(({ title, body }) => (
                <li key={title}>
                  <h3 className="font-medium">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <p className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          Based on public data only. App detection is best-effort, and lift
          figures are estimates.
        </p>
      </footer>
    </div>
  );
}
