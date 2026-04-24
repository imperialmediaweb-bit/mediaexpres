"use client";

import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestListModal } from "@/components/forms/RequestListModal";

export function StickyMobileCta() {
  return (
    <>
      <div aria-hidden className="h-20 lg:hidden" />
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md">
        <RequestListModal
          successHref="/pachete"
          successCtaLabel="Vezi prețurile acum"
          trigger={
            <Button variant="accent" size="lg" className="w-full">
              <Mail className="h-4 w-4" /> Cere oferta gratuită pe email
            </Button>
          }
        />
      </div>
    </>
  );
}
