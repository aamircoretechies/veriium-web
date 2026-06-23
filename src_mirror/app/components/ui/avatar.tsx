"use client";

import * as React from "react";

export function Avatar({ src, alt, className, ...props }: any) {
  return (
    <img
      src={src}
      alt={alt}
      className={className || "h-8 w-8 rounded-full object-cover"}
      {...props}
    />
  );
}
