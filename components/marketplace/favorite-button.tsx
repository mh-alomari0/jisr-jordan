"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toggleMarketplaceFavoriteAction } from "@/lib/actions/marketplace-favorites";

export default function FavoriteButton({ type, id, label = "حفظ في المفضلة" }: { type: "LISTING" | "PROVIDER"; id: string; label?: string }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const toggle = async () => {
    setError("");
    const result = await toggleMarketplaceFavoriteAction({ type, id });
    if (result.success) setSaved(result.saved);
    else setError(result.error || "تعذر تحديث المفضلة");
  };
  return (
    <div>
      <button type="button" onClick={toggle} aria-pressed={saved}
        className="secondary-button w-full gap-2">
        <Heart className={saved ? "h-4 w-4 fill-current text-brand" : "h-4 w-4"} />
        {saved ? "محفوظ" : label}
      </button>
      {error && <p role="alert" className="mt-2 text-[11px] text-[rgb(var(--danger))]">{error}</p>}
    </div>
  );
}

