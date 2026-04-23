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
import { OrderForm } from "./OrderForm";

interface OrderModalProps {
  trigger: React.ReactNode;
  defaultPackageId?: string;
}

export function OrderModal({ trigger, defaultPackageId }: OrderModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comandă articol</DialogTitle>
          <DialogDescription>
            Completează formularul și te contactăm în maximum 2 ore. Nu plătești nimic acum.
          </DialogDescription>
        </DialogHeader>
        <OrderForm defaultPackageId={defaultPackageId} />
      </DialogContent>
    </Dialog>
  );
}
