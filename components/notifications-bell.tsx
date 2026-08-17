"use client";

import { useState, useEffect } from "react";
import { getUserNotificationsAction, markNotificationAsReadAction, NotificationItem } from "@/lib/actions/notifications";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      const res = await getUserNotificationsAction();
      if (isMounted) {
        if (res.success && res.notifications) {
          setNotifications(res.notifications);
        }
        setLoading(false);
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const res = await markNotificationAsReadAction(id);
    if (res.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 hover:text-black transition-colors"
        aria-label="الإشعارات"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 bg-white border rounded-xl shadow-lg z-50 p-4 dir-rtl text-right">
          <div className="flex justify-between items-center border-b pb-2 mb-3">
            <h3 className="font-bold text-sm">الإشعارات</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              إغلاق ✕
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-gray-500 text-center py-4">جاري التحميل...</p>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">لا توجد إشعارات جديدة</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-2.5 rounded-lg text-xs transition-colors border ${
                    n.is_read ? "bg-gray-50 border-gray-100" : "bg-blue-50 border-blue-100"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-gray-900">{n.title}</p>
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n.id)}
                        className="text-[10px] text-blue-600 hover:underline shrink-0"
                      >
                        قراءة
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 mt-1">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}