"use client";

import * as React from "react";
import { cn } from "./utils";

export function Card({ className, children, ...props }: any) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, ...props }: any) {
  return <h3 className={cn("text-sm font-semibold", className)} {...props} />;
}

export function CardContent({ className, ...props }: any) {
  return <div className={cn("text-sm", className)} {...props} />;
}
