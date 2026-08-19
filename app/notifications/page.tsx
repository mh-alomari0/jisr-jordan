import { Bell, Smartphone } from "lucide-react";
import { getUserNotificationsAction } from "@/lib/actions/notifications";
import { getPushSettingsAction } from "@/lib/actions/push-notifications";
import NotificationsClient from "./notifications-client";
import PushSettings from "./push-settings";

export const metadata = {
  title: "الإشعارات | جسر الأردن",
  description:
    "جميع الإشعارات والتنبيهات الخاصة بحجوزاتك وخدماتك",
};

export default async function NotificationsPage() {
  const [result, settings] = await Promise.all([
    getUserNotificationsAction(),
    getPushSettingsAction(),
  ]);

  const notifications = result.notifications || [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-[2.1rem] bg-[#0b817a] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <Bell size={20} />
          </span>
          <p className="mt-6 text-[10px] font-bold text-[#c9eee8]">
            كل جديد أول بأول
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            لا يفوتك
            <span className="text-[#ffc985]"> أي تحديث.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9f2ee]">
            تحديثات الحجوزات، الرسائل، عروض الأسعار والحساب تظهر
            هنا، ويمكنك تفعيل إشعارات الهاتف من نفس الصفحة.
          </p>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <NotificationsClient
          initialNotifications={notifications}
        />

        <aside>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
              <Smartphone size={18} />
            </span>
            <div>
              <p className="text-[9px] font-bold text-brand">
                إشعارات الجهاز
              </p>
              <h2 className="text-sm font-bold">
                خلي جسر يوصل لك مباشرة
              </h2>
            </div>
          </div>

          {settings.success ? (
            <PushSettings
              initialPreferences={settings.preferences}
              initialDevices={settings.devices}
              publicKey={settings.publicKey}
            />
          ) : (
            <div className="rounded-[1.8rem] border border-theme bg-surface p-5 text-xs text-muted">
              إعدادات إشعارات الجهاز غير متاحة حالياً.
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
