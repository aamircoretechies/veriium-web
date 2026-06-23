import { getHealthStatus } from "@/lib/health";
import { NextResponse } from "next/server";

export async function GET() {
  const health = await getHealthStatus();
  return NextResponse.json(health);
}
