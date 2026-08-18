"use client";

import { useMemo, useState } from "react";
import { updateProviderProfileAction } from "@/lib/actions/provider-onboarding";
import { JORDAN_CITIES } from "@/lib/constants";

interface ProfileForm {
  bio: string;
  serviceAreas: string[];
  experience: string;
  serviceIds: string[];
}

interface ServiceOption {
  id: string;
  title: string;
  category: string;
}

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
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
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const grouped = useMemo(() => {
    const groups = new Map<string, ServiceOption[]>();
    for (const service of availableServices) {
      groups.set(service.category, [...(groups.get(service.category) || []), service]);
    }
    return [...groups.entries()];
  }, [availableServices]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await updateProviderProfileAction(form);
    setMessage(result.success
      ? { kind: "success", text: "تم حفظ ملفك وخدماتك بنجاح." }
      : { kind: "error", text: result.error || "تعذر حفظ التغييرات." });
    setPending(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border bg-white p-5 text-right shadow-sm sm:p-8" dir="rtl">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">الملف والخدمات المقدمة</h1>
        <p className="mt-1 text-sm text-slate-600">حدّث نبذتك ومناطق عملك والخدمات التي يمكن تعيينها لك.</p>
      </header>

      <form onSubmit={submit} className="space-y-6">
        <div>
          <label htmlFor="provider-bio" className="mb-1 block text-sm font-semibold">النبذة المهنية</label>
          <textarea id="provider-bio" rows={4} maxLength={1000} value={form.bio}
            onChange={(event) => setForm({ ...form, bio: event.target.value })}
            className="w-full rounded-xl border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600" />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">مناطق الخدمة</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {JORDAN_CITIES.map((city) => (
              <label key={city} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm">
                <input type="checkbox" checked={form.serviceAreas.includes(city)}
                  onChange={() => setForm({ ...form, serviceAreas: toggle(form.serviceAreas, city) })} />
                {city}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="provider-experience" className="mb-1 block text-sm font-semibold">الخبرة المهنية</label>
          <textarea id="provider-experience" rows={3} maxLength={500} value={form.experience}
            onChange={(event) => setForm({ ...form, experience: event.target.value })}
            className="w-full rounded-xl border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600" />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">الخدمات المقدمة</legend>
          <div className="space-y-4">
            {grouped.map(([category, services]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-bold text-slate-500">{category}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {services.map((service) => (
                    <label key={service.id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm">
                      <input type="checkbox" checked={form.serviceIds.includes(service.id)}
                        onChange={() => setForm({ ...form, serviceIds: toggle(form.serviceIds, service.id) })} />
                      {service.title}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        {message && (
          <p role="status" className={`rounded-lg border p-3 text-sm ${message.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {message.text}
          </p>
        )}

        <button type="submit" disabled={pending || form.bio.trim().length < 10 || form.serviceAreas.length === 0 || form.serviceIds.length === 0}
          className="w-full rounded-xl bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>
    </div>
  );
}
