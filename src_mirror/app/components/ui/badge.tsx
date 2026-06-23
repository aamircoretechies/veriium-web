"use client";

import * as React from "react";
import { cn } from "./utils";

export function Badge({ className, children, ...props }: any) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs", className)} {...props}>
      {children}
    </span>
  );
}
