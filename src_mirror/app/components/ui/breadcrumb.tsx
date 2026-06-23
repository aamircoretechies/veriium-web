"use client";

import * as React from "react";

export function Breadcrumb({ children, className, ...props }: any) {
  return (
    <nav aria-label="Breadcrumb" className={className} {...props}>
      <ol className="flex items-center gap-2">{children}</ol>
    </nav>
  );
}

export function BreadcrumbItem({ children }: any) {
  return <li className="text-sm">{children}</li>;
}
