"use client";

import * as React from "react";

export function AccordionItem({ title, children }: any) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        {title}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function Accordion({ children }: any) {
  return <div>{children}</div>;
}
