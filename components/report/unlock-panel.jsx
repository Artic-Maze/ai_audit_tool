"use client";

import { useState } from "react";
import { Check, LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const UNLOCK_FAILED = "Couldn't unlock the report. Try again in a minute.";

function included(locked) {
  return [
    "The executive summary",
    locked.opportunities > 0 &&
      `${locked.opportunities} more ${locked.opportunities === 1 ? "opportunity" : "opportunities"}`,
    "The impact vs. effort chart",
    locked.copyExamples > 0 && "Before-and-after product copy",
    "A 90-day roadmap",
    locked.performance && "Page speed results",
  ].filter(Boolean);
}

export function UnlockPanel({ auditId, locked, onUnlocked }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? UNLOCK_FAILED);
      onUnlocked(data);
    } catch (err) {
      setError(err.message || UNLOCK_FAILED);
      setPending(false);
    }
  }

  return (
    <section
      id="unlock"
      aria-labelledby="unlock-title"
      className="mt-14 scroll-mt-6 rounded-2xl border-2 border-growth bg-card p-6 sm:p-8"
    >
      <div className="flex items-center gap-2 text-growth">
        <LockKeyhole aria-hidden="true" className="size-5" />
        <p className="text-xs font-bold tracking-[0.08em] uppercase">Free</p>
      </div>
      <h2
        id="unlock-title"
        className="mt-2 text-2xl font-extrabold tracking-[-0.02em]"
      >
        Unlock the full report
      </h2>
      <p className="mt-1 text-muted-foreground">
        Enter your email to see everything:
      </p>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {included(locked).map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check aria-hidden="true" className="size-4 shrink-0 text-growth" />
            {item}
          </li>
        ))}
      </ul>
      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="unlock-email" className="sr-only">
          Email address
        </label>
        <Input
          id="unlock-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@yourstore.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby="unlock-help"
          disabled={pending}
          className="h-11 bg-card px-3.5 text-base md:text-base"
        />
        <Button
          type="submit"
          disabled={pending}
          className="h-11 px-5 text-base"
        >
          {pending ? (
            <>
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
              Unlocking…
            </>
          ) : (
            "Unlock report"
          )}
        </Button>
      </form>
      <p id="unlock-help" className="mt-2 text-xs text-muted-foreground">
        We&apos;ll only use your email to follow up about this audit.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
