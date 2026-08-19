"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Check,
  MessageCircle,
  ShieldCheck,
  Star,
  WalletCards,
} from "lucide-react";
import {
  markNotificationAsReadAction,
  type NotificationItem,
} from "@/lib/actions/notifications";

function groupLabel(dateValue: string) {
  const date = new Date(dateValue);
  const now = new Date();

  const day = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  if (day === today) return "اليوم";
  if (day === today - 86_400_000) return "أمس";
  return "أقدم";
}

function visual(type: NotificationItem["type"]) {
  if (type === "MESSAGE")
    return {
      Icon: MessageCircle,
      style:
        "bg-[rgb(var(--primary-soft))] text-brand",
      label: "رسالة",
    };

  if (type === "BOOKING")
    return {
      Icon: CalendarDays,
      style:
        "bg-[rgb(var(--category-tech)/0.12)] text-[rgb(var(--category-tech))]",
      label: "حجز",
    };

  if (type === "PAYMENT")
    return {
      Icon: WalletCards,
      style:
        "bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))]",
      label: "مالي",
    };

  if (type === "REVIEW")
    return {
      Icon: Star,
      style:
        "bg-[rgb(var(--warning)/0.13)] text-[rgb(var(--warning))]",
      label: "تقييم",
    };

  if (
    ["SECURITY", "PROVIDER", "WARNING"].includes(type)
  )
    return {
      Icon: ShieldCheck,
      style:
        "bg-[rgb(var(--category-education)/0.12)] text-[rgb(var(--category-education))]",
      label: "حساب",
    };

  return {
    Icon: Bell,
    style: "bg-surface-muted text-muted",
    label: "تحديث",
  };
}

export default function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const [notifications, setNotifications] =
    useState(initialNotifications);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;

  const markRead = async (id: string) => {
    const result =
      await markNotificationAsReadAction(id);

    if (result.success) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, is_read: true }
            : item,
        ),
      );
    }
  };

  const markAll = async () => {
    const unread = notifications.filter(
      (item) => !item.is_read,
    );

    await Promise.all(
      unread.map((item) =>
        markNotificationAsReadAction(item.id),
      ),
    );

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        is_read: true,
      })),
    );
  };

  const groups = ["اليوم", "أمس", "أقدم"]
    .map((label) => ({
      label,
      items: notifications.filter(
        (item) =>
          groupLabel(item.created_at) === label,
      ),
    }))
    .filter((group) => group.items.length);

  return (
    <section>
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-brand">
            سجل الإشعارات
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="text-2xl font-bold">
              إشعاراتك
            </h2>

            {unreadCount > 0 && (
              <span className="rounded-full bg-[rgb(var(--primary))] px-2 py-0.5 text-[9px] font-bold text-white">
                {unreadCount} جديدة
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAll}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-brand"
          >
            <Check className="h-4 w-4" />
            تعليم الكل
          </button>
        )}
      </header>

      {!notifications.length ? (
        <div className="rounded-[1.8rem] border border-dashed border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.025)] p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-brand" />
          <h2 className="mt-4 font-bold">
            ما في إشعارات حالياً
          </h2>
          <p className="mt-2 text-xs text-muted">
            تحديثات حجوزاتك ورسائلك وحسابك رح تظهر هون.
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section
              key={group.label}
              aria-labelledby={`notifications-${group.label}`}
            >
              <h3
                id={`notifications-${group.label}`}
                className="mb-3 text-xs font-bold"
              >
                {group.label}
              </h3>

              <div className="overflow-hidden rounded-[1.8rem] border border-theme bg-surface shadow-soft">
                {group.items.map((notification) => {
                  const { Icon, style, label } =
                    visual(notification.type);

                  const content = (
                    <div
                      className={`flex min-h-24 gap-3 border-b border-theme p-4 last:border-0 ${
                        notification.is_read
                          ? ""
                          : "bg-[rgb(var(--primary-soft)/0.28)]"
                      }`}
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold">
                            {notification.title}
                          </h4>
                          <span className="text-[9px] font-bold text-muted">
                            {label}
                          </span>
                        </div>

                        <p className="mt-1 text-xs leading-6 text-muted">
                          {notification.message}
                        </p>

                        <time className="mt-1 block text-[9px] text-muted">
                          {new Date(
                            notification.created_at,
                          ).toLocaleTimeString(
                            "ar-JO",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </time>
                      </div>

                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            void markRead(notification.id);
                          }}
                          className="self-start text-[9px] font-bold text-brand"
                        >
                          مقروء
                        </button>
                      )}
                    </div>
                  );

                  return notification.action_url ? (
                    <Link
                      key={notification.id}
                      href={notification.action_url}
                      onClick={() => {
                        if (!notification.is_read)
                          void markRead(notification.id);
                      }}
                      className="block transition hover:bg-surface-muted"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={notification.id}>
                      {content}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
