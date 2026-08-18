"use client";

import { useState } from "react";
import { submitServiceReviewAction, ReviewItem } from "@/lib/actions/reviews";

export default function ServiceReviews({
  serviceId,
  initialReviews,
  initialAverage,
}: {
  serviceId: string;
  initialReviews: ReviewItem[];
  initialAverage: number;
}) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await submitServiceReviewAction(serviceId, rating, comment);
    if (res.success) {
      alert("شكرًا لك! تم حفظ تقييمك بنجاح");
      setReviews((prev) => [
        {
          id: Date.now().toString(),
          service_id: serviceId,
          customer_id: "current-user",
          rating,
          comment,
          created_at: new Date().toISOString(),
          users: { email: "تقييمك الحالي" },
        },
        ...prev,
      ]);
      setComment("");
    } else {
      alert(res.error || "تعذر حفظ التقييم");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 dir-rtl text-right bg-white p-6 border rounded-xl shadow-sm">
      <div className="flex justify-between items-center border-b pb-4">
        <h3 className="text-xl font-bold">آراء وتقييمات العملاء</h3>
        <div className="text-left dir-ltr">
          <span className="text-2xl font-black text-yellow-500">★ {initialAverage}</span>
          <span className="text-xs text-gray-500 block">({reviews.length} تقييم)</span>
        </div>
      </div>

      {/* نموذج التقييم */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg border">
        <h4 className="font-semibold text-sm">أضف تقييمك للخدمة</h4>
        <div className="flex gap-2 items-center">
          <label htmlFor="rating-select" className="text-xs font-medium">النقاط:</label>
          <select
            id="rating-select"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="border rounded p-1 text-xs bg-white"
          >
            <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
            <option value={4}>⭐⭐⭐⭐ (4/5)</option>
            <option value={3}>⭐⭐⭐ (3/5)</option>
            <option value={2}>⭐⭐ (2/5)</option>
            <option value={1}>⭐ (1/5)</option>
          </select>
        </div>

        <textarea
          rows={3}
          placeholder="اكتب ملاحظاتك أو انطباعك عن الخدمة..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border p-2.5 rounded-md text-xs bg-white"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-5 py-2 rounded-md text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "جاري الحفظ..." : "إرسال التقييم"}
        </button>
      </form>

      {/* قائمة التقييمات */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">لا توجد تقييمات لهذه الخدمة بعد. كن أول من يقيّم!</p>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="border-b pb-3 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">{rev.users?.email || "عميل موثوق"}</span>
                <span className="text-yellow-500 font-bold">{"★".repeat(rev.rating)}</span>
              </div>
              {rev.comment && <p className="text-gray-600">{rev.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}