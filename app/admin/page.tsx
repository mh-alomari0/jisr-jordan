"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getBookingStatusLabel, getBookingStatusStyle } from "@/lib/constants";
import { 
  Clock, Calendar, MapPin, Phone, 
  Loader2, Filter, AlertCircle, RefreshCw, Layers, ShieldAlert, UserCheck, Save
} from "lucide-react";

const ADMIN_EMAILS = ["admin@jisr.com", "mohammad@example.com"]; 

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
  technician_name: string | null;
  technician_phone: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  // حالات تعديل الفنيين المحليين
  const [techInputs, setTechInputs] = useState<Record<string, { name: string; phone: string }>>({});

  useEffect(() => {
    async function checkAdminAndFetch() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/admin");
        return;
      }

      const isAdmin = ADMIN_EMAILS.includes(user.email || "") || user.user_metadata?.role === "admin";

      if (!isAdmin) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setIsAuthorized(true);

      const { data, error: dbError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbError) {
        console.error("Admin Fetch Error:", dbError);
        setError("تعذر جلب البيانات. تأكد من إعدادات القواعد في Supabase.");
      } else {
        setBookings(data || []);
        
        // تجهيز القيم الأولية لحقول الفنيين
        const initialTechs: Record<string, { name: string; phone: string }> = {};
        (data || []).forEach((b) => {
          initialTechs[b.id] = {
            name: b.technician_name || "",
            phone: b.technician_phone || "",
          };
        });
        setTechInputs(initialTechs);
      }

      setLoading(false);
    }

    checkAdminAndFetch();
  }, [router]);

  // تحديث حالة الحجز ومعلومات الفني في Supabase
  const handleUpdateBooking = async (bookingId: string, newStatus?: string) => {
    setUpdatingId(bookingId);
    const tech = techInputs[bookingId] || { name: "", phone: "" };
    const currentBooking = bookings.find((b) => b.id === bookingId);
    const targetStatus = newStatus || currentBooking?.status || "pending";

    try {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ 
          status: targetStatus,
          technician_name: tech.name.trim() || null,
          technician_phone: tech.phone.trim() || null,
        })
        .eq("id", bookingId);

      if (updateError) {
        alert("تعذر حفظ التغييرات. حاول مرة أخرى.");
      } else {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  status: targetStatus,
                  technician_name: tech.name.trim() || null,
                  technician_phone: tech.phone.trim() || null,
                }
              : b
          )
        );
        alert("تم تحديث بيانات الطلب بنجاح!");
      }
    } catch (err) {
      console.error("Update Exception:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-3 text-neutral-muted">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <span className="text-sm font-semibold">جاري التحقق من صلاحيات الأدمن...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-neutral-text mb-2">غير مصرح لك بالدخول</h1>
        <p className="text-neutral-muted text-sm max-w-md mb-6">هذه الصفحة مخصصة لمدراء النظام وفريق الإدارة فقط.</p>
        <button
          onClick={() => router.push("/")}
          className="bg-primary text-white font-bold px-6 py-3 rounded-btn hover:bg-primary-hover transition-colors"
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    );
  }

  const filteredBookings = filterStatus === "all"
    ? bookings
    : bookings.filter((b) => b.status === filterStatus);

  return (
    <div className="py-10 bg-neutral-surface min-h-[85vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-card border border-neutral-border shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-neutral-text">لوحة إدارة الطلبات وإسناد الفنيين</h1>
            <p className="text-xs text-neutral-muted mt-1">تحديث حالات الصيانة وتعيين أسماء وأرقام الفنيين للعملاء.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-neutral-surface border border-neutral-border px-4 py-2.5 rounded-btn text-xs font-bold text-neutral-text hover:bg-neutral-border transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-primary" />
            <span>تحديث البيانات</span>
          </button>
        </div>

        {/* الفلترة */}
        <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-neutral-border overflow-x-auto">
          <Filter className="w-4 h-4 text-neutral-muted mr-2 shrink-0" />
          {[
            { id: "all", label: "الكل" },
            { id: "pending", label: "قيد الانتظار" },
            { id: "accepted", label: "مقبول" },
            { id: "assigned", label: "تم تعيين فني" },
            { id: "in_progress", label: "قيد التنفيذ" },
            { id: "completed", label: "مكتمل" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                filterStatus === f.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-neutral-muted hover:bg-neutral-surface"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* جدول الحجوزات */}
        <div className="bg-white rounded-card border border-neutral-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-surface border-b border-neutral-border text-neutral-muted font-bold uppercase">
                <tr>
                  <th className="py-4 px-4">رقم الطلب</th>
                  <th className="py-4 px-4">الخدمة والعميل</th>
                  <th className="py-4 px-4">الموقع والموعد</th>
                  <th className="py-4 px-4">الفني المسند</th>
                  <th className="py-4 px-4">الحالة</th>
                  <th className="py-4 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border font-medium">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-surface/60 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-neutral-text">
                      #{b.id.slice(0, 8)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-neutral-text block">{b.service_title}</span>
                      <span className="text-[11px] text-neutral-muted" dir="ltr">{b.phone}</span>
                    </td>
                    <td className="py-4 px-4 text-neutral-muted">
                      <span className="font-semibold text-neutral-text block">{b.area}</span>
                      <span className="text-[11px]">{b.booking_date} | {b.booking_time}</span>
                    </td>
                    
                    {/* إدخال بيانات الفني */}
                    <td className="py-4 px-4 space-y-1 min-w-[180px]">
                      <input
                        type="text"
                        placeholder="اسم الفني (مثال: أبو أحمد)"
                        value={techInputs[b.id]?.name || ""}
                        onChange={(e) =>
                          setTechInputs((prev) => ({
                            ...prev,
                            [b.id]: { ...prev[b.id], name: e.target.value },
                          }))
                        }
                        className="w-full p-1.5 bg-neutral-surface border border-neutral-border rounded text-[11px] focus:outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        placeholder="رقم هاتف الفني"
                        value={techInputs[b.id]?.phone || ""}
                        onChange={(e) =>
                          setTechInputs((prev) => ({
                            ...prev,
                            [b.id]: { ...prev[b.id], phone: e.target.value },
                          }))
                        }
                        className="w-full p-1.5 bg-neutral-surface border border-neutral-border rounded text-[11px] focus:outline-none focus:border-primary"
                        dir="ltr"
                      />
                    </td>

                    <td className="py-4 px-4">
                      <select
                        value={b.status}
                        onChange={(e) => handleUpdateBooking(b.id, e.target.value)}
                        className="bg-neutral-surface border border-neutral-border rounded-lg py-1.5 px-2 text-xs font-bold text-neutral-text focus:outline-none focus:border-primary cursor-pointer"
                      >
                        <option value="pending">قيد الانتظار</option>
                        <option value="accepted">مقبول</option>
                        <option value="assigned">تم تعيين فني</option>
                        <option value="in_progress">قيد التنفيذ</option>
                        <option value="completed">مكتمل</option>
                        <option value="cancelled">ملغى</option>
                      </select>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleUpdateBooking(b.id)}
                        disabled={updatingId === b.id}
                        className="bg-primary text-white p-2 rounded-lg hover:bg-primary-hover transition-colors inline-flex items-center justify-center"
                        title="حفظ بيانات الفني"
                      >
                        {updatingId === b.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}