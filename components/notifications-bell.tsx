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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        window.innerWidth >= 640 &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    if (window.innerWidth < 640) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleMarkAsRead = async (id: string) => {
    const res = await markNotificationAsReadAction(id);

    if (res.success) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                is_read: true,
              }
            : item,
        ),
      );
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((item) => !item.is_read);

    await Promise.all(
      unread.map((item) => markNotificationAsReadAction(item.id)),
    );

    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        is_read: true,
      })),
    );
  };

  const unreadCount = notifications.filter(
    (item) => !item.is_read,
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
        className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-theme bg-surface text-muted shadow-sm transition-all hover:text-brand active:scale-95"
      >
        <Bell className="h-4 w-4" />

        {unreadCount > 0 && (
          <>
            <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-[rgb(var(--accent-peach))]" />

            <span className="sr-only">
              {unreadCount} إشعارات غير مقروءة
            </span>
          </>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <button
            type="button"
            aria-label="إغلاق الإشعارات"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-[2px] sm:hidden"
          />

          {/* Notifications panel */}
          <section
            role="dialog"
            aria-modal="true"
            aria-label="الإشعارات"
            className="
              fixed
              inset-x-3
              top-[calc(env(safe-area-inset-top)+5.75rem)]
              z-[90]
              flex
              max-h-[calc(100dvh-7rem-env(safe-area-inset-bottom))]
              flex-col
              overflow-hidden
              rounded-[1.75rem]
              border
              border-theme
              bg-[rgb(var(--surface)/0.99)]
              shadow-lift
              backdrop-blur-2xl

              sm:absolute
              sm:inset-x-auto
              sm:end-0
              sm:top-full
              sm:mt-3
              sm:w-[22rem]
              sm:max-h-none
              sm:rounded-[1.8rem]
            "
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-theme px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-black">
                  الإشعارات
                </p>

                <p className="mt-0.5 text-[10px] text-muted">
                  {loading
                    ? "جارٍ التحديث..."
                    : unreadCount > 0
                      ? `${unreadCount} غير مقروءة`
                      : "محدثة بالكامل"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {unreadCount > 0 && !loading && (
                  <button
                    type="button"
                    onClick={() => void handleMarkAllRead()}
                    className="rounded-xl px-2.5 py-2 text-[10px] font-bold text-brand transition hover:bg-surface-muted active:scale-95"
                  >
                    قراءة الكل
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-muted transition hover:text-[rgb(var(--text-main))] active:scale-95"
                  aria-label="إغلاق"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
              {loading ? (
                <div className="space-y-2 p-1">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-2xl bg-surface-muted"
                    />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                    <Bell size={20} />
                  </span>

                  <p className="mt-3 text-xs font-bold">
                    ما عندك إشعارات جديدة
                  </p>

                  <p className="mt-1 max-w-[16rem] text-[10px] leading-5 text-muted">
                    أي تحديث على طلباتك أو رسائلك رح يوصلك هون.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className={`rounded-2xl p-3.5 text-xs transition-all ${
                        notification.is_read
                          ? "bg-transparent"
                          : "border border-[rgb(var(--primary)/0.15)] bg-[rgb(var(--primary-soft)/0.6)]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!notification.is_read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                        )}

                        <div className="min-w-0 flex-1">
                          <strong className="block break-words text-[11px] leading-5">
                            {notification.title}
                          </strong>

                          <p className="mt-1 break-words text-[10px] leading-5 text-muted">
                            {notification.message}
                          </p>
                        </div>

                        {!notification.is_read && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleMarkAsRead(notification.id)
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-brand transition hover:bg-surface active:scale-90"
                            title="تعليم كمقروء"
                            aria-label="تعليم الإشعار كمقروء"
                          >
                            <CheckCheck size={15} />
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}