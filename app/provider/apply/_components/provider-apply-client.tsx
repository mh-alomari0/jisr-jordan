"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
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
      setBio("");
      setServiceAreas([]);
      setExperience("");
      setServiceIds([]);
    } else {
      setError(res.error || "حدث خطأ غير متوقع");
    }
    setLoading(false);
  }

  // --- 1. If Pending Verification ---
  if (status === "PENDING_VERIFICATION") {
    return (
      <div className="surface-card p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-lift">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-[rgb(var(--warning)/0.12)] text-[rgb(var(--warning))] shadow-sm">
          <Clock3 size={32} />
        </div>
        <h1 className="text-2xl font-black">طلبك قيد المراجعة والتدقيق</h1>
        <p className="text-xs sm:text-sm text-muted leading-6">
          استلمنا طلب انضمامك إلى شبكة مزودي جسر الأردن، ويقوم فريق الإدارة حالياً بمراجعة البيانات واعتمادها. سنقوم بإشعارك فور اكتمال التفعيل.
        </p>
        <Link href="/" className="brand-button mt-4 text-xs font-black">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  // --- 2. If Rejected ---
  const rejected = status === "REJECTED";

  return (
    <div className="surface-card p-6 sm:p-10 space-y-6 shadow-lift">
      <div className="space-y-1.5 border-b border-theme pb-5">
        <span className="inline-flex items-center gap-1.5 status-pill bg-[rgb(var(--primary-soft))] text-brand font-black">
          <Sparkles size={13} /> انضم لنخبة المحترفين
        </span>
        <h1 className="text-2xl font-black sm:text-3xl">سجّل كمقدم خدمة معتمد</h1>
        <p className="text-xs sm:text-sm text-muted">
          أضف نبذة عن خبراتك والخدمات التي تتقنها لتصل إلى آلاف الزبائن في الأردن.
        </p>
      </div>

      {rejected && (
        <div className="rounded-2xl bg-[rgb(var(--danger)/0.08)] border border-[rgb(var(--danger)/0.2)] p-4 text-xs text-[rgb(var(--danger))] font-bold">
          تم رفض طلبك السابق. يمكنك تعديل البيانات وإعادة التقديم الآن.
        </div>
      )}

      {success ? (
        <div className="py-8 text-center space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))] shadow-sm">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-black">تم إرسال طلبك بنجاح! 🎉</h2>
          <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-6">
            شكراً لاهتمامك بالانضمام إلى جسر. سنقوم بمراجعة حسابك والتواصل معك قريباً.
          </p>
          <Link href="/" className="brand-button mt-2 text-xs font-black">
            العودة للرئيسية
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-xs font-black mb-1.5">
              نبذة تعريفية عنك وعن مهارتك <span className="text-[rgb(var(--danger))]">*</span>
            </label>
            <textarea
              id="bio"
              rows={4}
              maxLength={1000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب نبذة واضحة عن اختصاصك وسنوات خبرتك وأهم الأعمال التي أنجزتها..."
              className="form-field !rounded-2xl text-xs py-3"
            />
            <div className="flex justify-between mt-1 text-[10px] text-muted">
              <span>10 أحرف كحد أدنى</span>
              <span>{bio.length}/1000</span>
            </div>
          </div>

          {/* Service Areas */}
          <div>
            <label className="block text-xs font-black mb-2">
              محافظات ومناطق تقديم الخدمة <span className="text-[rgb(var(--danger))]">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {JORDAN_CITIES.map((city) => {
                const checked = serviceAreas.includes(city);
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setServiceAreas((prev) => toggleArrayItem(prev, city))}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 ${
                      checked
                        ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-soft))] text-brand shadow-sm"
                        : "border-theme bg-surface text-muted hover:border-[rgb(var(--primary)/0.3)]"
                    }`}
                  >
                    <span>{city}</span>
                    {checked && <CheckCircle2 size={15} className="text-brand shrink-0" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted mt-1.5">اختر محافظة واحدة على الأقل</p>
          </div>

          {/* Experience */}
          <div>
            <label htmlFor="experience" className="block text-xs font-black mb-1.5">
              سنوات الخبرة أو الشهادات (اختياري)
            </label>
            <input
              id="experience"
              type="text"
              maxLength={100}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="مثلاً: خبرة 7 سنوات، شهادة معتمدة في التمديدات الصحية..."
              className="form-field !rounded-2xl text-xs"
            />
          </div>

          {/* Available Services */}
          <div>
            <label className="block text-xs font-black mb-2">
              الخدمات التي تقدمها <span className="text-[rgb(var(--danger))]">*</span>
            </label>
            {groupedServices.length === 0 ? (
              <p className="text-xs text-muted">لا توجد خدمات متاحة حالياً.</p>
            ) : (
              <div className="space-y-4">
                {groupedServices.map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-[11px] font-black text-brand">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((s) => {
                        const checked = serviceIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setServiceIds((prev) => toggleArrayItem(prev, s.id))}
                            className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all text-start active:scale-95 ${
                              checked
                                ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-soft))] text-brand shadow-sm"
                                : "border-theme bg-surface text-muted hover:border-[rgb(var(--primary)/0.3)]"
                            }`}
                          >
                            <span className="truncate">{s.title}</span>
                            {checked && <CheckCircle2 size={15} className="text-brand shrink-0 ms-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted mt-1.5">اختر خدمة واحدة على الأقل</p>
          </div>

          {error && (
            <div className="rounded-2xl bg-[rgb(var(--danger)/0.08)] p-4 text-xs font-bold text-[rgb(var(--danger))]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="brand-button w-full text-xs font-black shadow-md"
          >
            {loading ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              "إرسال طلب الانضمام"
            )}
          </button>
        </form>
      )}
    </div>
  );
}