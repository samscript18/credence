import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function PredictionCardSkeleton() {
  return <Card className="p-6" aria-label="Loading prediction"><div className="flex gap-3"><Skeleton className="size-10 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-24" /><Skeleton className="mt-2 h-3 w-36" /></div></div><Skeleton className="mt-8 h-4 w-3/4" /><Skeleton className="mt-5 h-28 w-full rounded-xl" /><div className="mt-5 flex justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-20" /></div><Skeleton className="mt-5 h-11 w-full rounded-xl" /></Card>;
}
