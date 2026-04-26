"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Button type="button" variant="accent" size="sm" onClick={copy}>
      {copied ? (
        <>
          <Check className="h-4 w-4" /> Copiat!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" /> Copiază tot textul
        </>
      )}
    </Button>
  );
}
