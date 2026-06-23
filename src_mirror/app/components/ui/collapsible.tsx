"use client";

import * as React from "react";

export function Collapsible({ children, open: openProp, defaultOpen = false }: any) {
  const [open, setOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    if (typeof openProp === "boolean") setOpen(openProp);
  }, [openProp]);

  return <div>{open ? children : null}</div>;
}
