"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const cities = [
  { name: "الكل", value: "" },
  { name: "عمّان", value: "عمان" },
  { name: "إربد", value: "إربد" },
  { name: "الزرقاء", value: "الزرقاء" },
  { name: "العقبة", value: "العقبة" },
  { name: "السلط", value: "السلط" },
  { name: "مادبا", value: "مادبا" },
  { name: "جرش", value: "جرش" },
  { name: "عجلون", value: "عجلون" },
  { name: "الكرك", value: "الكرك" },
];

export default function JordanCitiesSlider({
  basePath = "/discover",
}: {
  basePath?: string;
}) {
  const searchParams = useSearchParams();
  const currentArea = searchParams.get("area") || "";

  return (
    <nav
      aria-label="تصفية حسب المدينة"
      className="mobile-snap-row -mx-4 border-b border-theme px-4 sm:mx-0 sm:px-0"
    >
      {cities.map((city) => {
        const active = currentArea === city.value;
        const nextQuery = new URLSearchParams(searchParams.toString());

        if (city.value) {
          nextQuery.set("area", city.value);
        } else {
          nextQuery.delete("area");
        }

        const query = nextQuery.toString();
        const href = query ? `${basePath}?${query}` : basePath;

        return (
          <Link
            key={city.name}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 border-b-2 px-1.5 py-3 text-xs transition ${
              active
                ? "border-[rgb(var(--primary))] font-bold text-brand"
                : "border-transparent text-muted hover:text-[rgb(var(--text-main))]"
            }`}
          >
            {city.name}
          </Link>
        );
      })}
    </nav>
  );
}
