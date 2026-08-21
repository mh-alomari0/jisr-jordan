"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export default function OfflineStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline && !showBackOnline) return null;

  return (
    <div className="fixed top-3 inset-x-3 z-50 flex justify-center pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black shadow-lift transition-all duration-300 ${
          isOffline
            ? "bg-[rgb(var(--danger))] text-white animate-bounce"
            : "bg-[rgb(var(--success))] text-white"
        }`}
      >
        {isOffline ? (
          <>
            <WifiOff size={16} />
            <span>أنت غير متصل بالإنترنت حالياً</span>
          </>
        ) : (
          <>
            <Wifi size={16} />
            <span>تم استعادة الاتصال بالإنترنت ✓</span>
          </>
        )}
      </div>
    </div>
  );
}