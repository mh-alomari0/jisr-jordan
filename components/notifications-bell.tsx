"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Sparkles, X } from "lucide-react";
import {
  getUserNotificationsAction,
  markNotificationAsReadAction,
  type NotificationItem,
} from "@/lib/actions/notifications";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      const res = await getUserNotificationsAction();
      if (!isMounted) return;
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
      }
      setLoading(false);
    }

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const res = await markNotificationAsReadAction(id);
    if (res.success) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
      );
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    for (const item of unread) {
      await markNotificationAsReadAction(item.id);
    }
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          unreadCount > 0
            ? `الإشعارات — ${unreadCount} غير مقروءة`
            : "الإشعارات"
        }
        aria-expanded={open}
        className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-theme bg-surface text-muted shadow-sm transition-all hover:text-brand active:scale-95"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-[rgb(var(--accent-peach))]" />
        )}
      </button>

      {open && (
        <div className="page-reveal absolute left-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.8rem] border border-theme bg-[rgb(var(--surface)/0.98)] shadow-lift backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-theme px-4 py-3">
            <div>
              <p className="text-xs font-black">الإشعارات</p>
              <p className="text-[10px] text-muted">
                {unreadCount > 0 ? `${unreadCount} غير مقروءة` : "محدثة بالكامل"}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="rounded-lg px-2 py-1 text-[10px] font-bold text-brand hover:bg-surface-muted"
                >
                  قراءة الكل
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-muted hover:text-[rgb(var(--text-main))]"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2 space-y-1.5">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                  <Bell size={18} />
                </span>
                <p className="text-xs font-bold">لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-2xl p-3 text-xs transition-all ${
                    notification.is_read
                      ? "bg-transparent opacity-80"
                      : "bg-[rgb(var(--primary-soft)/0.6)] border border-[rgb(var(--primary)/0.15)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="block text-[11px]">
                        {notification.title}
                      </strong>
                      <p className="mt-0.5 text-[10px] text-muted leading-5">
                        {notification.message}
                      </p>
                    </div>

                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => void handleMarkAsRead(notification.id)}
                        className="text-brand hover:scale-110"
                        title="تعليم كمقروء"
                      >
                        <CheckCheck size={15} />
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}