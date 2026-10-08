"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  packageId: string;
  mode: "package" | "subscription-standard" | "subscription-casino";
  label?: string;
  variant?: "default" | "accent" | "outline" | "gold";
  size?: "default" | "sm" | "lg";
  className?: string;
  /** 08.10.2026 — zona (Regional) sau ziarul (Local), lib/zona-pachet.ts. */
  alegere?: string;
  /** Daca e setat, butonul nu porneste plata si arata mesajul (ex. „Alege zona"). */
  blocat?: string;
}

export function CheckoutButton({
  packageId,
  mode,
  label,
  variant = "accent",
  size = "default",
  className,
  alegere,
  blocat,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (blocat) {
      setError(blocat);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, mode, ...(alegere ? { alegere } : {}) }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok || !body.url) {
        throw new Error(body.error || "Eroare");
      }
      window.location.href = body.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={go}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {label || "Plateste cu cardul"}
      </Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
