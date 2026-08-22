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
    <main className="mx-auto max-w-5xl space-y-7 px-4 py-6 sm:px-6 sm:py-10">
      <header className="border-b border-theme pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold text-brand">الإشعارات</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">آخر التحديثات</h1>
            <p className="mt-1 text-sm text-muted">
              الحجز والرسائل والعروض وأخبار الحساب بمكان واحد.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <Bell size={15} className="text-brand" />
            {notifications.length} إشعار
          </div>
        </div>
      </header>

      <div className="grid gap-7 lg:grid-cols-[1.25fr_.75fr]">
        <NotificationsClient
          initialNotifications={notifications}
        />

        <aside className="lg:border-r lg:border-theme lg:pr-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand">
              <Smartphone size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold">إشعارات الجهاز</h2>
              <p className="mt-0.5 text-[11px] text-muted">
                اختر التحديثات اللي بدك تستقبلها مباشرة.
              </p>
            </div>
          </div>

          {settings.success ? (
            <PushSettings
              initialPreferences={settings.preferences}
              initialDevices={settings.devices}
              publicKey={settings.publicKey}
            />
          ) : (
            <div className="rounded-2xl border border-theme bg-surface p-5 text-xs text-muted">
              إعدادات إشعارات الجهاز غير متاحة حالياً.
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
