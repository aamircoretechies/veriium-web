"use client";

import React, { use } from "react";
import MechanicRepairDetail from "../../../../src_mirror/imports/Mechanic/MechanicRepairDetail";

interface Props {
  params: Promise<{ repairId: string }>;
}

export default function RepairPage({ params }: Props) {
  // Although useParams() is used inside MechanicRepairDetail, we keep params unwrap here to satisfy dynamic routes
  const { repairId } = use(params);
  return <MechanicRepairDetail />;
}
