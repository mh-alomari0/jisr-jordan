"use client";

import { useState } from "react";
import { createServiceAction, toggleServiceStatusAction } from "@/lib/actions/admin-services";

interface ServiceItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  is_active: boolean;
  created_at?: string;
}

export default function AdminServicesClient({ initialServices }: { initialServices: ServiceItem[] }) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const res = await createServiceAction({
      title,
      description,
      price: parseFloat(price) || 0,
    });

    if (res.success) {
      setTitle("");
      setDescription("");
      setPrice("");
      alert("تمت إضافة الخدمة بنجاح");
    } else {
      alert(res.error || "حدث خطأ");
    }
    setLoading(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const res = await toggleServiceStatusAction(id, currentStatus);
    if (!res.success) alert(res.error || "فشل التحديث");
  };

  return (
    <div className="space-y-8">
      {/* نموذج إضافة خدمة جديدة */}
      <form onSubmit={handleCreate} className="bg-white p-6 border rounded-xl shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">إضافة خدمة جديدة</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <input
            type="text"
            placeholder="اسم الخدمة"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="border p-2 rounded-md text-sm"
          />
          <input
            type="number"
            placeholder="السعر (د.أ)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="border p-2 rounded-md text-sm"
          />
          <input
            type="text"
            placeholder="وصف الخدمة"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border p-2 rounded-md text-sm"
          />
        </div>
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
              <th className="p-4">الحالة</th>
              <th className="p-4">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {initialServices.map((srv) => (
              <tr key={srv.id} className="border-b">
                <td className="p-4 font-medium">{srv.title}</td>
                <td className="p-4">{srv.price} د.أ</td>
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