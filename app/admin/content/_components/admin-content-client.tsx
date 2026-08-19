"use client";

import { useRouter } from "next/navigation";
import { moderateProviderContentAction, updateAdminContentReportAction } from "@/lib/actions/marketplace-admin";

interface ContentRow { id: string; provider_id: string; content: string; post_type: string; status: string; moderation_notes: string | null; created_at: string; service_listings?: { id: string; title: string; slug: string } | null; }
interface ReportRow { id: string; target_type: string; target_id: string; reason: string; details: string | null; status: string; created_at: string; }

export default function AdminContentClient({ posts, reports = [], reportsOnly = false }: { posts: ContentRow[]; reports?: ReportRow[]; reportsOnly?: boolean }) {
  const router = useRouter();
  const moderate = async (post: ContentRow, decision: "APPROVE" | "REJECT" | "DEACTIVATE") => {
    const notes = decision === "APPROVE" ? "" : window.prompt("سبب القرار:", post.moderation_notes || "") ?? "";
    if (decision !== "APPROVE" && !notes.trim()) return;
    const result = await moderateProviderContentAction(post.id, decision, notes);
    if (!result.success) window.alert(result.error || "تعذر تنفيذ القرار"); else router.refresh();
  };
  const updateReport = async (id: string, status: "REVIEWING" | "RESOLVED" | "DISMISSED") => {
    const result = await updateAdminContentReportAction(id, status);
    if (!result.success) window.alert(result.error || "تعذر تحديث البلاغ"); else router.refresh();
  };

  if (reportsOnly) return <section aria-labelledby="reports-heading"><div className="mb-3 flex items-center justify-between"><h2 id="reports-heading" className="text-lg font-black">بلاغات مفتوحة</h2><span className="status-pill bg-[rgb(var(--primary-soft))] text-brand">{reports.length}</span></div>{reports.length ? <div className="grid gap-3 md:grid-cols-2">{reports.map((report) => <article key={report.id} className="surface-card p-4"><div className="flex justify-between gap-2"><strong className="text-sm">{report.reason}</strong><span className="status-pill bg-surface-muted">{report.target_type}</span></div><p className="mt-2 text-[11px] leading-6 text-muted">مرجع: {report.target_id.slice(0, 8)}… · لا يُعرض محتوى المحادثة هنا حفاظاً على الخصوصية.</p>{report.details && <p className="mt-2 text-xs">{report.details}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => updateReport(report.id, "REVIEWING")} className="secondary-button !min-h-8 !px-3 !py-1 text-xs">قيد المراجعة</button><button type="button" onClick={() => updateReport(report.id, "RESOLVED")} className="brand-button !min-h-8 !px-3 !py-1 text-xs">تمت المعالجة</button><button type="button" onClick={() => updateReport(report.id, "DISMISSED")} className="secondary-button !min-h-8 !px-3 !py-1 text-xs">استبعاد</button></div></article>)}</div> : <div className="surface-card p-6 text-center text-xs text-muted">لا توجد بلاغات محتوى مفتوحة.</div>}</section>;

  return posts.length ? <div className="grid gap-4 xl:grid-cols-2">{posts.map((post) => <article key={post.id} className="surface-card p-5"><div className="flex items-center justify-between"><span className="status-pill bg-surface-muted">{post.status}</span><span className="text-[10px] text-muted">{post.post_type}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{post.content}</p>{post.service_listings?.title && <p className="mt-2 text-xs font-bold text-brand">مرتبط بـ {post.service_listings.title}</p>}{post.moderation_notes && <p className="mt-3 rounded-xl bg-surface-muted p-3 text-xs">{post.moderation_notes}</p>}<div className="mt-4 flex gap-2 border-t border-theme pt-4">{post.status !== "PUBLISHED" && <button type="button" onClick={() => moderate(post, "APPROVE")} className="brand-button !min-h-9 !px-3 !py-1">اعتماد</button>}<button type="button" onClick={() => moderate(post, "REJECT")} className="secondary-button !min-h-9 !px-3 text-[rgb(var(--danger))]">رفض</button>{post.status === "PUBLISHED" && <button type="button" onClick={() => moderate(post, "DEACTIVATE")} className="secondary-button !min-h-9 !px-3">إيقاف</button>}</div></article>)}</div> : <div className="surface-card p-10 text-center text-sm text-muted">لا يوجد محتوى ضمن هذا المرشح.</div>;
}
