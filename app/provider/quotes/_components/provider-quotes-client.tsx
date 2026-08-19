"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Send,
  WalletCards,
} from "lucide-react";
import { respondToQuoteRequestAction } from "@/lib/actions/marketplace-transactions";

interface ProviderQuoteRow {
  id: string;
  amount: number;
  currency: string;
  timeline_days: number;
  message: string | null;
  status: string;
  expires_at: string;
}

interface ProviderQuoteRequestRow {
  id: string;
  requirements: string;
  budget: number | null;
  target_date: string | null;
  status: string;
  created_at: string;
  service_listings?: {
    id: string;
    slug: string;
    title: string;
    delivery_type: string;
    pricing_model: string;
  } | null;
  provider_quotes?: ProviderQuoteRow[] | null;
}

export default function ProviderQuotesClient({
  requests,
}: {
  requests: ProviderQuoteRequestRow[];
}) {
  const router = useRouter();
  const [activeId, setActiveId] =
    useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [filter, setFilter] = useState("OPEN");

  const visible = useMemo(() => {
    if (filter === "ALL") return requests;
    if (filter === "OPEN")
      return requests.filter((request) =>
        ["REQUESTED", "QUOTED"].includes(
          request.status,
        ),
      );
    return requests.filter(
      (request) => request.status === filter,
    );
  }, [filter, requests]);

  const submit = async (
    requestId: string,
    formData: FormData,
  ) => {
    setPending(true);
    setMessage("");

    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    const result =
      await respondToQuoteRequestAction({
        requestId,
        amount: Number(formData.get("amount")),
        timelineDays: Number(
          formData.get("timelineDays"),
        ),
        message: String(
          formData.get("message") || "",
        ),
        expiresAt: expires.toISOString(),
      });

    setPending(false);

    if (!result.success) {
      setMessage(
        result.error || "تعذر إرسال العرض",
      );
      return;
    }

    setActiveId(null);
    router.refresh();
  };

  const filters = [
    ["OPEN", "المفتوحة"],
    ["REQUESTED", "بانتظار الرد"],
    ["QUOTED", "تم تسعيرها"],
    ["ACCEPTED", "مقبولة"],
    ["ALL", "الكل"],
  ];

  return (
    <section>
      <div className="hide-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {filters.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-bold ${
              filter === id
                ? "bg-[rgb(var(--primary))] text-white"
                : "border border-theme bg-surface text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <p
          role="alert"
          className="mb-4 rounded-2xl bg-[rgb(var(--danger)/0.1)] p-3 text-xs text-[rgb(var(--danger))]"
        >
          {message}
        </p>
      )}

      {visible.length ? (
        <div className="space-y-4">
          {visible.map((request) => {
            const current =
              request.provider_quotes?.find(
                (quote) =>
                  quote.status === "PENDING",
              );

            const respondable = [
              "REQUESTED",
              "QUOTED",
            ].includes(request.status);

            return (
              <article
                key={request.id}
                className="overflow-hidden rounded-[1.8rem] border border-theme bg-surface shadow-soft"
              >
                <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[9px] font-bold text-muted">
                        {request.status}
                      </span>

                      <span className="text-[9px] text-muted">
                        {new Date(
                          request.created_at,
                        ).toLocaleDateString(
                          "ar-JO",
                        )}
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-bold">
                      {request.service_listings
                        ?.title ||
                        "طلب عرض سعر"}
                    </h2>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                      {request.requirements}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <WalletCards size={13} />
                        {request.budget
                          ? `ميزانية العميل: ${request.budget} د.أ`
                          : "لم يحدد ميزانية"}
                      </span>

                      {request.target_date && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={13} />
                          مستهدف:{" "}
                          {new Date(
                            request.target_date,
                          ).toLocaleDateString(
                            "ar-JO",
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <aside className="rounded-2xl bg-surface-muted p-4">
                    {current ? (
                      <>
                        <p className="text-[9px] font-bold text-brand">
                          عرضك الحالي
                        </p>
                        <strong className="mt-1 block text-2xl text-brand">
                          {current.amount} د.أ
                        </strong>
                        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted">
                          <Clock3 size={12} />
                          {current.timeline_days} يوم
                        </p>
                        <p className="mt-1 text-[9px] text-muted">
                          صالح حتى{" "}
                          {new Date(
                            current.expires_at,
                          ).toLocaleDateString(
                            "ar-JO",
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <FileQuestion className="h-6 w-6 text-brand" />
                        <p className="mt-3 text-xs font-bold">
                          ما سعّرت الطلب بعد
                        </p>
                        <p className="mt-1 text-[9px] leading-5 text-muted">
                          راجع التفاصيل ثم أرسل سعراً واضحاً.
                        </p>
                      </>
                    )}
                  </aside>
                </div>

                {respondable && (
                  <div className="border-t border-theme p-5 sm:p-6">
                    {activeId === request.id ? (
                      <form
                        action={(data) =>
                          submit(request.id, data)
                        }
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <label className="text-xs font-bold">
                          السعر النهائي بالدينار
                          <input
                            name="amount"
                            type="number"
                            min="1"
                            max="1000000"
                            step="0.01"
                            required
                            className="form-field mt-1.5"
                          />
                        </label>

                        <label className="text-xs font-bold">
                          مدة التنفيذ بالأيام
                          <input
                            name="timelineDays"
                            type="number"
                            min="1"
                            max="3650"
                            required
                            className="form-field mt-1.5"
                          />
                        </label>

                        <label className="text-xs font-bold sm:col-span-2">
                          رسالة وتفاصيل العرض
                          <textarea
                            name="message"
                            maxLength={2000}
                            rows={4}
                            className="form-field mt-1.5"
                            placeholder="وضح شو بيشمل السعر وأي تفاصيل مهمة للعميل..."
                          />
                        </label>

                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                          <button
                            disabled={pending}
                            className="brand-button gap-1.5"
                          >
                            <Send size={14} />
                            {pending
                              ? "جارٍ الإرسال..."
                              : "إرسال عرض صالح 7 أيام"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setActiveId(null)
                            }
                            className="secondary-button"
                          >
                            إلغاء
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveId(request.id)
                        }
                        className="brand-button gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        {current
                          ? "إرسال عرض جديد"
                          : "إرسال عرض سعر"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[1.8rem] border border-dashed border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.025)] p-10 text-center">
          <FileQuestion className="mx-auto h-8 w-8 text-brand" />
          <h3 className="mt-3 font-bold">
            ما في طلبات ضمن هذه الفئة
          </h3>
          <p className="mt-2 text-xs text-muted">
            الطلبات الجديدة رح تظهر هون أول ما يرسلها العملاء.
          </p>
        </div>
      )}
    </section>
  );
}
