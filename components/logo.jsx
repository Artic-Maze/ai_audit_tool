import { cn } from "@/lib/utils";

// GrowthLens concept A ("Lens"): a magnifying lens with a rising trend line.
// Fixed brand colors, matching the palette tokens in app/globals.css.
const TILE = "#17110F";
const TILE_EDGE = "#3A2A2C";
const LENS = "#E8638D";
const TREND = "#F3EEEA";

export function LogoMark({ size = 32, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="14"
        fill={TILE}
        stroke={TILE_EDGE}
        strokeWidth="2"
      />
      <circle
        cx="28"
        cy="28"
        r="15"
        fill="none"
        stroke={LENS}
        strokeWidth="6"
      />
      <line
        x1="39.5"
        y1="39.5"
        x2="50"
        y2="50"
        stroke={LENS}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <polyline
        points="20,33 25.5,27.5 29.5,30.5 36,22.5"
        fill="none"
        stroke={TREND}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Mark + wordmark, sized from the mark like the brand sheet (56px mark : 30px
// type). "Lens" sits a step quieter than "Growth", as in the landing design.
export function Logo({ size = 32, tagline = false, className }) {
  return (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ gap: Math.round(size / 4) }}
    >
      <LogoMark size={size} />
      <span className="flex flex-col gap-0.5">
        <span
          className="leading-none font-semibold tracking-[0.01em] text-foreground"
          style={{ fontSize: Math.round(size * 0.54) }}
        >
          Growth<span className="font-light text-faint">Lens</span>
        </span>
        {tagline && (
          <span className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
            AI growth audit
          </span>
        )}
      </span>
    </span>
  );
}
