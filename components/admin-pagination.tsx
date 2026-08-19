import Link from "next/link";

export function AdminPagination({ path, page, hasMore }: { path: string; page: number; hasMore: boolean }) {
  if (page === 1 && !hasMore) return null;
  return (
    <nav aria-label="التنقل بين صفحات النتائج" className="flex items-center justify-center gap-3 pt-2">
      {page > 1 ? (
        <Link href={`${path}?page=${page - 1}`} className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">السابق</Link>
      ) : <span className="rounded-lg border px-4 py-2 text-sm text-slate-400" aria-disabled="true">السابق</span>}
      <span className="text-sm text-slate-600" aria-current="page">صفحة {page}</span>
      {hasMore ? (
        <Link href={`${path}?page=${page + 1}`} className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">التالي</Link>
      ) : <span className="rounded-lg border px-4 py-2 text-sm text-slate-400" aria-disabled="true">التالي</span>}
    </nav>
  );
}

