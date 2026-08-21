"use client";

import { useState } from "react";
import { MessageCircle, Share2, Check } from "lucide-react";

export default function ShareButton({
  title,
  url,
}: {
  title: string;
  url?: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? url || window.location.href
      : url || "https://jisr-jordan.com";

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `شوف هذه الخدمة المميزة على جسر الأردن: ${title}\n${shareUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleWhatsAppShare}
        className="secondary-button !min-h-[40px] !rounded-xl !px-3 text-xs font-bold text-[#25D366] hover:bg-[#25D366]/10"
        title="مشاركة عبر واتساب"
      >
        <MessageCircle size={15} className="me-1 fill-current" /> واتساب
      </button>

      <button
        type="button"
        onClick={handleCopy}
        className="secondary-button !min-h-[40px] !rounded-xl !px-3 text-xs font-bold"
        title="نسخ الرابط"
      >
        {copied ? (
          <>
            <Check size={14} className="me-1 text-[rgb(var(--success))]" /> تم النسخ
          </>
        ) : (
          <>
            <Share2 size={14} className="me-1" /> نسخ
          </>
        )}
      </button>
    </div>
  );
}