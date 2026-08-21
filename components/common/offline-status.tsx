"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Wifi, WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export default function OfflineStatus() {
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [showBackOnline, setShowBackOnline] = useState(false);
  const previousOnline = useRef(true);

  useEffect(() => {
    const handleOnline = () => {
      if (!previousOnline.current) {
        setShowBackOnline(true);

        window.setTimeout(() => {
          setShowBackOnline(false);
        }, 3000);
      }

      previousOnline.current = true;
    };

    const handleOffline = () => {
      previousOnline.current = false;
      setShowBackOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isOffline = !isOnline;

  if (!isOffline && !showBackOnline) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-50 flex justify-center">
      <div
        className={`pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black text-white shadow-lift transition-all duration-300 ${
          isOffline
            ? "animate-bounce bg-[rgb(var(--danger))]"
            : "bg-[rgb(var(--success))]"
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
            <span>رجع الإنترنت ✓</span>
          </>
        )}
      </div>
    </div>
  );
}
