import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getHomeServiceTaxonomyAction } from "@/lib/actions/marketplace-discovery";

export const metadata = {
  title: "دليل أنواع الخدمات | جسر الأردن",
  description: "اختر نوع الخدمة ثم قارن مقدميها حسب السعر والخبرة والتقييم والمنطقة.",
};

export default async function ServicesPage() {
  const result = await getHomeServiceTaxonomyAction();
  const categories = result.categories || [];
  return <main className="mx-auto max-w-6xl px-4 py-8" dir="rtl">
    <header className="border-b border-theme pb-6"><p className="text-xs font-bold text-brand">دليل جسر</p><h1 className="mt-2 text-2xl font-black sm:text-4xl">ما نوع الخدمة التي تحتاجها؟</h1><p className="mt-3 text-sm leading-7 text-muted">جسر يعرّف أنواع الخدمات، ومقدمو الخدمة يحددون عروضهم وأسعارهم. اختر النوع لتقارن بينهم.</p></header>
    <div className="mt-7 space-y-9">{categories.filter((category) => category.serviceTypes.length > 0).map((category) => <section key={category.id} aria-labelledby={`services-${category.id}`}><h2 id={`services-${category.id}`} className="text-xl font-black">{category.name_ar}</h2><div className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{category.serviceTypes.map((service) => <Link key={service.id} href={`/service-types/${service.id}`} className="group flex min-h-20 items-center justify-between gap-3 border-b border-theme py-3"><div><h3 className="font-black group-hover:text-brand">{service.title}</h3>{service.category_name && <p className="mt-1 text-xs text-muted">{service.category_name}</p>}</div><ArrowLeft className="h-4 w-4 shrink-0 text-muted group-hover:text-brand" /></Link>)}</div></section>)}</div>
  </main>;
}
