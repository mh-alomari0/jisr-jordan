"use client";

import { useState } from "react";
import { updateUserProfileAction, UserProfileData } from "@/lib/actions/profile";

export default function ProfileClient({ initialProfile }: { initialProfile: UserProfileData }) {
  const [fullName, setFullName] = useState(initialProfile.full_name || "");
  const [phone, setPhone] = useState(initialProfile.phone || "");
  const [address, setAddress] = useState(initialProfile.address || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await updateUserProfileAction({
      full_name: fullName,
      phone,
      address,
    });

    if (res.success) {
      alert("تم تحديث الملف الشخصي بنجاح");
    } else {
      alert(res.error || "فشل تحديث البيانات");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto bg-white border rounded-xl p-6 shadow-sm space-y-6 text-right">
      <div className="space-y-1 border-b pb-4">
        <p className="text-xs text-gray-500">البريد الإلكتروني:</p>
        <p className="font-mono text-sm font-semibold text-gray-900">{initialProfile.email}</p>
        <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-xs bg-gray-100 font-semibold text-gray-700">
          الرتبة: {initialProfile.role}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="full-name" className="block text-xs font-medium mb-1">الاسم الكامل</label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="مثال: محمد العمري"
            className="w-full border p-2.5 rounded-md text-sm bg-white"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-xs font-medium mb-1">رقم الهاتف</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="079XXXXXXXX"
            className="w-full border p-2.5 rounded-md text-sm bg-white dir-ltr text-right"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-xs font-medium mb-1">العنوان الافتراضي</label>
          <textarea
            id="address"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="المدينة، الشارع، تفاصيل الموقع..."
            className="w-full border p-2.5 rounded-md text-sm bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>
    </div>
  );
}