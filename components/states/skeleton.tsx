import { cn } from "@/lib/utils";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse-soft rounded-md bg-surface-muted", className)} style={style} />;
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-28" />
      <Skeleton className="mt-3 h-3 w-16" />
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 w-full" style={{ height }} />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
