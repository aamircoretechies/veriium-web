"use client";

import React from "react";
import MechanicStateRouter from "../../src_mirror/imports/Mechanic/MechanicStateRouter";

export default function MechanicLayout({ children }: { children: React.ReactNode }) {
  return (
    <MechanicStateRouter>{children}</MechanicStateRouter>
  );
}
