import { getUserNotificationsAction } from "@/lib/actions/notifications";
import NotificationsClient from "./notifications-client";
import PushSettings from "./push-settings";
import { getPushSettingsAction } from "@/lib/actions/push-notifications";

export const metadata = {
  title: "الإشعارات | جسر الأردن",
  description: "جميع الإشعارات والتنبيهات الخاصة بحجوزاتك وخدماتك",
};

export default async function NotificationsPage() {
  const [result, settings] = await Promise.all([getUserNotificationsAction(), getPushSettingsAction()]);
  const notifications = result.notifications || [];

  return <div className="mx-auto max-w-2xl px-4 py-8"><NotificationsClient initialNotifications={notifications} />{settings.success && <PushSettings initialPreferences={settings.preferences} initialDevices={settings.devices} publicKey={settings.publicKey} />}</div>;
}
