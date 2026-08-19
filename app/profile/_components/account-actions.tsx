"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  LogOut,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import {
  requestAccountDeletionAction,
  signOutAction,
} from "@/lib/actions/account";

export default function AccountActions() {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const requestDelete = () =>
    startTransition(async () => {
      setMessage("");
      const result =
        await requestAccountDeletionAction(confirmation);

      if (!result.success) {
        setMessage(result.error);
        return;
      }

      setMessage(
        "تم تسجيل طلب حذف الحساب. سيتم التعامل معه بشكل آمن مع الحفاظ على السجلات المالية والتشغيلية المطلوبة.",
      );
      setConfirmation("");
    });

  return (
    <>
      <section className="mt-6 overflow-hidden rounded-[1.8rem] border border-theme bg-surface shadow-soft">
        <div className="border-b border-theme p-5">
          <p className="text-[10px] font-bold text-brand">
            إدارة الحساب
          </p>
          <h2 className="mt-1 text-xl font-bold">
            تسجيل الخروج والحذف
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted">
            استخدم تسجيل الخروج للخروج من الجهاز الحالي، أو
            اطلب حذف حسابك نهائياً.
          </p>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <form action={signOutAction}>
            <button
              type="submit"
              className="secondary-button w-full gap-2"
            >
              <LogOut size={16} />
              تسجيل الخروج
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setDeleteOpen(true);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[rgb(var(--danger)/0.35)] px-5 py-2.5 text-sm font-bold text-[rgb(var(--danger))] transition hover:bg-[rgb(var(--danger)/0.06)] active:scale-[0.98]"
          >
            <Trash2 size={16} />
            حذف الحساب
          </button>
        </div>
      </section>

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="w-full max-w-md rounded-[1.8rem] border border-theme bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--danger)/0.1)] text-[rgb(var(--danger))]">
                <ShieldAlert size={20} />
              </span>

              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>

            <h3
              id="delete-account-title"
              className="mt-4 text-xl font-bold"
            >
              حذف الحساب
            </h3>

            <div className="mt-3 flex gap-2 rounded-2xl bg-[rgb(var(--warning)/0.08)] p-3 text-[11px] leading-6">
              <AlertTriangle
                size={16}
                className="mt-1 shrink-0 text-[rgb(var(--warning))]"
              />
              <p>
                لأن الحساب قد يكون مرتبطاً بحجوزات ومدفوعات
                ومحادثات، الحذف يُسجّل كطلب آمن بدل حذف
                السجلات المرتبطة بشكل قد يكسر تاريخ المعاملات.
              </p>
            </div>

            <label className="mt-4 block text-xs font-bold">
              للتأكيد اكتب: حذف حسابي
              <input
                value={confirmation}
                onChange={(event) =>
                  setConfirmation(event.target.value)
                }
                className="form-field mt-1.5"
                placeholder="حذف حسابي"
                autoComplete="off"
              />
            </label>

            {message && (
              <p className="mt-3 rounded-2xl bg-surface-muted p-3 text-[11px] leading-6">
                {message}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="secondary-button"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={
                  pending || confirmation.trim() !== "حذف حسابي"
                }
                onClick={requestDelete}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--danger))] px-5 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={15} />
                {pending ? "جارٍ التسجيل..." : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
