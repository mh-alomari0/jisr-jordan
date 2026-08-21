"use client";

import { useEffect, useState } from "react";
import { Download, Sparkles, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaRegistration() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (
      "serviceWorker" in navigator &&
      (location.protocol === "https:" || location.hostname === "localhost")
    ) {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }

    // 2. Capture Install Prompt for Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.8rem+env(safe-area-inset-bottom))] z-40 md:hidden pointer-events-none">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 rounded-[1.8rem] border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--surface)/0.95)] p-3 shadow-lift backdrop-blur-2xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="brand-mark h-10 w-10 text-base shrink-0">ج</span>
          <div className="min-w-0">
            <p className="text-xs font-black truncate">تطبيق جسر الأردن</p>
            <p className="text-[10px] text-muted truncate">ثبّت التطبيق لوصول أسرع ⚡</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="brand-button !min-h-[36px] !rounded-xl !px-3 text-xs font-black"
          >
            <Download size={13} className="me-1" /> تثبيت
          </button>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="p-1 text-muted hover:text-brand"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}