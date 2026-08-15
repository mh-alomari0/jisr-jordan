"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Star, X, Loader2, CheckCircle2 } from "lucide-react";

interface RatingModalProps {
  bookingId: string;
  serviceTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RatingModal({
  bookingId,
  serviceTitle,
  isOpen,
  onClose,
  onSuccess,
}: RatingModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("يرجى تسجيل الدخول مجدداً لإرسال التقييم.");
        setLoading(false);
        return;
      }

      const { error: dbError } = await supabase.from("reviews").insert({
        booking_id: bookingId,
        customer_id: user.id,
        rating,
        comment: comment.trim() || null,
      });

      if (dbError) {
        if (dbError.code === "23505") {
          setError("لقد قمت بتقديم تقييم لهذا الطلب سابقاً.");
        } else {
          setError("تعذر حفظ التقييم. حاول مرة أخرى.");
        }
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Rating Submission Error:", err);
      setError("حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-card border border-neutral-border shadow-2xl max-w-md w-full p-6 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-neutral-muted hover:text-neutral-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Star className="w-6 h-6 fill-amber-500 stroke-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-neutral-text">تقييم الخدمة المنجزة</h2>
          <p className="text-xs text-neutral-muted">
            كيف كانت تجربتك في خدمة <span className="font-bold text-neutral-text">{serviceTitle}</span>؟
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs font-medium border border-rose-200 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* نجوم التقييم */}
          <div className="flex items-center justify-center gap-2 dir-ltr">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= (hoverRating || rating);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      active
                        ? "fill-amber-400 text-amber-400"
                        : "fill-neutral-surface text-neutral-border"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-text mb-2">
              ملاحظاتك وانطباعك عن عمل الفني (اختياري)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="اكتب ملاحظاتك هنا لمساعدتنا في تحسين جودة الخدمات..."
              className="w-full p-3 bg-neutral-surface border border-neutral-border rounded-btn text-xs font-medium focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-btn hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 text-sm"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>إرسال التقييم</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}