"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaRegistration() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      (location.protocol === "https:" || location.hostname === "localhost")
    ) {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
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
      setDeferredPrompt(null);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(4.8rem+env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-theme bg-[rgb(var(--surface)/0.97)] p-3 shadow-soft backdrop-blur-xl">
        <div className="min-w-0">
          <p className="truncate text-xs font-black">ثبّت جسر على جهازك</p>
          <p className="mt-0.5 truncate text-[10px] text-muted">
            بيفتح أسرع وبيضل قريب منك.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="brand-button !min-h-[36px] !rounded-lg !px-3 text-xs font-black"
          >
            <Download size={13} className="me-1" />
            تثبيت
          </button>

          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-brand"
            aria-label="إغلاق"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
