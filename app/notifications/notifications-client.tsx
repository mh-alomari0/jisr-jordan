"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { markNotificationAsReadAction } from "@/lib/actions/notifications";
import type { NotificationItem } from "@/lib/actions/notifications";

export default function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    const res = await markNotificationAsReadAction(id);
    if (res.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => markNotificationAsReadAction(n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "BOOKING":
        return "bg-blue-100 text-blue-700";
      case "PAYMENT":
        return "bg-green-100 text-green-700";
      case "WARNING":
        return "bg-amber-100 text-amber-700";
      case "SUCCESS":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">الإشعارات</h1>
          {unreadCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">
              {unreadCount} جديدة
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            تعليم الكل كمقروء
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-gray-50 border rounded-xl p-12 text-center">
          <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا توجد إشعارات حالياً</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${
                !notification.is_read ? "border-r-4 border-r-blue-500" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">
                      {notification.title}
                    </h3>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getTypeBadgeStyle(
                        notification.type
                      )}`}
                    >
                      {notification.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(notification.created_at).toLocaleDateString("ar-JO", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="shrink-0 text-[10px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    مقروء
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
