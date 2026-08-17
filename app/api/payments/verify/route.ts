import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, transactionId, signature } = body;

    if (!bookingId || !transactionId || !signature) {
      return NextResponse.json({ error: "بيانات المعاملة غير مكتملة" }, { status: 400 });
    }

    const secret = process.env.PAYMENT_GATEWAY_SECRET || "default_test_secret";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${bookingId}:${transactionId}`)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "توقيع غير صالح أو معاملة مشبوهة" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const { error } = await supabase
      .from("bookings")
      .update({
        status: "CONFIRMED",
        payment_status: "PAID",
        transaction_id: transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookingId });
  } catch {
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء معالجة الدفع" }, { status: 500 });
  }
}