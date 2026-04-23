import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "color" | "white";
  className?: string;
  showTagline?: boolean;
}

export function Logo({ variant = "color", className, showTagline = false }: LogoProps) {
  const navy = variant === "white" ? "#F8F5F0" : "#0B2545";
  const accent = variant === "white" ? "#E4B363" : "#D7263D";
  const box = variant === "white" ? "#F8F5F0" : "#0B2545";
  const mFill = variant === "white" ? "#0B2545" : "#F8F5F0";

  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-3", className)}
      aria-label="MediaExpres — acasă"
    >
      <svg
        viewBox="0 0 60 60"
        className="h-10 w-10 shrink-0 transition-transform group-hover:scale-105"
        aria-hidden="true"
      >
        <rect x="4" y="10" width="44" height="40" rx="3" fill={box} />
        <path d="M4 30 L48 30" stroke={variant === "white" ? "#E4B363" : "#13396B"} strokeWidth="1.5" opacity="0.5" />
        <path
          d="M10 44 L10 18 L18 18 L26 32 L34 18 L42 18 L42 44 L36 44 L36 28 L27 42 L25 42 L16 28 L16 44 Z"
          fill={mFill}
        />
        <path
          d="M50 14 L56 20 L50 26"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M50 34 L56 40 L50 46"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.65"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-0.5">
          <span
            className="font-serif text-2xl font-bold tracking-tight"
            style={{ color: navy }}
          >
            Media
          </span>
          <span
            className="font-sans text-2xl font-medium tracking-wide"
            style={{ color: accent }}
          >
            Expres
          </span>
        </div>
        {showTagline ? (
          <span
            className="mt-0.5 text-[10px] uppercase tracking-[0.2em]"
            style={{ color: variant === "white" ? "#F0CE92" : "#64748b" }}
          >
            Comunicate de presă
          </span>
        ) : null}
      </div>
    </Link>
  );
}
