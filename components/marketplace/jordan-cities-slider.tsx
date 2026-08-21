"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";

const cities = [
  { name: "الكل", value: "", icon: "🇯🇴" },
  { name: "عَمّان", value: "عمان", icon: "🏛️" },
  { name: "إربد", value: "إربد", icon: "🌾" },
  { name: "الزرقاء", value: "الزرقاء", icon: "🏙️" },
  { name: "العقبة", value: "العقبة", icon: "🌊" },
  { name: "السلط", value: "السلط", icon: "🌿" },
  { name: "مادبا", value: "مادبا", icon: "🎨" },
  { name: "جرش", value: "جرش", icon: "🏛️" },
  { name: "عجلون", value: "عجلون", icon: "🏰" },
  { name: "الكرك", value: "الكرك", icon: "⛰️" },
];

export default function JordanCitiesSlider({ basePath = "/discover" }: { basePath?: string }) {
  const searchParams = useSearchParams();
  const currentArea = searchParams.get("area") || "";

  return (
    <div className="mobile-snap-row -mx-4 px-4 py-2 sm:mx-0 sm:px-0">
      {cities.map((city) => {
        const active = currentArea === city.value;
        const nextQuery = new URLSearchParams(searchParams.toString());

        if (city.value) {
          nextQuery.set("area", city.value);
        } else {
          nextQuery.delete("area");
        }

        return (
          <Link
            key={city.name}
            href={`${basePath}?${nextQuery.toString()}`}
            className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all duration-200 active:scale-95 ${
              active
                ? "bg-[rgb(var(--primary))] text-white shadow-md"
                : "border border-theme bg-surface text-muted hover:border-[rgb(var(--primary)/0.3)] hover:text-brand"
            }`}
          >
            <span>{city.icon}</span>
            <span>{city.name}</span>
          </Link>
        );
      })}
    </div>
  );
}