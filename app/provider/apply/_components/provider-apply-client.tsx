"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { applyAsProviderAction } from "@/lib/actions/provider-onboarding";
import { JORDAN_CITIES } from "@/lib/constants";

interface AvailableService {
  id: string;
  title: string;
  category: string;
}

interface Props {
  existingProfile: { application_status: string; is_verified: boolean } | null;
  availableServices: AvailableService[];
}

function toggleArrayItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export default function ProviderApplyClient({
  existingProfile,
  availableServices,
}: Props) {
  const router = useRouter();
  const status = existingProfile?.application_status;

  // If already approved, send to the provider dashboard
  useEffect(() => {
    if (status === "APPROVED") {
      router.push("/provider");
    }
  }, [status, router]);

  const [bio, setBio] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const groupedServices = useMemo(() => {
    const map = new Map<string, AvailableService[]>();
    for (const s of availableServices) {
      const list = map.get(s.category) || [];
      list.push(s);
      map.set(s.category, list);
    }
    return Array.from(map.entries());
  }, [availableServices]);

  const canSubmit =
    bio.trim().length >= 10 &&
    serviceAreas.length >= 1 &&
    serviceIds.length >= 1 &&
    !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    const res = await applyAsProviderAction({
      bio: bio.trim(),
      serviceAreas,
      experience: experience.trim() || undefined,
      serviceIds,
    });

    if (res.success) {
      setSuccess(true);
      // Reset the form for a clean slate
      setBio("");
      setServiceAreas([]);
      setExperience("");
      setServiceIds([]);
    } else {
      setError(res.error || "حدث خطأ غير متوقع");
    }
    setLoading(false);
  }

  // --- Already approved: redirecting ---
  if (status === "APPROVED") {
    return (
      <div className="bg-white border rounded-xl shadow-sm p-6 text-center dir-rtl">
        <p className="text-sm text-gray-600">جاري تحويلك إلى بوابة المزودين...</p>
      </div>
    );
  }

  // --- Pending verification: under review ---
  if (status === "PENDING_VERIFICATION") {
    return (
      <div className="bg-white border rounded-xl shadow-sm p-8 text-center dir-rtl space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">طلبك قيد المراجعة</h1>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          تم استلام طلب الانضمام كمقدم خدمة، وسيقوم فريق الإدارة بمراجعته خلال فترة قصيرة.
          سيتم إشعارك فور اتخاذ القرار.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-block bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  // --- Rejected or never applied: show the form (allow re-application) ---
  const rejected = status === "REJECTED";

  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 dir-rtl text-right space-y-6">
      <div className="space-y-1 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">انضم كمقدم خدمة</h1>
        <p className="text-sm text-gray-600">
          املأ بياناتك أدناه، وسيقوم فريق جسر الأردن بمراجعة طلبك للانضمام إلى شبكة المزودين المعتمدين.
        </p>
      </div>

      {rejected && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3" role="alert">
          تم رفض طلبك السابق. يمكنك تعديل البيانات وإعادة التقديم من جديد.
        </div>
      )}

      {success ? (
        <div className="space-y-4 text-center py-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">تم تقديم طلبك بنجاح</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            تم تقديم طلبك بنجاح، سيتم مراجعته من قبل الإدارة. سيتم إشعارك فور صدور القرار.
          </p>
          <Link
            href="/"
            className="inline-block bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            العودة للرئيسية
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-1 text-slate-700">
              نبذة تعريفية عن خبرتك
            </label>
            <textarea
              id="bio"
              rows={4}
              maxLength={1000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب نبذة مختصرة عن خبرتك المهنية والمجالات التي تتميز بها..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-slate-500">10 أحرف على الأقل</p>
              <p className="text-xs text-slate-400">{bio.length}/1000</p>
            </div>
          </div>

          {/* Service Areas */}
          <div>
            <span className="block text-sm font-medium mb-2 text-slate-700">
              مناطق الخدمة
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {JORDAN_CITIES.map((city) => {
                const checked = serviceAreas.includes(city);
                return (
                  <label
                    key={city}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                      checked
                        ? "border-sky-600 bg-sky-50 text-sky-900 font-medium"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setServiceAreas((prev) => toggleArrayItem(prev, city))}
                      className="w-4 h-4 accent-sky-600"
                    />
                    <span>{city}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">حدد منطقة خدمة واحدة على الأقل</p>
          </div>

          {/* Experience */}
          <div>
            <label htmlFor="experience" className="block text-sm font-medium mb-1 text-slate-700">
              الخبرة المهنية <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <textarea
              id="experience"
              rows={3}
              maxLength={500}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="عدد سنوات الخبرة، الشهادات، أو الأعمال السابقة..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
            />
          </div>

          {/* Services */}
          <div>
            <span className="block text-sm font-medium mb-2 text-slate-700">
              الخدمات التي تقدمها
            </span>
            {groupedServices.length === 0 ? (
              <p className="text-xs text-slate-500">لا توجد خدمات متاحة حالياً.</p>
            ) : (
              <div className="space-y-4">
                {groupedServices.map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((s) => {
                        const checked = serviceIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                              checked
                                ? "border-sky-600 bg-sky-50 text-sky-900 font-medium"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setServiceIds((prev) => toggleArrayItem(prev, s.id))}
                              className="w-4 h-4 accent-sky-600"
                            />
                            <span>{s.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">اختر خدمة واحدة على الأقل</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? "جاري التقديم..." : "تقديم طلب الانضمام"}
          </button>
        </form>
      )}
    </div>
  );
}
