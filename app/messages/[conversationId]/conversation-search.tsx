"use client";

import { useState, useTransition } from "react";
import {
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
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
  const [results, setResults] = useState<
    ConversationSearchResult[]
  >([]);
  const [pending, startTransition] = useTransition();

  const runSearch = () =>
    startTransition(async () => {
      setError("");

      const result =
        await searchConversationMessagesAction({
          conversationId,
          query,
        });

      if (!result.success) {
        setError(result.error || "ما قدرنا نبحث.");
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
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-theme bg-surface text-muted transition hover:text-brand active:scale-95"
        aria-label="بحث في المحادثة"
        title="بحث في المحادثة"
      >
        <Search size={17} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[110] bg-black/45 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="بحث في المحادثة"
        >
          <div className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-surface shadow-2xl">
            <header className="flex items-center gap-2 border-b border-theme p-3 sm:p-4">
              <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-surface-muted px-3">
                <Search size={17} className="text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (query.trim().length >= 2) {
                        runSearch();
                      }
                    }
                  }}
                  placeholder="دور على كلمة بالمحادثة…"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>

              <button
                type="button"
                disabled={
                  pending || query.trim().length < 2
                }
                onClick={runSearch}
                className="brand-button !min-h-11 !rounded-xl !px-4 text-xs"
              >
                {pending ? (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  "دور"
                )}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted text-muted"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {error && (
                <p className="mb-3 rounded-xl bg-[rgb(var(--danger)/.08)] p-3 text-xs font-bold text-[rgb(var(--danger))]">
                  {error}
                </p>
              )}

              {!pending &&
                query.trim().length >= 2 &&
                results.length === 0 &&
                !error && (
                  <div className="py-16 text-center">
                    <Search
                      size={30}
                      className="mx-auto text-muted"
                    />
                    <p className="mt-3 text-sm font-black">
                      ما لقيناها
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      جرّب كلمة ثانية.
                    </p>
                  </div>
                )}

              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-2xl border border-theme bg-surface p-3"
                  >
                    <p className="whitespace-pre-wrap break-words text-xs leading-6 sm:text-sm">
                      {result.body}
                    </p>
                    <time className="mt-2 block text-[10px] text-muted">
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
