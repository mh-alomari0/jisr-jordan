export default function Loading() {
  return (
    <main
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="جارٍ تحميل الصفحة"
    >
      <div className="skeleton h-44 rounded-[2rem] sm:h-56" />

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.7rem] border border-theme bg-surface p-5"
          >
            <div className="skeleton h-10 w-10 rounded-2xl" />
            <div className="skeleton mt-5 h-5 w-20" />
            <div className="skeleton mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="mt-7 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.7rem] border border-theme bg-surface p-5"
          >
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton mt-3 h-3 w-full" />
            <div className="skeleton mt-2 h-3 w-4/5" />
          </div>
        ))}
      </div>
    </main>
  );
}
