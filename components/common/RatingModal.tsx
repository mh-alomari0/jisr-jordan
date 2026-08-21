"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Star, X, Sparkles } from "lucide-react";

export interface RatingModalProps {
  bookingId: string;
  serviceTitle?: string;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ratingReactions = [
  { rating: 1, emoji: "😞", label: "تجربة غير مرضية" },
  { rating: 2, emoji: "😐", label: "مقبول يحتاج تحسين" },
  { rating: 3, emoji: "😊", label: "جيد ومناسب" },
  { rating: 4, emoji: "😃", label: "ممتاز جداً" },
  { rating: 5, emoji: "🤩", label: "خرافي ومتقن للغاية!" },
];

const quickChips = [
  "سريع ومتقن ⚡",
  "خلوق ومحترم 🤝",
  "سعر مناسب 💰",
  "دقيق في الموعد ⏱️",
  "شغل نظيف 🧼",
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

  const currentReaction =
    ratingReactions.find((r) => r.rating === rating) || ratingReactions[4];

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
      setError("يجب تسجيل الدخول لتقديم التقييم");
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
      setError("تعذر حفظ التقييم. يرجى المحاولة لاحقاً.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div className="surface-card w-full max-w-md !rounded-[2.2rem] p-6 space-y-5 relative page-reveal">
        <button
          onClick={onClose}
          type="button"
          aria-label="إغلاق"
          className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-muted transition hover:text-[rgb(var(--text-main))]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1">
          <span className="text-4xl animate-bounce inline-block">
            {currentReaction.emoji}
          </span>
          <h3 className="text-lg font-black">{currentReaction.label}</h3>
          {serviceTitle && (
            <p className="text-xs text-muted truncate">{serviceTitle}</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-xs font-bold text-[rgb(var(--danger))] bg-[rgb(var(--danger)/0.08)] p-3 rounded-xl text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Selector */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 focus:outline-none transition-transform active:scale-125"
              >
                <Star
                  className={`w-9 h-9 transition-colors ${
                    star <= rating
                      ? "text-[rgb(var(--warning))] fill-[rgb(var(--warning))]"
                      : "text-muted opacity-30"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Quick feedback chips */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-bold text-muted transition hover:text-brand active:scale-95"
              >
                + {chip}
              </button>
            ))}
          </div>

          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="form-field !rounded-2xl text-xs"
              placeholder="شاركنا رأيك بتفاصيل أكثر لمساعدة الآخرين..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="brand-button w-full text-xs font-black shadow-md"
          >
            {submitting ? "جارٍ الحفظ..." : "إرسال التقييم"}
          </button>
        </form>
      </div>
    </div>
  );
}