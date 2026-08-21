export function CardSkeleton() {
  return (
    <div className="surface-card overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-surface-muted" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-1/3 rounded-full bg-surface-muted" />
        <div className="h-4 w-4/5 rounded-full bg-surface-muted" />
        <div className="h-3 w-full rounded-full bg-surface-muted" />
        <div className="pt-4 border-t border-theme flex justify-between">
          <div className="h-3 w-1/4 rounded-full bg-surface-muted" />
          <div className="h-7 w-7 rounded-xl bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}