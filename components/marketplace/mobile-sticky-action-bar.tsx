"use client";

import { Zap } from "lucide-react";
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
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-3 md:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-theme bg-[rgb(var(--surface)/0.97)] p-2.5 shadow-soft backdrop-blur-xl">
        <div className="min-w-0 ps-2">
          <span className="block text-[9px] text-muted">السعر</span>
          <strong className="block truncate text-sm font-black text-brand">
            {priceFormatted}
          </strong>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <MessageProviderButton
            providerId={providerId}
            listingId={listingId}
            className="secondary-button !min-h-[42px] !w-11 !rounded-xl !p-0"
          />

          <button
            type="button"
            onClick={scrollToActions}
            className="brand-button !min-h-[42px] !rounded-xl px-4 text-xs font-black"
          >
            <Zap size={13} className="me-1" />
            {isDirectBooking ? "احجز" : "اطلب سعر"}
          </button>
        </div>
      </div>
    </div>
  );
}
