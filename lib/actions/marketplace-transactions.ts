"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { detectContactSignals, PREBOOKING_CONTACT_WARNING } from "@/lib/anti-circumvention";
import { recordBlockedContactAttempt } from "@/lib/contact-protection-server";

const IdSchema = z.string().uuid();
const IdempotencySchema = z.string().min(8).max(120).regex(/^[A-Za-z0-9_-]+$/);
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const TimeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

const QuoteRequestSchema = z.object({
  listingId: z.string().uuid(),
  requirements: z.string().trim().min(20, "اشرح متطلباتك في 20 حرفاً على الأقل").max(4000),
  budget: z.number().finite().positive().max(1_000_000).nullable(),
  targetDate: DateSchema.nullable(),
  idempotencyKey: IdempotencySchema,
});

const QuoteResponseSchema = z.object({
  requestId: z.string().uuid(),
  amount: z.number().finite().positive().max(1_000_000),
  timelineDays: z.number().int().min(1).max(3650),
  message: z.string().trim().max(2000),
  expiresAt: z.string().datetime({ offset: true }),
});

const BookingScheduleSchema = z.object({
  bookingDate: DateSchema,
  startTime: TimeSchema,
  endTime: TimeSchema,
  phone: z.string().regex(/^(077|078|079)\d{7}$/, "أدخل رقم هاتف أردنياً صحيحاً"),
  address: z.string().trim().min(5, "العنوان قصير جداً").max(500),
  idempotencyKey: IdempotencySchema,
}).superRefine((value, context) => {
  if (value.endTime.slice(0, 5) <= value.startTime.slice(0, 5)) {
    context.addIssue({ code: "custom", path: ["endTime"], message: "وقت الانتهاء يجب أن يكون بعد وقت البدء" });
  }
});

function rpcErrorMessage(code: string | undefined) {
  const messages: Record<string, string> = {
    UNAUTHORIZED: "يجب تسجيل الدخول",
    INVALID_REQUEST: "بيانات طلب عرض السعر غير صالحة",
    LISTING_NOT_AVAILABLE: "عرض الخدمة غير متاح حالياً",
    LISTING_NOT_BOOKABLE: "هذا العرض لا يدعم الحجز المباشر",
    FIXED_LISTING: "هذا العرض متاح للحجز المباشر ولا يحتاج عرض سعر",
    OWN_LISTING: "لا يمكنك طلب خدمتك الخاصة",
    REQUEST_NOT_FOUND: "طلب عرض السعر غير موجود أو لا يخص حسابك",
    QUOTE_NOT_FOUND: "عرض السعر غير موجود أو لا يخص حسابك",
    QUOTE_NOT_ACCEPTABLE: "انتهت صلاحية عرض السعر أو لم يعد متاحاً",
    INVALID_STATUS: "لا يمكن تنفيذ الإجراء من الحالة الحالية",
    INVALID_QUOTE: "بيانات عرض السعر غير صالحة",
    INVALID_BOOKING_DATA: "بيانات الموعد والتواصل غير صالحة",
    PROVIDER_NOT_APPROVED: "مقدم الخدمة غير معتمد حالياً",
    SLOT_OCCUPIED: "الموعد المختار غير متاح لدى مقدم الخدمة",
    IDEMPOTENCY_CONFLICT: "تعذر تكرار الطلب بأمان؛ أعد تحميل الصفحة",
    COMMISSION_NOT_CONFIGURED: "لم تُضبط عمولة هذا التصنيف بعد؛ تواصل مع إدارة المنصة",
  };
  return messages[code || ""] || "تعذر إتمام العملية حالياً";
}

export async function requestListingQuoteAction(input: z.input<typeof QuoteRequestSchema>) {
  const parsed = QuoteRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "بيانات الطلب غير صالحة" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const contactSignals = detectContactSignals(parsed.data.requirements);
    if (contactSignals.length) { await recordBlockedContactAttempt(supabase, "QUOTE", null, contactSignals); return { success: false as const, error: PREBOOKING_CONTACT_WARNING }; }
    const rate = await checkRateLimit(`quote:request:${user.id}`, { limit: 8, windowMs: 60 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    const { data, error } = await supabase.rpc("request_listing_quote", {
      p_listing_id: parsed.data.listingId,
      p_requirements: parsed.data.requirements,
      p_budget: parsed.data.budget,
      p_target_date: parsed.data.targetDate,
      p_idempotency_key: parsed.data.idempotencyKey,
    });
    if (error || !data?.success) return { success: false as const, error: rpcErrorMessage(data?.error) };
    revalidatePath("/quotes");
    revalidatePath("/provider/quotes");
    return { success: true as const, quoteRequestId: data.quote_request_id as string };
  } catch (error) {
    logger.error("Quote request failed", { context: "MarketplaceQuote", error });
    return { success: false as const, error: "تعذر إرسال طلب عرض السعر" };
  }
}

export async function respondToQuoteRequestAction(input: z.input<typeof QuoteResponseSchema>) {
  const parsed = QuoteResponseSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "بيانات العرض غير صالحة" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const contactSignals = detectContactSignals(parsed.data.message);
    if (contactSignals.length) { await recordBlockedContactAttempt(supabase, "QUOTE", parsed.data.requestId, contactSignals); return { success: false as const, error: PREBOOKING_CONTACT_WARNING }; }
    const rate = await checkRateLimit(`quote:respond:${user.id}`, { limit: 20, windowMs: 60 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    const { data, error } = await supabase.rpc("respond_to_quote_request", {
      p_request_id: parsed.data.requestId,
      p_amount: parsed.data.amount,
      p_timeline_days: parsed.data.timelineDays,
      p_message: parsed.data.message,
      p_expires_at: parsed.data.expiresAt,
    });
    if (error || !data?.success) return { success: false as const, error: rpcErrorMessage(data?.error) };
    revalidatePath("/provider/quotes");
    revalidatePath("/quotes");
    return { success: true as const, quoteId: data.quote_id as string };
  } catch {
    return { success: false as const, error: "تعذر إرسال عرض السعر" };
  }
}

export async function createListingBookingAction(input: z.input<typeof BookingScheduleSchema> & { listingId: string; notes?: string }) {
  const parsed = BookingScheduleSchema.extend({
    listingId: z.string().uuid(),
    notes: z.string().trim().max(1000).optional(),
  }).safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "بيانات الحجز غير صالحة" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const rate = await checkRateLimit(`listing:book:${user.id}`, { limit: 5, windowMs: 5 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    const { data, error } = await supabase.rpc("create_listing_booking", {
      p_listing_id: parsed.data.listingId,
      p_booking_date: parsed.data.bookingDate,
      p_start_time: parsed.data.startTime,
      p_end_time: parsed.data.endTime,
      p_idempotency_key: parsed.data.idempotencyKey,
      p_phone: parsed.data.phone,
      p_address: parsed.data.address,
      p_notes: parsed.data.notes || null,
    });
    if (error || !data?.success) return { success: false as const, error: rpcErrorMessage(data?.error) };
    revalidatePath("/bookings");
    revalidatePath("/provider");
    return { success: true as const, bookingId: data.booking_id as string };
  } catch {
    return { success: false as const, error: "تعذر إنشاء الحجز" };
  }
}

export async function acceptProviderQuoteAction(input: z.input<typeof BookingScheduleSchema> & { quoteId: string }) {
  const parsed = BookingScheduleSchema.extend({ quoteId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "بيانات القبول غير صالحة" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const rate = await checkRateLimit(`quote:accept:${user.id}`, { limit: 5, windowMs: 10 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    const { data, error } = await supabase.rpc("accept_provider_quote", {
      p_quote_id: parsed.data.quoteId,
      p_booking_date: parsed.data.bookingDate,
      p_start_time: parsed.data.startTime,
      p_end_time: parsed.data.endTime,
      p_idempotency_key: parsed.data.idempotencyKey,
      p_phone: parsed.data.phone,
      p_address: parsed.data.address,
    });
    if (error || !data?.success) return { success: false as const, error: rpcErrorMessage(data?.error) };
    revalidatePath("/quotes");
    revalidatePath("/provider/quotes");
    revalidatePath("/bookings");
    return { success: true as const, bookingId: data.booking_id as string };
  } catch {
    return { success: false as const, error: "تعذر قبول عرض السعر" };
  }
}

export async function rejectProviderQuoteAction(quoteId: string) {
  if (!IdSchema.safeParse(quoteId).success) return { success: false as const, error: "معرف عرض السعر غير صالح" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const { data, error } = await supabase.rpc("reject_provider_quote", { p_quote_id: quoteId });
    if (error || !data?.success) return { success: false as const, error: rpcErrorMessage(data?.error) };
    revalidatePath("/quotes");
    revalidatePath("/provider/quotes");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "تعذر رفض عرض السعر" };
  }
}

export async function getCustomerQuotesAction() {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول", requests: [] };
    const { data, error } = await supabase.from("quote_requests")
      .select("id, listing_id, provider_id, requirements, budget, target_date, status, created_at, service_listings(id, slug, title, delivery_type, pricing_model), provider_quotes(id, amount, currency, timeline_days, message, status, expires_at, created_at)")
      .eq("customer_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (error) return { success: false as const, error: "تعذر تحميل عروض الأسعار", requests: [] };
    return { success: true as const, requests: data || [] };
  } catch {
    return { success: false as const, error: "تعذر تحميل عروض الأسعار", requests: [] };
  }
}

export async function getProviderQuoteRequestsAction() {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول", requests: [] };
    const { data: profile } = await supabase.from("provider_profiles").select("application_status, is_verified")
      .eq("user_id", user.id).maybeSingle();
    if (!profile?.is_verified || profile.application_status !== "APPROVED") {
      return { success: false as const, error: "حساب مقدم الخدمة غير معتمد", requests: [] };
    }
    const { data, error } = await supabase.from("quote_requests")
      .select("id, listing_id, customer_id, requirements, budget, target_date, status, created_at, service_listings(id, slug, title, delivery_type, pricing_model), provider_quotes(id, amount, currency, timeline_days, message, status, expires_at, created_at)")
      .eq("provider_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (error) return { success: false as const, error: "تعذر تحميل طلبات عروض الأسعار", requests: [] };
    return { success: true as const, requests: data || [] };
  } catch {
    return { success: false as const, error: "تعذر تحميل طلبات عروض الأسعار", requests: [] };
  }
}
