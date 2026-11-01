"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeStoreUrl } from "@/lib/url";

const START_FAILED = "Couldn't start the audit. Try again in a minute.";

export function AuditForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const url = normalizeStoreUrl(value);
    if (!url) {
      setError("Enter a store address, like yourstore.com");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new Error(data.error ?? START_FAILED);
      router.push(`/audit/${data.id}`);
    } catch (err) {
      setError(err.message || START_FAILED);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="store-url" className="sr-only">
          Shopify store URL
        </label>
        <Input
          id="store-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="yourstore.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "store-url-error" : undefined}
          disabled={pending}
          className="h-11 px-3.5 text-base md:text-base"
        />
        <Button
          type="submit"
          disabled={pending}
          className="h-11 px-5 text-base"
        >
          {pending ? (
            <>
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
              Starting…
            </>
          ) : (
            <>
              Run free audit
              <ArrowRight data-icon="inline-end" />
            </>
          )}
        </Button>
      </div>
      <p
        id="store-url-error"
        role="alert"
        className="mt-2 min-h-5 text-sm text-destructive"
      >
        {error}
      </p>
    </form>
  );
}
