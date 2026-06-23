import { verifyQStashSignature } from "@/lib/qstash/verify";
import { NextResponse } from "next/server";

async function handler(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  console.log("[api/jobs/test]", body);
  return NextResponse.json({ received: true, ...body });
}

export const POST = verifyQStashSignature(handler);
