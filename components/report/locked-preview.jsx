import { LockKeyhole } from "lucide-react";

// Placeholder for a locked section. Its blurred lines are generic shapes:
// the real content isn't sent until the report is unlocked.
const LINES = ["w-11/12", "w-full", "w-4/5", "w-2/3"];

export function LockedPreview({ title, description }) {
  return (
    <section className="relative rounded-2xl border bg-card p-5">
      <h3 className="font-extrabold">{title}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      <div aria-hidden="true" className="mt-4 space-y-2.5 blur-[3px]">
        {LINES.map((width) => (
          <div
            key={width}
            className={`h-2.5 rounded-full bg-border ${width}`}
          />
        ))}
      </div>
      <a
        href="#unlock"
        className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-bold shadow-sm hover:border-growth"
      >
        <LockKeyhole aria-hidden="true" className="size-3.5 text-growth" />
        Unlock to see
      </a>
    </section>
  );
}
