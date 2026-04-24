"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RequestListForm } from "@/components/forms/RequestListForm";

const STORAGE_KEY = "me_exit_intent_shown";
const MOBILE_DELAY_MS = 30000;

export function ExitIntentPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY) === "1") return;

    const trigger = () => {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
      sessionStorage.setItem(STORAGE_KEY, "1");
      setOpen(true);
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) trigger();
    };
    document.addEventListener("mouseleave", onMouseLeave);

    const timerId = window.setTimeout(trigger, MOBILE_DELAY_MS);

    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      window.clearTimeout(timerId);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stai puțin — ai oferta completă gratuit</DialogTitle>
          <DialogDescription>
            Lista celor 50+ ziare + prețurile detaliate, pe email în 2 minute.
            Fără obligații, fără spam.
          </DialogDescription>
        </DialogHeader>
        <RequestListForm
          successHref="/pachete"
          successCtaLabel="Vezi prețurile acum"
        />
      </DialogContent>
    </Dialog>
  );
}
