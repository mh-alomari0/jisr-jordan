"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { User, Lock, Phone, Mail, CheckCircle2, AlertCircle, Loader2, Save } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // بيانات المستخدم
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    async function loadUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/profile");
        return;
      }

      setEmail(user.email || "");
      setFullName(user.user_metadata?.full_name || "");
      setLoading(false);
    }

    loadUserProfile();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      // 1. تحديث الاسم الكامل في Metadata
      const { error: updateMetaError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      if (updateMetaError) throw updateMetaError;

      // 2. تحديث كلمة المرور إذا تم إدخالها
      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          setError("كلمة المرور يجب أن تتكون من 6 خانات على الأقل.");
          setSaving(false);
          return;
        }

        const { error: passError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passError) throw passError;
        setNewPassword("");
      }

      setSuccess("تم تحديث بيانات حسابك بنجاح!");
      router.refresh();
    } catch (err: any) {
      console.error("Profile Update Error:", err);
      setError(err.message || "حدث خطأ أثناء حفظ التعديلات.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-3 text-neutral-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-semibold">جاري تحضير بيانات الحساب...</span>
      </div>
    );
  }

  return (
    <div className="py-12 bg-neutral-surface min-h-[85vh]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* الترويسة */}
        <div className="bg-white p-6 rounded-card border border-neutral-border shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-light text-primary rounded-full flex items-center justify-center font-bold text-xl shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-text">الملف الشخصي</h1>
            <p className="text-xs text-neutral-muted mt-1">تعديل معلوماتك الشخصية وإعدادات الأمان في منصة جسر.</p>
          </div>
        </div>

        {/* رسائل التنبيه */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center gap-3 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg flex items-center gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* نموذج التعديل */}
        <form onSubmit={handleUpdateProfile} className="bg-white p-6 sm:p-8 rounded-card border border-neutral-border shadow-sm space-y-6">
          
          <div>
            <label className="block text-sm font-semibold text-neutral-text mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span>البريد الإلكتروني (غير قابل للتعديل)</span>
            </label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full py-3 px-4 bg-neutral-surface border border-neutral-border rounded-btn font-medium text-sm text-neutral-muted cursor-not-allowed"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-text mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span>الاسم الكامل</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="أدخل اسمك الكامل"
              className="w-full py-3 px-4 bg-white border border-neutral-border rounded-btn font-medium text-sm text-neutral-text focus:outline-none focus:border-primary"
            />
          </div>

          <hr className="border-neutral-border" />

          <div>
            <label className="block text-sm font-semibold text-neutral-text mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span>تغيير كلمة المرور (اتركها فارغة إذا لا ترغب بالتغيير)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="أدخل كلمة مرور جديدة (6 خانات على الأقل)"
              className="w-full py-3 px-4 bg-white border border-neutral-border rounded-btn font-medium text-sm text-neutral-text focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-btn hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 text-sm"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}