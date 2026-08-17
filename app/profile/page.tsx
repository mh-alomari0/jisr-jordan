import { getUserProfileAction } from "@/lib/actions/profile";
import ProfileClient from "./_components/profile-client";

export const metadata = {
  title: "الملف الشخصي | جسر الأردن",
};

export default async function ProfilePage() {
  const result = await getUserProfileAction();

  if (!result.success || !result.profile) {
    return (
      <div className="p-8 text-center text-red-600 bg-white border rounded-xl my-6 container mx-auto">
        <p>{result.error || "تعذر تحميل الملف الشخصي"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">الملف الشخصي</h1>
        <p className="text-gray-600 text-sm">إدارة معلومات الحساب والعنوان الافتراضي والتواصل</p>
      </div>

      <ProfileClient initialProfile={result.profile} />
    </div>
  );
}