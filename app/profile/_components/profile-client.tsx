"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import {
  updateUserProfileAction,
  type UserProfileData,
} from "@/lib/actions/profile";
import ProfileMediaEditor from "@/components/profile-media-editor";

export default function ProfileClient({
  initialProfile,
}: {
  initialProfile: UserProfileData;
}) {
  const [fullName, setFullName] = useState(
    initialProfile.full_name || "",
  );
  const [phone, setPhone] = useState(
    initialProfile.phone || "",
  );
  const [address, setAddress] = useState(
    initialProfile.address || "",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const result = await updateUserProfileAction({
      full_name: fullName,
      phone,
      address,
    });

    setMessage(
      result.success
        ? "تم حفظ بياناتك بنجاح."
        : result.error || "فشل تحديث البيانات",
    );

    setLoading(false);
  };

  return (
    <section className="overflow-hidden rounded-[1.8rem] border border-theme bg-surface shadow-soft">
      <ProfileMediaEditor
        audience="CUSTOMER"
        initialAvatar={initialProfile.avatar_url}
        initialCover={initialProfile.cover_url}
        name={initialProfile.full_name || "المستخدم"}
      />

      <div className="p-5 sm:p-6">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-muted p-4">
            <span className="inline-flex items-center gap-1.5 text-[9px] text-muted">
              <Mail size={12} />
              البريد الإلكتروني
            </span>
            <strong className="mt-1 block truncate text-xs">
              {initialProfile.email}
            </strong>
          </div>

          <div className="rounded-2xl bg-surface-muted p-4">
            <span className="inline-flex items-center gap-1.5 text-[9px] text-muted">
              <UserRound size={12} />
              نوع الحساب
            </span>
            <strong className="mt-1 block text-xs">
              {initialProfile.role}
            </strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-bold">
            <span className="inline-flex items-center gap-1.5">
              <UserRound size={14} />
              الاسم الكامل
            </span>
            <input
              type="text"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              placeholder="مثال: محمد العمري"
              className="form-field mt-1.5"
            />
          </label>

          <label className="block text-xs font-bold">
            <span className="inline-flex items-center gap-1.5">
              <Phone size={14} />
              رقم الهاتف
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="079XXXXXXXX"
              className="form-field mt-1.5 text-right"
              dir="ltr"
            />
          </label>

          <label className="block text-xs font-bold">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} />
              العنوان الافتراضي
            </span>
            <textarea
              rows={3}
              value={address}
              onChange={(event) =>
                setAddress(event.target.value)
              }
              placeholder="المحافظة، المنطقة، الشارع، تفاصيل الموقع..."
              className="form-field mt-1.5"
            />
          </label>

          {message && (
            <p className="flex items-center gap-2 rounded-2xl bg-[rgb(var(--primary-soft))] p-3 text-xs">
              <CheckCircle2
                size={15}
                className="text-brand"
              />
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="brand-button w-full"
          >
            {loading
              ? "جارٍ الحفظ..."
              : "حفظ التغييرات"}
          </button>
        </form>

        <p className="mt-5 border-t border-theme pt-4 text-[10px] leading-6 text-muted">
          تغيير البريد أو كلمة المرور أو حذف الحساب يتطلب
          مسار تحقق أمني منفصل. لا يتم تغيير بيانات الدخول من
          هذا النموذج مباشرة.
        </p>
      </div>
    </section>
  );
}
