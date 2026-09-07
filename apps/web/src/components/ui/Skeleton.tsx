import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) { return <span className={cn("shimmer inline-block rounded-lg", className)} aria-hidden="true" />; }