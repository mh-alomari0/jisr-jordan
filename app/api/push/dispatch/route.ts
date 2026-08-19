import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchPushOutbox } from "@/lib/push";

export const runtime = "nodejs";

function validSecret(value: string | null) {
  const expected = process.env.PUSH_DISPATCH_SECRET;
  if (!expected || !value?.startsWith("Bearer ")) return false;
  const actual = value.slice(7);
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!validSecret(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await dispatchPushOutbox()); }
  catch { return NextResponse.json({ error: "Push dispatch unavailable" }, { status: 503 }); }
}
