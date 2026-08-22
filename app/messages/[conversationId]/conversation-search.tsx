"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import {
  searchConversationMessagesAction,
  type ConversationSearchResult,
} from "@/lib/actions/messaging";

function formatDate(value: string) {
  return new Date(value).toLocaleString("ar-JO", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConversationSearch({
  conversationId,
}: {
  conversationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<ConversationSearchResult[]>([]);
  const [pending, startTransition] = useTransition();

  const runSearch = () =>
    startTransition(async () => {
      setError("");

      const result = await searchConversationMessagesAction({
        conversationId,
        query,
      });

      if (!result.success) {
        setError(result.error || "ما قدرنا نبحث بالمحادثة.");
        setResults([]);
        return;
      }

      setResults(result.results);
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-brand active:scale-95"
        aria-label="بحث في المحادثة"
        title="بحث في المحادثة"
      >
        <Search size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[110] bg-black/35 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="بحث في المحادثة"
        >
          <div className="mx-auto flex h-full max-w-2xl flex-col bg-surface sm:h-[min(720px,90dvh)] sm:overflow-hidden sm:rounded-[1.5rem] sm:border sm:border-theme sm:shadow-xl">
            <header className="flex items-center gap-2 border-b border-theme px-3 py-3 sm:px-4">
              <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-muted px-3">
                <Search size={17} className="text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (query.trim().length >= 2) runSearch();
                    }
                  }}
                  placeholder="اكتب كلمة من المحادثة"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>

              <button
                type="button"
                disabled={pending || query.trim().length < 2}
                onClick={runSearch}
                className="brand-button !min-h-11 !rounded-xl !px-4 text-xs"
              >
                {pending ? <LoaderCircle size={16} className="animate-spin" /> : "بحث"}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
              {error && (
                <p className="mb-3 border-s-2 border-[rgb(var(--danger))] px-3 py-2 text-xs text-[rgb(var(--danger))]">
                  {error}
                </p>
              )}

              {!pending && query.trim().length >= 2 && results.length === 0 && !error && (
                <div className="py-16 text-center">
                  <p className="text-sm font-bold">ما لقينا نتيجة</p>
                  <p className="mt-1 text-xs text-muted">جرّب كلمة ثانية من نفس المحادثة.</p>
                </div>
              )}

              {query.trim().length < 2 && results.length === 0 && !error && (
                <div className="py-16 text-center text-xs text-muted">
                  اكتب كلمتين أو أكثر وندورلك عليها هون.
                </div>
              )}

              <div className="divide-y divide-[rgb(var(--border))]">
                {results.map((result) => (
                  <div key={result.id} className="py-4 first:pt-1">
                    <p className="whitespace-pre-wrap break-words text-xs leading-6 sm:text-sm">
                      {result.body}
                    </p>
                    <time className="mt-1.5 block text-[10px] text-muted">
                      {formatDate(result.created_at)}
                    </time>
                  </div>
                ))}
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
