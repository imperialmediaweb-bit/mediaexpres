"use client";

import { useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";

export function CopySmartBillButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" />
          Copiat!
        </>
      ) : (
        <>
          <ClipboardCopy className="h-3.5 w-3.5" />
          Copiaz&#x103; pentru SmartBill
        </>
      )}
    </button>
  );
}
