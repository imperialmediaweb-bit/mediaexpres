"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BillingPortalButton({
  children = "Gestioneaza abonamentul",
  variant = "default",
}: {
  children?: React.ReactNode;
  variant?: "default" | "accent" | "outline" | "ghost";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant={variant}
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await fetch("/api/billing-portal", { method: "POST" });
            const body = await res.json();
            if (!res.ok || !body.ok || !body.url) {
              throw new Error(body.error || "Eroare");
            }
            window.location.href = body.url;
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Eroare necunoscuta");
            setLoading(false);
          }
        }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {children}
      </Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
