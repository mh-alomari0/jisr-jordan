"use client";

import React, { useState } from "react";
import { Star, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export interface RatingModalProps {
  bookingId: string;
  serviceTitle?: string;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ratingLabels = [
  { rating: 1, label: "سيئة" },
  { rating: 2, label: "مقبولة" },
  { rating: 3, label: "جيدة" },
  { rating: 4, label: "ممتازة" },
  { rating: 5, label: "ممتازة جدًا" },
];

const quickChips = [
  "سريع ومتقن",
  "محترم بالتعامل",
  "السعر مناسب",
  "ملتزم بالموعد",
  "الشغل مرتب",
];

export default function RatingModal({
  bookingId,
  serviceTitle,
  isOpen = true,
  onClose,
  onSuccess,
}: RatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentLabel =
    ratingLabels.find((item) => item.rating === rating)?.label || "ممتازة جدًا";

  const handleChipClick = (chip: string) => {
    setComment((prev) => (prev ? `${prev}، ${chip}` : chip));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("سجّل دخولك أولًا عشان تضيف تقييم.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      customer_id: user.id,
      rating,
      comment: comment.trim() || null,
    });

    if (insertError) {
      setError("ما قدرنا نحفظ التقييم. جرّب مرة ثانية.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="relative w-full max-w-md rounded-[1.5rem] border border-theme bg-surface p-5 sm:p-6">
        <button
          onClick={onClose}
          type="button"
          aria-label="إغلاق"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-[rgb(var(--text-main))]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pe-10">
          <p className="text-[10px] font-bold text-brand">بعد ما خلصت الخدمة</p>
          <h3 className="mt-1 text-lg font-black">كيف كانت التجربة؟</h3>
          {serviceTitle && (
            <p className="mt-1 truncate text-xs text-muted">{serviceTitle}</p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-[rgb(var(--danger)/0.08)] p-3 text-xs font-bold text-[rgb(var(--danger))]"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <div className="flex justify-center gap-2" aria-label="اختيار التقييم">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} من 5`}
                  className="p-1 transition-transform active:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= rating
                        ? "fill-[rgb(var(--warning))] text-[rgb(var(--warning))]"
                        : "text-muted opacity-30"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-xs font-bold">{currentLabel}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="rounded-lg border border-theme px-2.5 py-1.5 text-[10px] font-bold text-muted transition hover:border-[rgb(var(--primary)/0.35)] hover:text-brand"
              >
                {chip}
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="form-field !rounded-xl text-xs"
            placeholder="إذا في ملاحظة بتفيد غيرك، اكتبها هون..."
          />

          <button
            type="submit"
            disabled={submitting}
            className="brand-button w-full text-xs font-black"
          >
            {submitting ? "جاري الحفظ..." : "إرسال التقييم"}
          </button>
        </form>
      </div>
    </div>
  );
}
