"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
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

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleMarkAsRead = async (id: string) => {
    const res = await markNotificationAsReadAction(id);

    if (res.success) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: true } : item,
        ),
      );
    }
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;

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
        className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-surface shadow-[0_4px_15px_rgb(var(--shadow)/0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgb(var(--shadow)/0.08)] active:translate-y-0 active:scale-[0.92] ${
          open
            ? "border-[rgb(var(--primary)/0.40)] text-brand"
            : "border-theme text-muted hover:border-[rgb(var(--primary)/0.28)] hover:text-brand"
        }`}
      >
        <Bell
          className="h-[17px] w-[17px] transition-transform duration-200 group-hover:-rotate-6"
          aria-hidden="true"
        />

        {unreadCount > 0 && (
          <>
            <span className="absolute end-[7px] top-[7px] h-2.5 w-2.5 rounded-full border-2 border-[rgb(var(--surface))] bg-[#f27d65]" />
            <span className="sr-only">{unreadCount} إشعارات غير مقروءة</span>
          </>
        )}
      </button>

      {open && (
        <div className="page-reveal absolute left-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-theme bg-[rgb(var(--surface)/0.98)] shadow-[0_24px_70px_rgb(var(--shadow)/0.16)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-theme px-4 py-3.5">
            <div>
              <p className="text-xs font-bold">الإشعارات</p>
              <p className="mt-0.5 text-[9px] text-muted">
                {unreadCount > 0
                  ? `${unreadCount} غير مقروءة`
                  : "ما في إشعارات جديدة"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="إغلاق الإشعارات"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-muted transition-all duration-200 hover:text-[rgb(var(--text-main))] active:scale-[0.92]"
            >
              <X size={14} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-theme p-3"
                >
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton mt-2 h-2.5 w-full" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-5 py-9 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                <Bell size={18} />
              </span>
              <p className="mt-3 text-xs font-bold">
                ما عندك إشعارات جديدة
              </p>
              <p className="mt-1 text-[9px] leading-5 text-muted">
                أي تحديث مهم على طلباتك أو حسابك رح يظهر هون.
              </p>
            </div>
          ) : (
            <div className="max-h-[360px] space-y-1.5 overflow-y-auto p-2">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-2xl border p-3 transition-all duration-200 ${
                    notification.is_read
                      ? "border-transparent bg-transparent"
                      : "border-[rgb(var(--primary)/0.15)] bg-[rgb(var(--primary-soft)/0.55)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        notification.is_read
                          ? "bg-[rgb(var(--border-strong))]"
                          : "bg-[rgb(var(--primary))]"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-[10px] leading-5 text-muted">
                        {notification.message}
                      </p>
                    </div>

                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleMarkAsRead(notification.id)
                        }
                        title="تعليم كمقروء"
                        aria-label={`تعليم ${notification.title} كمقروء`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand transition-all duration-200 hover:bg-surface active:scale-[0.92]"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
