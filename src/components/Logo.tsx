import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "color" | "white" | "mono";
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({
  variant = "color",
  className,
  showTagline = false,
  size = "md",
}: LogoProps) {
  const isOnDark = variant === "white";
  const isMono = variant === "mono";

  // Badge (background) / letterform (foreground) / accent
  const badge = isMono ? "#111111" : "#c1121f";
  const letter = "#faf7f2";
  const wordMediaColor = isOnDark ? "#faf7f2" : "#111111";
  const wordExpresColor = isOnDark ? "#faf7f2" : "#c1121f";
  const taglineColor = isOnDark ? "#e5c892" : "#64748b";

  const badgeSize = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const wordSize =
    size === "lg" ? "text-[28px]" : size === "sm" ? "text-[18px]" : "text-[22px]";

  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-3", className)}
      aria-label="MediaExpres — acasă"
    >
      {/* Tabloid press badge */}
      <svg
        viewBox="0 0 48 48"
        className={cn(
          badgeSize,
          "shrink-0 transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-[1.04]",
        )}
        aria-hidden="true"
      >
        {/* Red rounded square base */}
        <rect width="48" height="48" rx="7" fill={badge} />

        {/* Top masthead bar (newspaper feel) */}
        <rect x="7" y="9" width="34" height="1.8" fill={letter} />
        <rect x="7" y="12" width="22" height="0.9" fill={letter} opacity="0.55" />

        {/* Stroke-based M (clean, confident) */}
        <path
          d="M11 38 L11 17 L15 17 L24 30 L33 17 L37 17 L37 38"
          fill="none"
          stroke={letter}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bottom masthead bar with a break (signature) */}
        <rect x="7" y="40" width="26" height="1.6" fill={letter} />
        <rect x="35" y="40" width="6" height="1.6" fill={letter} opacity="0.7" />
      </svg>

      {/* Wordmark */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-0">
          <span
            className={cn(
              "font-headline font-bold uppercase tracking-[0.01em]",
              wordSize,
            )}
            style={{ color: wordMediaColor }}
          >
            Media
          </span>
          <span
            className={cn(
              "font-headline font-bold uppercase tracking-[0.01em]",
              wordSize,
            )}
            style={{ color: wordExpresColor }}
          >
            Expres
          </span>
        </div>
        {showTagline ? (
          <span
            className="mt-1 text-[9px] font-headline font-semibold uppercase tracking-[0.28em]"
            style={{ color: taglineColor }}
          >
            Presă · Distribuție · Impact
          </span>
        ) : null}
      </div>
    </Link>
  );
}
