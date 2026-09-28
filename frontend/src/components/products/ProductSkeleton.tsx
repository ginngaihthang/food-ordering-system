
import { Skeleton } from '../ui/skeleton';

export function ProductSkeleton() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        <Skeleton className="h-10 w-full max-w-sm" />

        <div className="rounded-md border">
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-9 rounded-full" />
                <Skeleton className="h-8 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  
}