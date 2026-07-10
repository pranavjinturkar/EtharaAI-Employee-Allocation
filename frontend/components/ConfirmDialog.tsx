import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, confirmLabel = "Confirm", cancelLabel = "Cancel", isDestructive = true }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[90vw] rounded-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
          <Button variant={isDestructive ? "destructive" : "default"} onClick={() => { onConfirm(); onOpenChange(false); }}>{confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
