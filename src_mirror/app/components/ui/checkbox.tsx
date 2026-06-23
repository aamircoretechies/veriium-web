"use client";

import * as React from "react";

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return <input ref={ref} type="checkbox" className={className} {...props} />;
});

Checkbox.displayName = "Checkbox";
