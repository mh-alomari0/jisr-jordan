import { getUserNotificationsAction } from "@/lib/actions/notifications";
import NotificationsClient from "./notifications-client";

export const metadata = {
  title: "الإشعارات | جسر الأردن",
  description: "جميع الإشعارات والتنبيهات الخاصة بحجوزاتك وخدماتك",
};

export default async function NotificationsPage() {
  const result = await getUserNotificationsAction();
  const notifications = result.notifications || [];

  return <NotificationsClient initialNotifications={notifications} />;
}
