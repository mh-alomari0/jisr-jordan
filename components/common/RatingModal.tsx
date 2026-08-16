"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Star, X } from "lucide-react";

export interface RatingModalProps {
  bookingId: string;
  serviceTitle?: string;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

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
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 relative">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-slate-900">تقييم الخدمة</h3>
          {serviceTitle && (
            <p className="text-xs text-slate-500 mt-0.5">{serviceTitle}</p>
          )}
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= rating
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              ملاحظاتك (اختياري)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="اكتب انطباعك عن الخدمة والمزود..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? "جاري الحفظ..." : "إرسال التقييم"}
          </button>
        </form>
      </div>
    </div>
  );
}