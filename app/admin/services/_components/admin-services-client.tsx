"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceAction, toggleServiceStatusAction } from "@/lib/actions/admin-services";

interface ServiceItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  category?: string | null;
  is_active: boolean;
  created_at?: string;
}

export default function AdminServicesClient({ initialServices }: { initialServices: ServiceItem[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await createServiceAction({
      title,
      description,
      price: parseFloat(price) || 0,
      category: category as "ELECTRICITY" | "PLUMBING" | "CLEANING" | "HVAC" | "GENERAL",
    });

    if (res.success) {
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("GENERAL");
      setMessage({ type: "success", text: "تمت إضافة الخدمة بنجاح." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: res.error || "تعذر إضافة الخدمة." });
    }
    setLoading(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const res = await toggleServiceStatusAction(id, currentStatus);
    if (!res.success) setMessage({ type: "error", text: res.error || "فشل التحديث" });
    else router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* نموذج إضافة خدمة جديدة */}
      <form onSubmit={handleCreate} className="bg-white p-6 border rounded-xl shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">إضافة خدمة جديدة</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input
            aria-label="اسم الخدمة"
            type="text"
            placeholder="اسم الخدمة"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="border p-2 rounded-md text-sm"
          />
          <input
            aria-label="سعر الخدمة"
            type="number"
            placeholder="السعر (د.أ)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="border p-2 rounded-md text-sm"
          />
          <input
            aria-label="وصف الخدمة"
            type="text"
            placeholder="وصف الخدمة"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border p-2 rounded-md text-sm"
          />
          <select aria-label="تصنيف الخدمة" value={category} onChange={(e) => setCategory(e.target.value)} className="border p-2 rounded-md text-sm bg-white">
            <option value="GENERAL">عام</option>
            <option value="ELECTRICITY">كهرباء</option>
            <option value="PLUMBING">سباكة</option>
            <option value="HVAC">تكييف وتبريد</option>
            <option value="CLEANING">تنظيف</option>
          </select>
        </div>
        {message && <p role="status" className={`rounded-lg border p-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{message.text}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-5 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "جاري الإضافة..." : "حفظ الخدمة"}
        </button>
      </form>

      {/* قائمة الخدمات الحالية */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">اسم الخدمة</th>
              <th className="p-4">السعر</th>
              <th className="p-4">التصنيف</th>
              <th className="p-4">الحالة</th>
              <th className="p-4">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {initialServices.map((srv) => (
              <tr key={srv.id} className="border-b">
                <td className="p-4 font-medium">{srv.title}</td>
                <td className="p-4">{srv.price} د.أ</td>
                <td className="p-4">{srv.category || "عام"}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      srv.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {srv.is_active ? "مفعلة" : "معطلة"}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    type="button"
                    onClick={() => handleToggle(srv.id, srv.is_active)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {srv.is_active ? "تعطيل" : "تفعيل"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
