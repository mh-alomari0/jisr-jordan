"use client";

import { useState } from "react";
import { BellRing, Smartphone, Trash2 } from "lucide-react";
import { registerPushSubscriptionAction, removePushDeviceAction, saveNotificationPreferencesAction, type NotificationPreferences } from "@/lib/actions/push-notifications";

type Device = { id: string; device_label: string | null; last_seen_at: string; created_at: string };
const rows: Array<{ label: string; app: keyof NotificationPreferences; push: keyof NotificationPreferences }> = [
  { label: "الحجوزات", app: "bookings_in_app", push: "bookings_push" }, { label: "عروض الأسعار", app: "quotes_in_app", push: "quotes_push" },
  { label: "الرسائل النظامية", app: "system_in_app", push: "system_push" }, { label: "العمولات", app: "commissions_in_app", push: "commissions_push" },
  { label: "تحديثات مقدم الخدمة", app: "provider_updates_in_app", push: "provider_updates_push" },
];
function decodeKey(value: string) { const padding = "=".repeat((4 - value.length % 4) % 4); const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...raw].map((char) => char.charCodeAt(0))); }

export default function PushSettings({ initialPreferences, initialDevices, publicKey }: { initialPreferences: NotificationPreferences; initialDevices: Device[]; publicKey: string | null }) {
  const [preferences, setPreferences] = useState(initialPreferences); const [devices, setDevices] = useState(initialDevices);
  const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  const available = Boolean(publicKey && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  async function enablePush() {
    if (!available || !publicKey) { setMessage("Web Push غير مهيأ على هذا النشر بعد."); return; }
    setPending(true); setMessage("");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setMessage("لم يتم منح إذن الإشعارات. يمكنك تغييره من إعدادات المتصفح."); setPending(false); return; }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) });
    const json = subscription.toJSON();
    const result = await registerPushSubscriptionAction({ endpoint: subscription.endpoint, p256dh: json.keys?.p256dh || "", auth: json.keys?.auth || "", expirationTime: subscription.expirationTime, deviceLabel: navigator.platform || "هذا الجهاز" });
    setMessage(result.success ? "تم تفعيل إشعارات هذا الجهاز." : result.error || "تعذر تفعيل الإشعارات"); setPending(false);
    if (result.success) location.reload();
  }
  async function save() { setPending(true); const result = await saveNotificationPreferencesAction(preferences); setMessage(result.success ? "تم حفظ التفضيلات." : result.error || "تعذر الحفظ"); setPending(false); }
  async function remove(id: string) { const result = await removePushDeviceAction(id); if (result.success) setDevices((current) => current.filter((device) => device.id !== id)); else setMessage(result.error || "تعذر حذف الجهاز"); }
  return <section className="border-t border-theme pt-7" aria-labelledby="notification-settings">
    <div className="flex items-start justify-between gap-3"><div><h2 id="notification-settings" className="font-black">تفضيلات الإشعارات</h2><p className="mt-1 text-xs text-muted">Push يعمل للويب والتطبيق المثبت على الشاشة الرئيسية حيث يدعمه النظام.</p></div><button type="button" onClick={enablePush} disabled={pending || !available} className="secondary-button gap-2"><BellRing className="h-4 w-4" /> تفعيل على هذا الجهاز</button></div>
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead><tr className="border-b border-theme text-right text-xs text-muted"><th className="py-2">الفئة</th><th>داخل التطبيق</th><th>Push</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label} className="border-b border-theme"><th className="py-3 font-bold">{row.label}</th><td><input aria-label={`${row.label} داخل التطبيق`} type="checkbox" checked={Boolean(preferences[row.app])} onChange={(event) => setPreferences({ ...preferences, [row.app]: event.target.checked })} /></td><td><input aria-label={`${row.label} Push`} type="checkbox" checked={Boolean(preferences[row.push])} onChange={(event) => setPreferences({ ...preferences, [row.push]: event.target.checked })} /></td></tr>)}</tbody></table></div>
    <button type="button" onClick={save} disabled={pending} className="brand-button mt-4">حفظ التفضيلات</button>
    {devices.length > 0 && <div className="mt-6"><h3 className="flex items-center gap-2 text-sm font-black"><Smartphone className="h-4 w-4" /> الأجهزة المفعلة</h3><ul className="mt-2 divide-y divide-[rgb(var(--border))]">{devices.map((device) => <li key={device.id} className="flex items-center justify-between gap-3 py-3 text-xs"><span>{device.device_label || "جهاز ويب"}<small className="mt-1 block text-muted">آخر اتصال {new Date(device.last_seen_at).toLocaleDateString("ar-JO")}</small></span><button type="button" onClick={() => void remove(device.id)} className="inline-flex items-center gap-1 text-[rgb(var(--danger))]"><Trash2 className="h-4 w-4" /> إزالة</button></li>)}</ul></div>}
    {message && <p role="status" className="mt-4 text-xs text-muted">{message}</p>}
  </section>;
}
