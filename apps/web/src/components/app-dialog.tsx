import { useId, type CSSProperties, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  pending?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  pending = false,
  className,
  style,
}: Props) {
  const descriptionId = useId();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent
        className={className}
        style={style}
        showCloseButton={!pending}
        aria-describedby={description ? descriptionId : undefined}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription id={descriptionId}>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
