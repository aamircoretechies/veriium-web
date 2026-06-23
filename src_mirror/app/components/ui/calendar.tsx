"use client";

import * as React from "react";

export function CalendarPlaceholder({ className, ...props }: any) {
  return (
    <div className={className} {...props}>
      {/* Placeholder calendar for migration mirror */}
      <div className="text-sm text-muted-foreground">Calendar component</div>
    </div>
  );
}
