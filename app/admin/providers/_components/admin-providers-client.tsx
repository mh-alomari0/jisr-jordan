"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveProviderAction,
  rejectProviderAction,
  suspendProviderAction,
} from "@/lib/actions/admin-providers";
import type { AdminProvider } from "@/lib/actions/admin-providers";

const STATUS_LABELS: Record<string, string> = {
  PENDING_VERIFICATION: "قيد المراجعة",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
  SUSPENDED: "موقوف",
  NOT_APPLIED: "لم يتقدم",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING_VERIFICATION: "bg-amber-100 text-amber-800 border-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-300",
  SUSPENDED: "bg-purple-100 text-purple-800 border-purple-300",
  NOT_APPLIED: "bg-gray-100 text-gray-800 border-gray-300",
};

const FILTERS = [
  "ALL",
  "PENDING_VERIFICATION",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

export default function AdminProvidersClient({
  providers,
}: {
  providers: AdminProvider[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filteredProviders =
    statusFilter === "ALL"
      ? providers
      : providers.filter((p) => p.application_status === statusFilter);

  const handleApprove = async (userId: string) => {
    setLoadingId(userId);
    const res = await approveProviderAction(userId);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "فشل اعتماد مزود الخدمة");
    }
    setLoadingId(null);
  };

  const handleSuspend = async (userId: string) => {
    setLoadingId(userId);
    const res = await suspendProviderAction(userId);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "فشل إيقاف مزود الخدمة");
    }
    setLoadingId(null);
  };

  const handleReject = async (userId: string) => {
    setLoadingId(userId);
    const res = await rejectProviderAction(userId, rejectReason);
    if (res.success) {
      setRejectingId(null);
      setRejectReason("");
      router.refresh();
    } else {
      alert(res.error || "فشل رفض الطلب");
    }
    setLoadingId(null);
  };

  return (
    <div className="space-y-4 text-right dir-rtl">
      {/* Filter tabs */}
      <div className="flex gap-2 border-b pb-3 flex-wrap">
        {FILTERS.map((st) => {
          const count =
            st === "ALL"
              ? providers.length
              : providers.filter((p) => p.application_status === st).length;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                statusFilter === st
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {st === "ALL"
                ? `الكل (${count})`
                : `${STATUS_LABELS[st] || st} (${count})`}
            </button>
          );
        })}
      </div>

      {/* Provider cards */}
      {filteredProviders.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-white border rounded-xl">
          لا توجد طلبات تطابق خيار الفلترة المحدد.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProviders.map((p) => (
            <div
              key={p.id}
              className="bg-white border rounded-xl shadow-sm p-5 space-y-3"
            >
              {/* Header row */}
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-bold text-gray-900">
                    {p.users?.full_name || "بدون اسم"}
                  </h3>
                  <p className="text-gray-500 font-mono text-xs">
                    {p.users?.email}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {p.users?.phone || "—"}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    STATUS_STYLES[p.application_status] ||
                    STATUS_STYLES.NOT_APPLIED
                  }`}
                >
                  {STATUS_LABELS[p.application_status] || p.application_status}
                </span>
              </div>

              {/* Details */}
              <div className="grid gap-2 text-sm text-gray-700">
                {p.bio && (
                  <p>
                    <span className="font-semibold">نبذة:</span> {p.bio}
                  </p>
                )}
                {p.experience && (
                  <p>
                    <span className="font-semibold">الخبرة:</span> {p.experience}
                  </p>
                )}
                {p.service_areas && p.service_areas.length > 0 && (
                  <p>
                    <span className="font-semibold">مناطق الخدمة:</span>{" "}
                    {p.service_areas.join("، ")}
                  </p>
                )}
                {p.provider_services && p.provider_services.length > 0 && (
                  <div>
                    <span className="font-semibold">الخدمات المقدمة:</span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {p.provider_services.map((ps) => (
                        <span
                          key={ps.service_id}
                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs"
                        >
                          {ps.services?.title || "خدمة"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {p.applied_at && (
                  <p className="text-xs text-gray-400">
                    تاريخ التقدم:{" "}
                    {new Date(p.applied_at).toLocaleDateString("ar-EG")}
                  </p>
                )}
                {p.application_notes && (
                  <p className="text-xs text-rose-600">
                    سبب الرفض: {p.application_notes}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t">
                {p.application_status === "PENDING_VERIFICATION" && (
                  <>
                    <button
                      type="button"
                      disabled={loadingId === p.user_id}
                      onClick={() => handleApprove(p.user_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {loadingId === p.user_id ? "جاري التنفيذ..." : "اعتماد"}
                    </button>
                    <button
                      type="button"
                      disabled={loadingId === p.user_id}
                      onClick={() => {
                        setRejectingId(p.user_id);
                        setRejectReason("");
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      رفض
                    </button>
                  </>
                )}

                {p.application_status === "REJECTED" && (
                  <button
                    type="button"
                    disabled={loadingId === p.user_id}
                    onClick={() => handleApprove(p.user_id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loadingId === p.user_id
                      ? "جاري التنفيذ..."
                      : "إعادة المراجعة (اعتماد)"}
                  </button>
                )}

                {p.application_status === "APPROVED" && (
                  <button
                    type="button"
                    disabled={loadingId === p.user_id}
                    onClick={() => handleSuspend(p.user_id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                  >
                    {loadingId === p.user_id ? "جاري التنفيذ..." : "إيقاف مؤقت"}
                  </button>
                )}

                {p.application_status === "SUSPENDED" && (
                  <button
                    type="button"
                    disabled={loadingId === p.user_id}
                    onClick={() => handleApprove(p.user_id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loadingId === p.user_id ? "جاري التنفيذ..." : "إعادة تفعيل"}
                  </button>
                )}
              </div>

              {/* Reject reason prompt */}
              {rejectingId === p.user_id && (
                <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                  <textarea
                    placeholder="سبب الرفض (اختياري)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full border p-2 rounded text-sm bg-white"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={loadingId === p.user_id}
                      onClick={() => handleReject(p.user_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {loadingId === p.user_id ? "جاري الرفض..." : "تأكيد الرفض"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
