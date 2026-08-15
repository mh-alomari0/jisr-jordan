"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { getBookingStatusLabel, getBookingStatusStyle } from "@/lib/constants";
import BookingStepper from "@/components/common/BookingStepper";
import RatingModal from "@/components/common/RatingModal";
import { 
  Calendar, MapPin, Clock, Phone, LogOut, Loader2, 
  AlertCircle, PlusCircle, User, Trash2, Star, Radio, 
  UserCheck, Printer, Bell, X 
} from "lucide-react";

interface Booking {
  id: string;
  service_title: string;
  area: string;
  address: string;
  notes: string | null;
  booking_date: string;
  booking_time: string;
  phone: string;
  status: string;
  technician_name?: string | null;
  technician_phone?: string | null;
  created_at: string;
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // حالة الإشعار المنبثق اللحظي
  const [liveToast, setLiveToast] = useState<{ message: string; type: string } | null>(null);

  // حالات نظام التقييم بالنجوم
  const [ratingModalData, setRatingModalData] = useState<{ id: string; title: string } | null>(null);
  const [ratedBookings, setRatedBookings] = useState<string[]>([]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchUserAndBookings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login?redirect=/bookings");
          return;
        }

        setUserName(user.user_metadata?.full_name || user.email || null);

        // 1. جلب الحجوزات باستثناء الملغاة
        const { data: bookingsData, error: dbError } = await supabase
          .from("bookings")
          .select("*")
          .eq("customer_id", user.id)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false });

        if (dbError) {
          console.error("Fetch Bookings Error:", dbError);
          setError("تعذر جلب الحجوزات حالياً.");
        } else {
          setBookings(bookingsData || []);

          // جلب سجل التقييمات السابقة
          const { data: reviewsData } = await supabase
            .from("reviews")
            .select("booking_id")
            .eq("customer_id", user.id);

          if (reviewsData) {
            setRatedBookings(reviewsData.map((r) => r.booking_id));
          }
        }

        // 2. إدارة وتنظيف قنوات البث المباشر
        const channelName = `realtime_user_bookings_${user.id}`;
        const existingChannel = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
        if (existingChannel) {
          await supabase.removeChannel(existingChannel);
        }

        // 3. التحديث اللحظي وإظهار إشعار منبثق للعميل
        channel = supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "bookings",
              filter: `customer_id=eq.${user.id}`,
            },
            (payload) => {
              const updatedBooking = payload.new as Booking;
              const statusText = getBookingStatusLabel(updatedBooking.status);
              
              // إظهار إشعار منبثق فور التحديث
              setLiveToast({
                message: `تحديث مباشر: تغيرت حالة طلبك #${updatedBooking.id.slice(0, 8)} إلى (${statusText})`,
                type: updatedBooking.status,
              });

              if (updatedBooking.status === "cancelled") {
                setBookings((prev) => prev.filter((b) => b.id !== updatedBooking.id));
              } else {
                setBookings((prev) =>
                  prev.map((b) => (b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b))
                );
              }
            }
          )
          .subscribe();

      } catch (err) {
        console.error("Auth Exception:", err);
        setError("حدث خطأ غير متوقع.");
      } finally {
        setLoading(false);
      }
    }

    fetchUserAndBookings();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في إلغاء هذا الحجز؟")) return;

    setCancelingId(bookingId);
    try {
      const { data, error: updateError } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId)
        .select();

      if (updateError) {
        console.error("Cancel Error:", updateError);
        alert(`تعذر إلغاء الحجز: ${updateError.message}`);
      } else if (!data || data.length === 0) {
        alert("تنبيه: محظور من قاعدة البيانات! يرجى تنفيذ كود SQL الخاص بصلاحية UPDATE في Supabase.");
      } else {
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      }
    } catch (err) {
      console.error("Cancel Booking Exception:", err);
      alert("حدث خطأ غير متوقع أثناء إلغاء الحجز.");
    } finally {
      setCancelingId(null);
    }
  };

  // دالة طباعة إيصال الحجز
  const handlePrintReceipt = (booking: Booking) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>إيصال حجز صيانة - جسر | JISR</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: 900; color: #0284c7; }
            .box { border: 1px solid #cbd5e1; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
            .label { font-weight: bold; color: #64748b; }
            .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">منصة جسر | JISR</div>
            <p>إيصال طلب خدمة صيانة منزلية</p>
          </div>
          <div class="box">
            <div class="row"><span class="label">رقم الطلب:</span> <span>#${booking.id.slice(0, 8)}</span></div>
            <div class="row"><span class="label">اسم الخدمة:</span> <span>${booking.service_title}</span></div>
            <div class="row"><span class="label">تاريخ الحجز:</span> <span>${booking.booking_date} (${booking.booking_time})</span></div>
            <div class="row"><span class="label">الموقع:</span> <span>${booking.area} - ${booking.address}</span></div>
            <div class="row"><span class="label">رقم الهاتف:</span> <span>${booking.phone}</span></div>
            ${booking.technician_name ? `<div class="row"><span class="label">الفني المسند:</span> <span>${booking.technician_name}</span></div>` : ""}
          </div>
          <div class="footer">شكرًا لاستخدامكم منصة جسر للصيانة المنزلية - الأردن</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const activeBookings = bookings.filter((b) => b.status !== "cancelled");

  if (loading) {
    return (
      <div className="py-12 bg-neutral-surface min-h-[85vh] flex flex-col items-center justify-center gap-3 text-neutral-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-semibold">جاري تحميل حجوزاتك...</span>
      </div>
    );
  }

  return (
    <div className="py-12 bg-neutral-surface min-h-[85vh] relative">
      
      {/* الإشعار المنبثق اللحظي (Live Toast) */}
      {liveToast && (
        <div className="fixed top-24 left-4 right-4 sm:left-auto sm:right-6 z-50 bg-primary text-white p-4 rounded-card shadow-2xl flex items-center justify-between gap-4 max-w-md animate-in slide-in-from-top-5 duration-300">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-300 animate-bounce shrink-0" />
            <span className="text-xs font-bold leading-relaxed">{liveToast.message}</span>
          </div>
          <button onClick={() => setLiveToast(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* الترويسة ومعلومات الحساب */}
        <div className="bg-white p-6 rounded-card border border-neutral-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-light text-primary rounded-full flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-text">حجوزاتي ونشاطي</h1>
                <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Radio className="w-3 h-3 animate-pulse text-emerald-500" />
                  مباشر
                </span>
              </div>
              <p className="text-xs text-neutral-muted mt-0.5">{userName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/booking"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-btn hover:bg-primary-hover transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>طلب حجز جديد</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 bg-neutral-surface text-rose-600 border border-neutral-border text-xs font-bold px-4 py-2.5 rounded-btn hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg flex items-center gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* قائمة الحجوزات */}
        {activeBookings.length === 0 ? (
          <div className="bg-white rounded-card border border-neutral-border p-12 text-center space-y-4">
            <Calendar className="w-16 h-16 text-neutral-muted mx-auto stroke-1" />
            <h2 className="text-lg font-bold text-neutral-text">لا توجد حجوزات حالية</h2>
            <p className="text-xs text-neutral-muted max-w-sm mx-auto">
              لم تقم بطلب أية خدمات صيانة بعد. اضغط على الزر أدناه لاستعراض الخدمات وحجز موعدك الأول.
            </p>
            <Link
              href="/services"
              className="inline-block bg-primary text-white text-xs font-bold px-6 py-3 rounded-btn hover:bg-primary-hover transition-colors mt-2"
            >
              استعراض الخدمات المتاحة
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {activeBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white border border-neutral-border rounded-card p-6 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-2 border-b border-neutral-border pb-3">
                  <div>
                    <span className="text-[10px] text-neutral-muted block font-mono">رقم الطلب: #{booking.id.slice(0, 8)}</span>
                    <h2 className="font-bold text-neutral-text text-lg mt-0.5">{booking.service_title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrintReceipt(booking)}
                      className="p-1.5 text-neutral-muted hover:text-primary transition-colors bg-neutral-surface rounded-lg border border-neutral-border"
                      title="طباعة إيصال الطلب"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${getBookingStatusStyle(booking.status)}`}>
                      {getBookingStatusLabel(booking.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-muted">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span>{booking.area} — {booking.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <span>{booking.booking_date} | {booking.booking_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <span dir="ltr">{booking.phone}</span>
                  </div>
                </div>

                <BookingStepper status={booking.status} />

                {booking.notes && (
                  <div className="bg-neutral-surface p-3 rounded-lg border border-neutral-border text-xs text-neutral-muted">
                    <span className="font-bold text-neutral-text block mb-0.5">ملاحظاتك:</span>
                    {booking.notes}
                  </div>
                )}

                {booking.technician_name && (
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 block font-semibold">الفني المختص بالحجز:</span>
                        <span className="font-bold text-sm text-emerald-950">{booking.technician_name}</span>
                      </div>
                    </div>

                    {booking.technician_phone && (
                      <a
                        href={`tel:${booking.technician_phone}`}
                        className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                        dir="ltr"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{booking.technician_phone}</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-neutral-border flex items-center justify-between text-[11px] text-neutral-muted">
                  <span>تاريخ الطلب: {new Date(booking.created_at).toLocaleDateString("ar-JO")}</span>

                  {booking.status === "pending" && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={cancelingId === booking.id}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {cancelingId === booking.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>إلغاء الحجز</span>
                    </button>
                  )}

                  {booking.status === "completed" && (
                    <>
                      {ratedBookings.includes(booking.id) ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          ✓ تم تقديم التقييم
                        </span>
                      ) : (
                        <button
                          onClick={() => setRatingModalData({ id: booking.id, title: booking.service_title })}
                          className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                          <span>تقييم الخدمة والفني</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {ratingModalData && (
        <RatingModal
          bookingId={ratingModalData.id}
          serviceTitle={ratingModalData.title}
          isOpen={!!ratingModalData}
          onClose={() => setRatingModalData(null)}
          onSuccess={() => {
            setRatedBookings((prev) => [...prev, ratingModalData.id]);
          }}
        />
      )}
    </div>
  );
}