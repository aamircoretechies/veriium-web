"use client";

import * as React from "react";

export function Alert({ children, className, ...props }: any) {
  return (
    <div role="alert" className={className} {...props}>
      {children}
    </div>
  );
}
