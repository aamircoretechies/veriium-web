"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";

import { cn } from "./utils";

const Command = CommandPrimitive as any;

function CommandInput(props: any) {
  return (
    <div className="flex items-center gap-2 px-2">
      <CommandPrimitive.Input
        className={cn("flex h-10 w-full rounded-md border px-2 py-1")}
        {...props}
      />
    </div>
  );
}

function CommandList(props: any) {
  return (
    <CommandPrimitive.List className="max-h-64 overflow-auto" {...props} />
  );
}

export { Command, CommandInput, CommandList };
