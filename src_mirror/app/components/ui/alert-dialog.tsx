"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogContent = ({ children, ...props }: any) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay className="fixed inset-0 bg-black/30" />
    <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/3 w-full max-w-md -translate-x-1/2 rounded bg-white p-4">
      {children}
    </AlertDialogPrimitive.Content>
  </AlertDialogPrimitive.Portal>
);
