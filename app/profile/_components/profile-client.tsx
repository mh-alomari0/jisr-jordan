"use client";

import { useState } from "react";
import { updateUserProfileAction, UserProfileData } from "@/lib/actions/profile";
import ProfileMediaEditor from "@/components/profile-media-editor";

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
    <div className="mx-auto max-w-xl overflow-hidden border-y border-theme bg-surface text-right sm:border">
      <ProfileMediaEditor audience="CUSTOMER" initialAvatar={initialProfile.avatar_url} initialCover={initialProfile.cover_url} name={initialProfile.full_name || "المستخدم"} />
      <div className="space-y-6 p-5 sm:p-6">
      <div className="space-y-1 border-b pb-4">
        <p className="text-xs text-muted">البريد الإلكتروني:</p>
        <p className="font-mono text-sm font-semibold">{initialProfile.email}</p>
        <span className="mt-2 inline-block bg-surface-muted px-2.5 py-0.5 text-xs font-semibold">
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
            className="form-field"
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
            className="form-field dir-ltr text-right"
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
            className="form-field"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="brand-button w-full"
        >
          {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>
      <p className="border-t border-theme pt-4 text-xs leading-6 text-muted">تغيير البريد أو كلمة المرور أو حذف الحساب يتطلب مسار تحقق أمني منفصل. حذف الحساب الذاتي ما يزال معطلاً حتى اعتماد سياسة الاحتفاظ بالمعاملات.</p>
      </div>
    </div>
  );
}
