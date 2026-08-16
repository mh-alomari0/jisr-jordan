import React from "react";
import { Star } from "lucide-react";

interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  comment: string;
  rating: number;
}

const TESTIMONIALS: TestimonialItem[] = [
  {
    id: "1",
    name: "أحمد العبدلله",
    role: "عميل - عمان",
    comment: "خدمة صيانة متميزة وسريعة جداً، الفنيون محترفون وودودون.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="py-12 bg-slate-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">
          آراء عملاء &quot;جسر&quot; في الأردن
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((item: TestimonialItem) => (
            <div key={item.id} className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-1 mb-3 text-amber-500">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-4">&quot;{item.comment}&quot;</p>
              <div className="font-semibold text-slate-900">{item.name}</div>
              <div className="text-sm text-slate-500">{item.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}