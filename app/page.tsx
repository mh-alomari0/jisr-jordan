import Link from "next/link";
import {
  ArrowLeft, BriefcaseBusiness, ChevronLeft, Code2, GraduationCap,
  House, LayoutGrid, MessageCircleMore, Package, PaintRoller,
  Palette, Search, Shapes, ShieldCheck, Sparkles, Star, Wrench,
} from "lucide-react";
import SearchResultCard from "@/components/marketplace/search-result-card";
import {
  getHomeServiceTaxonomyAction,
  getMarketplaceCategoriesAction,
  searchMarketplaceAction,
} from "@/lib/actions/marketplace-discovery";

const categoryVisuals = {
  "home-services": { icon: House, tone: "bg-[#d8f0e9] text-[#087a72]" },
  "technology-programming": { icon: Code2, tone: "bg-[#dce9f8] text-[#326a96]" },
  "education-training": { icon: GraduationCap, tone: "bg-[#fbe8ba] text-[#8a641c]" },
  "beauty-care": { icon: Sparkles, tone: "bg-[#f9dce8] text-[#a14670]" },
  "design-creative": { icon: Palette, tone: "bg-[#e2e3f7] text-[#5d5799]" },
  "maintenance-repair": { icon: Wrench, tone: "bg-[#e6e4db] text-[#607064]" },
  "other-services": { icon: Shapes, tone: "bg-[#dcefe5] text-[#267a57]" },
} as const;

function SectionHeading({ eyebrow, title, copy, href, action }: {
  eyebrow?: string; title: string; copy?: string; href?: string; action?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-bold text-brand">{eyebrow}</p>}
        <h2 className="text-2xl font-black tracking-[-.05em] sm:text-3xl">{title}</h2>
        {copy && <p className="mt-2 text-xs leading-6 text-muted sm:text-sm">{copy}</p>}
      </div>
      {href && action && (
        <Link href={href} className="hidden shrink-0 items-center gap-1 rounded-full border border-theme bg-surface px-4 py-2 text-xs font-bold text-brand transition hover:-translate-y-0.5 hover:shadow-soft active:scale-[.98] sm:flex">
          <ChevronLeft size={15}/>{action}
        </Link>
      )}
    </div>
  );
}

function ObjectTile({ icon: Icon, label, className = "" }: {
  icon: typeof Wrench; label: string; className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-[1.6rem] border border-white/70 bg-[#fbf8f1] shadow-[0_16px_45px_rgba(4,66,64,.10)] ${className}`}>
      <span className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#e1f3ef] text-[#087f79]">
        <Icon strokeWidth={1.55} size={39}/>
      </span>
      <span className="mt-3 text-xs font-black text-[#164348]">{label}</span>
    </div>
  );
}

export default async function HomePage() {
  const [categoriesResult, taxonomyResult, providersResult, listingsResult, postsResult] =
    await Promise.all([
      getMarketplaceCategoriesAction(),
      getHomeServiceTaxonomyAction(),
      searchMarketplaceAction({ scope: "PROVIDERS", pageSize: 4 }),
      searchMarketplaceAction({ scope: "LISTINGS", pageSize: 4 }),
      searchMarketplaceAction({ scope: "POSTS", pageSize: 4 }),
    ]);

  const categories = (categoriesResult.categories || []).filter(
    (c) => c.slug !== "business-consulting" && c.slug !== "events"
  );
  const serviceTypes = (taxonomyResult.categories || [])
    .flatMap((c) => c.serviceTypes || []).slice(0, 8);
  const providers = providersResult.results || [];
  const listings = listingsResult.results || [];
  const posts = postsResult.results || [];

  return (
    <div className="page-reveal pb-14 sm:pb-20">
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-7 sm:px-6 sm:pt-12 lg:pb-16">
        <div className="overflow-hidden rounded-[2.25rem] border border-[rgb(var(--primary)/.12)] bg-[#087f79] shadow-lift">
          <div className="grid lg:grid-cols-2">
            {/* RTL: text is first, so it sits on the right. */}
            <div className="relative flex min-h-[500px] items-center overflow-hidden bg-gradient-to-br from-[#075a5e] via-[#087f79] to-[#0aa098] px-6 py-10 text-white sm:px-10 lg:px-12">
              <div className="absolute -bottom-28 -right-20 h-72 w-72 rounded-full border-[30px] border-white/8"/>
              <div className="relative w-full">
               
                <h1 className="mt-5 text-[2.7rem] font-black leading-[1.08] tracking-[-.075em] sm:text-5xl lg:text-[4rem]">
                  الشغل عليك،
                  <br/><span className="text-[#26d7cf]">وعلينا نكبّر اسمك.</span>
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-7 text-[#d9f3ee]">
                  بدك خدمة؟ دور عليها، شوف مين بناسبك، واحكي معه من جسر.
                  عندك شغلة بتتقنها؟ ورّينا شغلك وخلي الناس تلاقيك.
                </p>

                <form action="/discover" role="search" className="mt-7">
                  <div className="flex min-h-16 items-center gap-3 rounded-2xl bg-white px-3 py-2 text-[rgb(var(--text-main))] shadow-[0_20px_50px_rgba(2,45,42,.22)]">
                    <Search size={20} className="shrink-0 text-[#159d95]"/>
                    <input name="q" type="search" maxLength={120}
                      placeholder="شو بدك تنجز اليوم؟"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"/>
                    <button className="min-h-11 rounded-xl bg-[#159d95] px-5 text-xs font-bold text-white transition hover:-translate-y-0.5 active:scale-[.97]">
                      دور
                    </button>
                  </div>
                </form>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    [ShieldCheck, "اختار براحتك"],
                    [MessageCircleMore, "احكي مباشرة"],
                    [Star, "شوف التقييمات"],
                  ].map(([Icon, text]) => {
                    const I = Icon as typeof ShieldCheck;
                    return <div key={String(text)} className="rounded-2xl border border-white/15 bg-white/10 p-3">
                      <I size={16} className="text-[#a9eee6]"/>
                      <p className="mt-2 text-[10px] font-bold">{String(text)}</p>
                    </div>
                  })}
                </div>
              </div>
            </div>

            {/* Desktop object collage; completely hidden on mobile. */}
            <div className="relative hidden min-h-[500px] bg-[#f4efe5] p-5 lg:block">
              <div className="grid h-full grid-cols-2 grid-rows-2 gap-4">
                <ObjectTile icon={Wrench} label="صيانة وإصلاح"/>
                <ObjectTile icon={Code2} label="تقنية وبرمجة"/>
                <ObjectTile icon={GraduationCap} label="تعليم وتدريب"/>
                <ObjectTile icon={PaintRoller} label="دهان وتشطيب"/>
              </div>
              <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.7rem] border-[5px] border-[#f4efe5] bg-[#0a9b92] text-2xl font-black text-white shadow-xl">
                جسر
              </div>
            </div>
          </div>
        </div>

        {/* Mobile icon strip instead of imagery */}
        <div className="mt-4 grid grid-cols-4 gap-2 lg:hidden">
          {[ [House,"بيت"], [Wrench,"صيانة"], [Code2,"تقنية"], [GraduationCap,"تعليم"] ].map(([Icon,label]) => {
            const I = Icon as typeof House;
            return <div key={String(label)} className="rounded-2xl border border-theme bg-surface p-3 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand"><I size={20}/></span>
              <p className="mt-2 text-[10px] font-bold">{String(label)}</p>
            </div>
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="شو محتاج؟" title="اختار المجال وخلي الباقي علينا" copy="من هون بتوصل للخدمة والناس اللي بتقدمها." href="/discover" action="شوفهم كلهم"/>
        <div className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4 xl:grid-cols-7">
          {categories.slice(0,7).map((category) => {
            const visual = categoryVisuals[category.slug as keyof typeof categoryVisuals] || {icon:LayoutGrid,tone:"bg-[#e6e4db] text-[#607064]"};
            const Icon = visual.icon;
            return (
              <Link key={category.id} href={`/discover?category=${category.id}`}
                className="group min-w-[145px] rounded-[1.5rem] border border-theme bg-surface p-4 transition duration-300 hover:-translate-y-1 hover:shadow-soft sm:min-w-0">
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${visual.tone}`}><Icon size={24}/></span>
                <h3 className="mt-5 line-clamp-2 text-sm font-black leading-5">{category.name_ar}</h3>
                <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-muted">{category.description_ar || "افتح وشوف شو موجود"}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {listings.length > 0 && (
        <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6 lg:mt-20">
          <SectionHeading eyebrow="شوف الشغل" title="خدمات جاهزة إلك" copy="شوف التفاصيل، قارن، واختار اللي بناسبك." href="/discover?scope=LISTINGS" action="كل الخدمات"/>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {listings.map((r)=><SearchResultCard key={r.result_id} result={r}/>)}
          </div>
        </section>
      )}

      {providers.length > 0 && (
        <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6 lg:mt-20">
          <SectionHeading eyebrow="مين بقدر يساعدك؟" title="ناس بتعرف شغلها" copy="افتح الملف، شوف شغله، وقرر براحتك." href="/discover?scope=PROVIDERS" action="شوف الكل"/>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {providers.map((r)=><SearchResultCard key={r.result_id} result={r}/>)}
          </div>
        </section>
      )}

      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6 lg:mt-20">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#087f79] to-[#05535a] text-white">
          <div className="grid items-center gap-6 p-7 sm:p-10 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[11px] font-bold text-[#bcece6]">عندك شغلة بتتقنها؟</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-.05em]">ورّينا شغلك.</h2>
              <p className="mt-3 max-w-xl text-xs leading-6 text-white/75">
                اعمل ملفك، نزّل خدماتك، وخلي اللي محتاج شغلك يوصلك.
              </p>
            </div>
            <Link href="/provider/apply" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-[#087f79] transition hover:-translate-y-0.5 active:scale-[.98]">
              يلا نبدأ <ArrowLeft size={16}/>
            </Link>
          </div>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6 lg:mt-20">
          <SectionHeading eyebrow="شغلهم بحكي عنهم" title="شوف شو عم ينعمل" copy="آخر شغل نازل من مجتمع جسر." href="/discover?scope=POSTS" action="شوف الكل"/>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {posts.map((r)=><SearchResultCard key={r.result_id} result={r}/>)}
          </div>
        </section>
      )}

      {listings.length === 0 && serviceTypes.length > 0 && (
        <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6 lg:mt-20">
          <SectionHeading eyebrow="مش عارف من وين تبدأ؟" title="هاي ممكن تفيدك" copy="اختار وحدة وشوف التفاصيل." href="/discover" action="كل الخدمات"/>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {serviceTypes.map((s)=>(
              <Link key={s.id} href={`/service-types/${s.id}`} className="rounded-2xl border border-theme bg-surface p-4 transition hover:-translate-y-1 hover:shadow-soft">
                <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--primary)/.1)] text-brand"><Package size={18}/></span>
                <h3 className="line-clamp-2 text-sm font-black leading-6">{s.title}</h3>
                <p className="mt-1 line-clamp-1 text-[10px] text-muted">{s.category_name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
