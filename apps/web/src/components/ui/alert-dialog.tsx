import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "../../lib/utils";
import styles from "./dialog.module.css";
import { useDialogReturnFocus } from "./dialog";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
export const AlertDialogAction = AlertDialogPrimitive.Action;
export const AlertDialogTitle = AlertDialogPrimitive.Title;
export const AlertDialogDescription = AlertDialogPrimitive.Description;

export function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  const returnFocus = useDialogReturnFocus();
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className={styles.overlay} />
      <AlertDialogPrimitive.Content
        className={cn(styles.content, className)}
        {...returnFocus}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}
