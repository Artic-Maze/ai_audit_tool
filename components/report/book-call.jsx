import { ArrowUpRight } from "lucide-react";

export function BookCall({ url }) {
  return (
    <section
      aria-labelledby="book-call-title"
      className="mt-14 rounded-2xl border bg-card p-6 sm:p-8"
    >
      <h2
        id="book-call-title"
        className="text-2xl font-extrabold tracking-[-0.02em]"
      >
        Want this built?
      </h2>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Book a call to talk through these opportunities and how to build them
        for your store.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-gradient mt-6 inline-flex h-11 items-center gap-2 rounded-lg border px-5 font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Book a call
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </a>
    </section>
  );
}
