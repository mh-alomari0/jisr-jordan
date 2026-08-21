"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toggleMarketplaceFavoriteAction } from "@/lib/actions/marketplace-favorites";

export default function FavoriteButton({
  type,
  id,
  label = "حفظ في المفضلة",
}: {
  type: "LISTING" | "PROVIDER";
  id: string;
  label?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState("");

  const toggle = async () => {
    setError("");
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);

    const result = await toggleMarketplaceFavoriteAction({ type, id });
    if (result.success) {
      setSaved(result.saved);
    } else {
      setError(result.error || "تعذر تحديث المفضلة");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        className="secondary-button w-full gap-2 transition-all"
      >
        <Heart
          className={`h-4 w-4 transition-all duration-300 ${
            animating ? "scale-125" : "scale-100"
          } ${
            saved
              ? "fill-[rgb(var(--danger))] text-[rgb(var(--danger))]"
              : "text-muted"
          }`}
        />
        <span className={saved ? "font-black text-[rgb(var(--text-main))]" : ""}>
          {saved ? "محفوظ في المفضلة" : label}
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[10px] font-bold text-[rgb(var(--danger))]">
          {error}
        </p>
      )}
    </div>
  );
}