export default function OrderSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="h-5 w-32 bg-muted rounded mb-2"></div>
          <div className="h-4 w-40 bg-muted/70 rounded"></div>
        </div>
        <div className="h-5 w-20 bg-muted rounded"></div>
      </div>
      <div className="h-4 w-36 bg-muted/70 rounded mb-3"></div>
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 bg-muted rounded-full"></div>
        <div className="h-5 w-16 bg-muted/70 rounded-full"></div>
      </div>
    </div>
  );
}