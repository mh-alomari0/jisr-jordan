"use client";

import { MessageCircle, Zap } from "lucide-react";
import MessageProviderButton from "./message-provider-button";

export default function MobileStickyActionBar({
  providerId,
  listingId,
  priceFormatted,
  isDirectBooking,
}: {
  providerId: string;
  listingId: string;
  priceFormatted: string;
  isDirectBooking: boolean;
}) {
  const scrollToActions = () => {
    const el = document.getElementById("booking-action-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-3 md:hidden pointer-events-none">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 rounded-[1.8rem] border border-[rgb(var(--border)/0.8)] bg-[rgb(var(--surface)/0.92)] p-2.5 shadow-[0_12px_36px_rgb(var(--shadow)/0.2)] backdrop-blur-2xl">
        <div className="min-w-0 ps-2">
          <span className="block text-[10px] font-bold text-muted">السعر</span>
          <span className="block truncate text-base font-black text-brand">
            {priceFormatted}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <MessageProviderButton
            providerId={providerId}
            listingId={listingId}
            className="secondary-button !min-h-[44px] !w-11 !p-0 !rounded-2xl"
          />

          <button
            type="button"
            onClick={scrollToActions}
            className="brand-button !min-h-[44px] !rounded-2xl px-5 text-xs font-black"
          >
            <Zap size={14} className="me-1 fill-current" />
            {isDirectBooking ? "احجز الآن" : "طلب سعر"}
          </button>
        </div>
      </div>
    </div>
  );
}