"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { X } from "lucide-react";

import { cn } from "./utils";

const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerClose = DialogPrimitive.Close;

function DrawerContent({ className, children, ...props }: any) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <DialogPrimitive.Content
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full bg-white p-6 sm:max-w-sm",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <DialogPrimitive.Title className="text-lg font-medium">
            {props.title}
          </DialogPrimitive.Title>
          <DrawerClose asChild>
            <button className="rounded-md p-1 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </DrawerClose>
        </div>
        <div className="mt-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Drawer, DrawerTrigger, DrawerContent, DrawerClose };
