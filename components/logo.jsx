import { cn } from "@/lib/utils";

// GrowthLens concept A ("Lens"): a magnifying lens with a rising trend line.
// Fixed brand colors, matching the palette tokens in app/globals.css.
const INK = "#11211B";
const GROWTH = "#1A7F47";
const SIGNAL = "#2BC06D";

export function LogoMark({ size = 32, inverted = false, className }) {
  const tile = inverted ? "#FFFFFF" : INK;
  const lens = inverted ? GROWTH : SIGNAL;
  const trend = inverted ? INK : "#FFFFFF";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="64" height="64" rx="15" fill={tile} />
      <circle
        cx="28"
        cy="28"
        r="15"
        fill="none"
        stroke={lens}
        strokeWidth="6"
      />
      <line
        x1="39.5"
        y1="39.5"
        x2="50"
        y2="50"
        stroke={lens}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <polyline
        points="20,33 25.5,27.5 29.5,30.5 36,22.5"
        fill="none"
        stroke={trend}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Mark + wordmark, sized from the mark like the brand sheet (56px mark : 30px
// type). `inverted` is for dark backgrounds; the sheet shows no tagline there.
export function Logo({
  size = 32,
  inverted = false,
  tagline = false,
  className,
}) {
  return (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ gap: Math.round(size / 4) }}
    >
      <LogoMark size={size} inverted={inverted} />
      <span className="flex flex-col gap-0.5">
        <span
          className={cn(
            "leading-none font-extrabold tracking-[-0.02em]",
            inverted ? "text-white" : "text-ink",
          )}
          style={{ fontSize: Math.round(size * 0.54) }}
        >
          Growth
          <span className={inverted ? "text-signal" : "text-growth"}>Lens</span>
        </span>
        {tagline && !inverted && (
          <span className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
            AI growth audit
          </span>
        )}
      </span>
    </span>
  );
}
