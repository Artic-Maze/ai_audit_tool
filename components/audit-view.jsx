"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Circle, LoaderCircle } from "lucide-react";
import { Report } from "@/components/report/report";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { isFinished, STAGES } from "@/lib/jobs/state";
import { cn } from "@/lib/utils";

const POLL_MS = 2000;
const STEPS = STAGES.filter((s) => s.id !== "queued" && s.id !== "done");

function Progress({ audit, connectionLost }) {
  const current = STEPS.findIndex((s) => s.id === audit.stage);
  return (
    <>
      <p className="text-sm font-bold tracking-[0.08em] text-muted-foreground uppercase">
        Auditing
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] break-words sm:text-4xl">
        {audit.domain}
      </h1>

      <div
        role="progressbar"
        aria-label="Audit progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={audit.progress}
        className="mt-8 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700"
          style={{ width: `${Math.max(audit.progress, 3)}%` }}
        />
      </div>
      <p aria-live="polite" className="mt-3 text-sm font-medium">
        {audit.message}…
      </p>

      <ol className="mt-8 space-y-3">
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={step.id} className="flex items-center gap-3 text-sm">
              {done ? (
                <CircleCheck
                  className="size-5 text-growth"
                  aria-hidden="true"
                />
              ) : active ? (
                <LoaderCircle
                  className="size-5 animate-spin text-growth"
                  aria-hidden="true"
                />
              ) : (
                <Circle className="size-5 text-faint" aria-hidden="true" />
              )}
              <span className={done || active ? "" : "text-muted-foreground"}>
                {step.label}
                <span className="sr-only">
                  {done ? " (done)" : active ? " (in progress)" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-10 text-sm text-muted-foreground">
        Most audits take one to two minutes. This page updates by itself.
      </p>
      {connectionLost && (
        <p role="status" className="mt-3 text-sm text-destructive">
          Lost connection to the server. Still trying…
        </p>
      )}
    </>
  );
}

function Failed({ audit }) {
  return (
    <>
      <CircleAlert className="size-8 text-destructive" aria-hidden="true" />
      <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.02em] break-words">
        We couldn&apos;t audit {audit.domain}
      </h1>
      <p className="mt-3 text-muted-foreground">{audit.message}</p>
      <Button asChild className="mt-8 h-11 px-5 text-base">
        <Link href="/">Try another store</Link>
      </Button>
    </>
  );
}

export function AuditView({ initial, bookingUrl }) {
  const [audit, setAudit] = useState(initial);
  const [connectionLost, setConnectionLost] = useState(false);
  const finished = isFinished(audit.status);

  useEffect(() => {
    if (finished) return;
    let cancelled = false;
    let failures = 0;
    let timer;

    async function poll() {
      try {
        const res = await fetch(`/api/audit/${audit.id}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = await res.json();
        if (cancelled) return;
        failures = 0;
        setConnectionLost(false);
        setAudit(next);
        if (isFinished(next.status)) return;
      } catch {
        failures += 1;
        if (failures >= 3) setConnectionLost(true);
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }

    timer = setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [audit.id, finished]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-12",
          audit.status === "done" ? "max-w-5xl" : "max-w-2xl",
        )}
      >
        {audit.status === "done" ? (
          <Report report={audit.report} bookingUrl={bookingUrl} />
        ) : audit.status === "failed" ? (
          <Failed audit={audit} />
        ) : (
          <Progress audit={audit} connectionLost={connectionLost} />
        )}
      </main>
    </div>
  );
}
