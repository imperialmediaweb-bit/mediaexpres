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
}

export function RequestListModal({ trigger }: RequestListModalProps) {
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
        <RequestListForm />
      </DialogContent>
    </Dialog>
  );
}
