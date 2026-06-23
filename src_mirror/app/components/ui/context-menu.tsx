"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";

import { cn } from "./utils";

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuContent = ({ className, ...props }: any) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      className={cn(
        "min-w-[220px] rounded-md border bg-white p-1 shadow-md",
        className,
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
);

const ContextMenuItem = ({ className, ...props }: any) => (
  <ContextMenuPrimitive.Item
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1 text-sm leading-none outline-none",
      className,
    )}
    {...props}
  />
);

export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem };
