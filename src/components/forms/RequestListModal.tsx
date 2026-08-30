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
          <DialogTitle>Primește lista completă în PDF</DialogTitle>
          <DialogDescription>
            Completează datele și primești imediat lista tuturor ziarelor din rețea — pe
            email, cu PDF-ul atașat, plus un link de descărcare pe ecranul următor.
          </DialogDescription>
        </DialogHeader>
        <RequestListForm successHref={successHref} successCtaLabel={successCtaLabel} />
      </DialogContent>
    </Dialog>
  );
}
