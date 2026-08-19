"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Globe2,
  MapPin,
  Monitor,
  Save,
  Sparkles,
} from "lucide-react";
import {
  updateProviderProfileAction,
  updateProviderPublicProfileAction,
} from "@/lib/actions/provider-onboarding";
import { JORDAN_CITIES } from "@/lib/constants";
import ProfileMediaEditor from "@/components/profile-media-editor";

interface ProfileForm {
  bio: string;
  serviceAreas: string[];
  experience: string;
  serviceIds: string[];
  headline: string;
  skills: string[];
  remoteAvailable: boolean;
  publicSlug: string;
  experienceStartYear: number | null;
  experienceVerified: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
}

interface ServiceOption {
  id: string;
  title: string;
  category: string;
}

function toggle(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function ProviderProfileClient({
  initialProfile,
  availableServices,
}: {
  initialProfile: ProfileForm;
  availableServices: ServiceOption[];
}) {
  const [form, setForm] = useState(initialProfile);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const grouped = useMemo(() => {
    const groups = new Map<string, ServiceOption[]>();
    for (const service of availableServices) {
      groups.set(service.category, [
        ...(groups.get(service.category) || []),
        service,
      ]);
    }
    return [...groups.entries()];
  }, [availableServices]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const [result, publicResult] = await Promise.all([
      updateProviderProfileAction(form),
      updateProviderPublicProfileAction({
        headline: form.headline,
        skills: form.skills,
        remoteAvailable: form.remoteAvailable,
        publicSlug: form.publicSlug,
      }),
    ]);

    setMessage(
      result.success && publicResult.success
        ? {
            kind: "success",
            text: "تم حفظ ملفك وخدماتك بنجاح.",
          }
        : {
            kind: "error",
            text:
              result.error ||
              publicResult.error ||
              "تعذر حفظ التغييرات.",
          },
    );

    setPending(false);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-theme bg-surface shadow-soft">
        <ProfileMediaEditor
          audience="PROVIDER"
          initialAvatar={form.avatarUrl}
          initialCover={form.coverUrl}
          name={form.headline || "مقدم الخدمة"}
        />

        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-2">
          <label className="text-xs font-bold lg:col-span-2">
            العنوان المهني
            <input
              value={form.headline}
              maxLength={160}
              onChange={(event) =>
                setForm({
                  ...form,
                  headline: event.target.value,
                })
              }
              placeholder="مثال: مطور متاجر إلكترونية وتجارب عربية"
              className="form-field mt-1.5"
            />
          </label>

          <label className="text-xs font-bold lg:col-span-2">
            المهارات
            <input
              value={form.skills.join("، ")}
              onChange={(event) =>
                setForm({
                  ...form,
                  skills: event.target.value
                    .split(/[،,]/)
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .slice(0, 20),
                })
              }
              placeholder="React، تصميم واجهات، قواعد بيانات"
              className="form-field mt-1.5"
            />
            <span className="mt-1 block text-[9px] font-normal text-muted">
              افصل بين المهارات بفاصلة.
            </span>
          </label>

          <label className="text-xs font-bold">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 size={14} />
              الرابط المهني المختصر
            </span>
            <input
              dir="ltr"
              value={form.publicSlug}
              maxLength={80}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              onChange={(event) =>
                setForm({
                  ...form,
                  publicSlug: event.target.value.toLowerCase(),
                })
              }
              placeholder="ahmad-web"
              className="form-field mt-1.5 text-right"
            />
          </label>

          <label className="text-xs font-bold">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} />
              سنة بدء الخبرة
            </span>
            <input
              type="number"
              min="1950"
              max={new Date().getFullYear()}
              value={form.experienceStartYear || ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  experienceStartYear: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              className="form-field mt-1.5"
            />
            <span className="mt-1 block text-[9px] font-normal text-muted">
              {form.experienceVerified
                ? "تم التحقق إدارياً من هذه المعلومة."
                : "ستظهر على أنها معلومة مقدمة منك."}
            </span>
          </label>

          <label className="text-xs font-bold lg:col-span-2">
            النبذة المهنية
            <textarea
              rows={5}
              maxLength={1000}
              value={form.bio}
              onChange={(event) =>
                setForm({
                  ...form,
                  bio: event.target.value,
                })
              }
              placeholder="عرّف العميل عنك، خبرتك، نوع الشغل اللي تتميز فيه..."
              className="form-field mt-1.5"
            />
          </label>

          <label className="text-xs font-bold lg:col-span-2">
            الخبرة المهنية
            <textarea
              rows={4}
              maxLength={500}
              value={form.experience}
              onChange={(event) =>
                setForm({
                  ...form,
                  experience: event.target.value,
                })
              }
              placeholder="اكتب خبرتك العملية أو أمثلة مختصرة عن المشاريع التي أنجزتها."
              className="form-field mt-1.5"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl bg-[rgb(var(--primary-soft))] p-4 text-xs font-bold lg:col-span-2">
            <input
              type="checkbox"
              checked={form.remoteAvailable}
              onChange={(event) =>
                setForm({
                  ...form,
                  remoteAvailable: event.target.checked,
                })
              }
            />
            <Monitor size={16} className="text-brand" />
            متاح لتقديم خدمات عن بُعد
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-theme bg-surface p-5 shadow-soft sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
            <MapPin size={18} />
          </span>
          <div>
            <p className="text-[10px] font-bold text-brand">
              وين بتشتغل؟
            </p>
            <h2 className="text-lg font-bold">مناطق الخدمة</h2>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {JORDAN_CITIES.map((city) => {
            const active = form.serviceAreas.includes(city);

            return (
              <label
                key={city}
                className={`flex cursor-pointer items-center gap-2 rounded-2xl border p-3 text-xs font-bold transition ${
                  active
                    ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.06)] text-brand"
                    : "border-theme bg-surface"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() =>
                    setForm({
                      ...form,
                      serviceAreas: toggle(
                        form.serviceAreas,
                        city,
                      ),
                    })
                  }
                />
                {city}
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-theme bg-surface p-5 shadow-soft sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8e0d6] text-[#9a5048]">
            <BriefcaseBusiness size={18} />
          </span>
          <div>
            <p className="text-[10px] font-bold text-brand">
              شو بتقدر تقدم؟
            </p>
            <h2 className="text-lg font-bold">
              الخدمات المرتبطة بملفك
            </h2>
          </div>
        </div>

        <p className="mt-3 max-w-2xl text-[10px] leading-6 text-muted">
          هذه الخدمات توضّح مجالات خبرتك وملاءمتك للتعيين. عروضك
          وأسعارك الفعلية تُدار من صفحة «خدماتي».
        </p>

        <div className="mt-6 space-y-6">
          {grouped.map(([category, services]) => (
            <div key={category}>
              <p className="mb-3 text-[10px] font-bold text-brand">
                {category}
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                {services.map((service) => {
                  const active = form.serviceIds.includes(service.id);

                  return (
                    <label
                      key={service.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-2xl border p-3 text-xs transition ${
                        active
                          ? "border-[rgb(var(--primary)/0.45)] bg-[rgb(var(--primary)/0.05)] font-bold"
                          : "border-theme"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() =>
                          setForm({
                            ...form,
                            serviceIds: toggle(
                              form.serviceIds,
                              service.id,
                            ),
                          })
                        }
                      />
                      {service.title}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {message && (
        <p
          role="status"
          className={`flex items-center gap-2 rounded-2xl p-4 text-xs ${
            message.kind === "success"
              ? "bg-[rgb(var(--success)/0.1)] text-[rgb(var(--success))]"
              : "bg-[rgb(var(--danger)/0.1)] text-[rgb(var(--danger))]"
          }`}
        >
          {message.kind === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <Sparkles size={16} />
          )}
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={
          pending ||
          form.bio.trim().length < 10 ||
          form.serviceAreas.length === 0 ||
          form.serviceIds.length === 0
        }
        className="brand-button w-full gap-2"
      >
        <Save size={15} />
        {pending ? "جاري الحفظ..." : "حفظ الملف المهني"}
      </button>
    </form>
  );
}
