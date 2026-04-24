"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RequestListForm } from "./RequestListForm";

interface RequestListModalProps {
  trigger: React.ReactNode;
  successHref?: string;
  successCtaLabel?: string;
}

export function RequestListModal({ trigger, successHref, successCtaLabel }: RequestListModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicită lista completă</DialogTitle>
          <DialogDescription>
            Completează datele — îți trimitem lista tuturor ziarelor partenere în PDF, gratuit, în
            maximum 2 minute.
          </DialogDescription>
        </DialogHeader>
        <RequestListForm successHref={successHref} successCtaLabel={successCtaLabel} />
      </DialogContent>
    </Dialog>
  );
}
